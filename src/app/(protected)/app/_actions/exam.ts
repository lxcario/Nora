"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { callLLM, hasLLMProvider, stripCodeFences } from "@/lib/llm";
import { parsePdf } from "./rag/parser";
import { chunkText } from "./rag/chunker";
import { rewardAction } from "./gamification";

// ─── Types ──────────────────────────────────────────────────────────────────

export type QuestionType = "mcq" | "short_answer" | "explain";

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  /** MCQ only */
  options?: string[];
  /** MCQ only — 0-indexed correct option */
  correctIndex?: number;
  /** Short answer / explain — model answer for grading */
  modelAnswer?: string;
  /** Short answer — key terms that must appear for full credit */
  rubricTerms?: string[];
  /** Difficulty tier */
  difficulty: "easy" | "medium" | "hard";
  /** Section heading from source (for gap analysis grouping) */
  sourceSection?: string;
}

export interface ExamConfig {
  mode: "quick" | "full";
  /** PDF file (FormData) — if uploading fresh */
  paperIds?: string[];
  /** Pasted notes text */
  notes?: string;
  /** Timer enabled? */
  timerEnabled?: boolean;
}

export interface ExamAnswer {
  questionId: string;
  answer: string; // MCQ: "0"|"1"|"2"|"3", short/explain: free text
  confidence?: number; // 1-5 JOL
}

export interface GradedQuestion {
  questionId: string;
  type: QuestionType;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  score: number; // 0, 0.5, or 1
  feedback: string;
  sourceSection?: string;
}

export interface ExamResults {
  examId: string;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
  gradedQuestions: GradedQuestion[];
  sectionScores: Record<string, { correct: number; total: number }>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const QUICK_QUESTION_COUNT = 10;
const FULL_QUESTION_COUNT = 20;
const QUICK_TIME_LIMIT = 10 * 60; // 10 minutes
const FULL_TIME_LIMIT = 30 * 60; // 30 minutes

/** Max source text sent to LLM (chars). Prevents token overflow. */
const MAX_SOURCE_CHARS = 12000;

// ─── generateExam ───────────────────────────────────────────────────────────

/**
 * Generate a practice exam from uploaded PDF content and/or pasted notes.
 *
 * Pipeline:
 * 1. Gather source material (from existing paper_chunks OR parse fresh PDF OR use pasted notes)
 * 2. Truncate to MAX_SOURCE_CHARS
 * 3. Call LLM to generate questions
 * 4. Validate and store in practice_exams
 * 5. Return exam ID + questions (without answers for client display)
 */
export async function generateExam(
  formData: FormData
): Promise<{ data?: { examId: string; questions: ExamQuestion[]; timeLimit: number }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Rate limit (AI-heavy)
  const rateCheck = checkRateLimit(user.id, "exam_generate", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) {
    return { error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)} seconds.` };
  }

  if (!hasLLMProvider()) {
    return { error: "No AI provider configured." };
  }

  // ─── Parse form data ────────────────────────────────────────────────────
  const mode = (formData.get("mode") as string) ?? "quick";
  const notes = (formData.get("notes") as string) ?? "";
  const paperIdsRaw = (formData.get("paperIds") as string) ?? "";
  const timerEnabled = formData.get("timerEnabled") !== "false";
  const file = formData.get("file") as File | null;

  const questionCount = mode === "full" ? FULL_QUESTION_COUNT : QUICK_QUESTION_COUNT;
  const timeLimit = timerEnabled ? (mode === "full" ? FULL_TIME_LIMIT : QUICK_TIME_LIMIT) : 0;

  // ─── Gather source material ─────────────────────────────────────────────
  let sourceText = "";
  const paperIds: string[] = [];

  // 1. From uploaded PDF file (parse inline — don't persist to papers table)
  if (file && file.size > 0) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const header = buffer.slice(0, 4).toString("ascii");
      if (!header.startsWith("%PDF")) {
        return { error: "File does not appear to be a valid PDF." };
      }
      const parseResult = await parsePdf(buffer);
      const chunks = chunkText(parseResult.sections);
      sourceText += chunks.map((c) => `[${c.sectionHeading || "Content"}]\n${c.content}`).join("\n\n");
    } catch (err) {
      return { error: `Failed to parse PDF: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  }

  // 2. From existing paper IDs (already ingested via Research Desk)
  if (paperIdsRaw) {
    const ids = paperIdsRaw.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      const { data: chunks } = await supabase
        .from("paper_chunks")
        .select("content, section_heading")
        .in("paper_id", ids)
        .eq("user_id", user.id)
        .order("chunk_index", { ascending: true })
        .limit(60);

      if (chunks && chunks.length > 0) {
        paperIds.push(...ids);
        sourceText += "\n\n" + chunks.map((c) => `[${c.section_heading || "Content"}]\n${c.content}`).join("\n\n");
      }
    }
  }

  // 3. From pasted notes
  if (notes.trim().length > 0) {
    sourceText += "\n\n[Student Notes]\n" + notes.trim();
  }

  // Validate we have some content
  sourceText = sourceText.trim();
  if (sourceText.length < 100) {
    return { error: "Not enough source material. Please upload a PDF or paste at least 100 characters of notes." };
  }

  // Truncate to prevent token overflow
  if (sourceText.length > MAX_SOURCE_CHARS) {
    sourceText = sourceText.slice(0, MAX_SOURCE_CHARS);
  }

  // ─── Generate questions via LLM ────────────────────────────────────────
  const questions = await generateQuestionsFromContent(sourceText, questionCount);
  if (!questions || questions.length === 0) {
    return { error: "Failed to generate exam questions. Please try again." };
  }

  // ─── Store exam in database ─────────────────────────────────────────────
  const { data: exam, error: insertError } = await supabase
    .from("practice_exams")
    .insert({
      user_id: user.id,
      mode,
      title: file?.name?.replace(/\.pdf$/i, "") || "Practice Exam",
      source_paper_ids: paperIds.length > 0 ? paperIds : null,
      source_notes: notes.trim() || null,
      questions_json: questions,
      time_limit_seconds: timeLimit || null,
      question_count: questions.length,
    })
    .select("id")
    .single();

  if (insertError || !exam) {
    return { error: insertError?.message ?? "Failed to save exam." };
  }

  // Return questions WITHOUT answers (client shouldn't see correct answers)
  const clientQuestions: ExamQuestion[] = questions.map((q) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
    sourceSection: q.sourceSection,
    // Omit: correctIndex, modelAnswer, rubricTerms
  }));

  return { data: { examId: exam.id, questions: clientQuestions, timeLimit } };
}

// ─── submitExam ─────────────────────────────────────────────────────────────

/**
 * Grade a submitted exam. MCQs are graded deterministically.
 * Short answer and explain questions are graded by LLM.
 */
export async function submitExam(
  examId: string,
  answers: ExamAnswer[]
): Promise<{ data?: ExamResults; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the exam
  const { data: exam, error: fetchError } = await supabase
    .from("practice_exams")
    .select("id, questions_json, submitted_at")
    .eq("id", examId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !exam) return { error: "Exam not found." };
  if (exam.submitted_at) return { error: "This exam has already been submitted." };

  const questions = exam.questions_json as ExamQuestion[];
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  // ─── Grade each question ───────────────────────────────────────────────
  const gradedQuestions: GradedQuestion[] = [];
  let totalScore = 0;

  for (const q of questions) {
    const studentAnswer = answerMap.get(q.id)?.answer ?? "";
    let score = 0;
    let feedback = "";
    let correctAnswer = "";

    if (q.type === "mcq") {
      correctAnswer = q.options?.[q.correctIndex ?? 0] ?? "";
      const chosen = parseInt(studentAnswer, 10);
      if (chosen === q.correctIndex) {
        score = 1;
        feedback = "Correct!";
      } else {
        score = 0;
        feedback = `Incorrect. The correct answer is: ${correctAnswer}`;
      }
    } else {
      // Short answer / explain — LLM grading
      correctAnswer = q.modelAnswer ?? "";
      const gradeResult = await gradeOpenEndedQuestion(q, studentAnswer);
      score = gradeResult.score;
      feedback = gradeResult.feedback;
    }

    totalScore += score;
    gradedQuestions.push({
      questionId: q.id,
      type: q.type,
      question: q.question,
      studentAnswer,
      correctAnswer,
      score,
      feedback,
      sourceSection: q.sourceSection,
    });
  }

  // ─── Compute scores ────────────────────────────────────────────────────
  const scorePercent = questions.length > 0 ? Math.round((totalScore / questions.length) * 100) : 0;
  const correctCount = gradedQuestions.filter((g) => g.score === 1).length;

  // Section-level breakdown
  const sectionScores: Record<string, { correct: number; total: number }> = {};
  for (const g of gradedQuestions) {
    const section = g.sourceSection || "General";
    if (!sectionScores[section]) sectionScores[section] = { correct: 0, total: 0 };
    sectionScores[section].total += 1;
    sectionScores[section].correct += g.score;
  }

  // ─── Persist results ───────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("practice_exams")
    .update({
      answers_json: answers,
      score_percent: scorePercent,
      topic_scores: sectionScores,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", examId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: "Failed to save results." };
  }

  // Award XP
  await rewardAction("session_complete");

  revalidatePath("/app/exam");
  return {
    data: {
      examId,
      scorePercent,
      totalQuestions: questions.length,
      correctCount,
      gradedQuestions,
      sectionScores,
    },
  };
}

// ─── createCardsFromMissed ──────────────────────────────────────────────────

/**
 * Auto-generate flashcards from questions the student got wrong.
 */
export async function createCardsFromMissed(
  examId: string,
  questionIds: string[],
  topicId?: string
): Promise<{ count?: number; error?: string }> {
  if (!questionIds.length) return { count: 0 };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the exam to get questions
  const { data: exam } = await supabase
    .from("practice_exams")
    .select("questions_json")
    .eq("id", examId)
    .eq("user_id", user.id)
    .single();

  if (!exam) return { error: "Exam not found." };

  const questions = exam.questions_json as ExamQuestion[];
  const missed = questions.filter((q) => questionIds.includes(q.id));

  if (missed.length === 0) return { count: 0 };

  // Build flashcards from missed questions
  const cards = missed.map((q) => ({
    user_id: user.id,
    topic_id: topicId || null,
    front: q.question,
    back: q.type === "mcq"
      ? q.options?.[q.correctIndex ?? 0] ?? q.modelAnswer ?? ""
      : q.modelAnswer ?? "",
    source_type: "exam" as const,
  }));

  const { error: insertError } = await supabase.from("cards").insert(cards);
  if (insertError) return { error: insertError.message };

  // Award XP for cards created
  const { rewardBatch } = await import("./gamification");
  await rewardBatch("card_created", cards.length);

  revalidatePath("/app/review");
  return { count: cards.length };
}

// ─── getExamHistory ─────────────────────────────────────────────────────────

export interface ExamHistoryItem {
  id: string;
  title: string;
  mode: string;
  scorePercent: number | null;
  questionCount: number;
  createdAt: string;
  submittedAt: string | null;
}

export async function getExamHistory(): Promise<{ exams: ExamHistoryItem[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { exams: [] };

  const { data } = await supabase
    .from("practice_exams")
    .select("id, title, mode, score_percent, question_count, created_at, submitted_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    exams: (data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      mode: e.mode,
      scorePercent: e.score_percent,
      questionCount: e.question_count,
      createdAt: e.created_at,
      submittedAt: e.submitted_at,
    })),
  };
}

// ─── getExamById ────────────────────────────────────────────────────────────

export async function getExamById(examId: string): Promise<{
  data?: {
    id: string;
    mode: string;
    title: string;
    questions: ExamQuestion[];
    timeLimit: number;
    submittedAt: string | null;
    scorePercent: number | null;
    answersJson: ExamAnswer[] | null;
    topicScores: Record<string, { correct: number; total: number }> | null;
  };
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: exam, error } = await supabase
    .from("practice_exams")
    .select("*")
    .eq("id", examId)
    .eq("user_id", user.id)
    .single();

  if (error || !exam) return { error: "Exam not found." };

  const questions = exam.questions_json as ExamQuestion[];

  // If not submitted yet, strip answers from questions
  const clientQuestions: ExamQuestion[] = exam.submitted_at
    ? questions
    : questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
        sourceSection: q.sourceSection,
      }));

  return {
    data: {
      id: exam.id,
      mode: exam.mode,
      title: exam.title,
      questions: clientQuestions,
      timeLimit: exam.time_limit_seconds ?? 0,
      submittedAt: exam.submitted_at,
      scorePercent: exam.score_percent,
      answersJson: exam.answers_json as ExamAnswer[] | null,
      topicScores: exam.topic_scores as Record<string, { correct: number; total: number }> | null,
    },
  };
}

// ─── Internal: Question Generation ──────────────────────────────────────────

async function generateQuestionsFromContent(
  sourceText: string,
  questionCount: number
): Promise<ExamQuestion[] | null> {
  const mcqCount = Math.ceil(questionCount * 0.5);
  const shortCount = Math.ceil(questionCount * 0.3);
  const explainCount = questionCount - mcqCount - shortCount;

  const systemPrompt = `You are an exam question generator for university students. Given source material, generate a practice exam.

RULES:
- Generate EXACTLY ${questionCount} questions total:
  • ${mcqCount} multiple choice (4 options each, ONE correct)
  • ${shortCount} short answer (1-2 sentence answers expected)
  • ${explainCount} explain/essay (3-5 sentence answers expected)
- Questions MUST test content that is ACTUALLY in the source material. Never invent facts.
- Distribute difficulty: ~30% easy (recall), ~50% medium (application), ~20% hard (analysis/synthesis)
- MCQ distractors must be plausible (not obviously wrong)
- Each question should reference a different concept from the source (avoid clustering on one topic)
- Include the section heading from the source where possible in sourceSection field

Respond with ONLY valid JSON (no markdown fences):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 2,
      "difficulty": "easy",
      "sourceSection": "Section Name"
    },
    {
      "id": "q2",
      "type": "short_answer",
      "question": "Explain briefly...",
      "modelAnswer": "The answer is...",
      "rubricTerms": ["key term 1", "key term 2"],
      "difficulty": "medium",
      "sourceSection": "Section Name"
    },
    {
      "id": "q3",
      "type": "explain",
      "question": "Describe in detail...",
      "modelAnswer": "A complete answer would cover...",
      "difficulty": "hard",
      "sourceSection": "Section Name"
    }
  ]
}`;

  const userMessage = `SOURCE MATERIAL:\n\n${sourceText}\n\nGenerate ${questionCount} exam questions from this material.`;

  try {
    const response = await callLLM({
      system: systemPrompt,
      user: userMessage,
      temperature: 0.4,
      maxTokens: 4000,
      groqTimeoutMs: 45000,
      openRouterTimeoutMs: 60000,
    });

    if (!response?.trim()) return null;

    const jsonStr = stripCodeFences(response).trim();
    const parsed = safeParseQuestions(jsonStr);
    return parsed;
  } catch (err) {
    console.error("Exam question generation failed:", err);
    return null;
  }
}

function safeParseQuestions(jsonStr: string): ExamQuestion[] | null {
  try {
    const parsed = JSON.parse(jsonStr);
    const questions = parsed.questions ?? parsed;
    if (!Array.isArray(questions)) return null;

    return questions
      .filter((q: Record<string, unknown>) =>
        q && typeof q.question === "string" && typeof q.type === "string"
      )
      .map((q: Record<string, unknown>, i: number) => ({
        id: (q.id as string) || `q${i + 1}`,
        type: (["mcq", "short_answer", "explain"].includes(q.type as string) ? q.type : "short_answer") as QuestionType,
        question: q.question as string,
        options: Array.isArray(q.options) ? (q.options as string[]).slice(0, 4) : undefined,
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        modelAnswer: typeof q.modelAnswer === "string" ? q.modelAnswer : undefined,
        rubricTerms: Array.isArray(q.rubricTerms) ? (q.rubricTerms as string[]) : undefined,
        difficulty: (["easy", "medium", "hard"].includes(q.difficulty as string) ? q.difficulty : "medium") as "easy" | "medium" | "hard",
        sourceSection: typeof q.sourceSection === "string" ? q.sourceSection : undefined,
      }));
  } catch {
    // Try to recover partial questions
    const matches = jsonStr.matchAll(/"question"\s*:\s*"([^"]+)"/g);
    const recovered: ExamQuestion[] = [];
    let i = 0;
    for (const m of matches) {
      recovered.push({
        id: `q${++i}`,
        type: "short_answer",
        question: m[1],
        difficulty: "medium",
      });
    }
    return recovered.length > 0 ? recovered : null;
  }
}

// ─── Internal: Open-ended grading ───────────────────────────────────────────

async function gradeOpenEndedQuestion(
  question: ExamQuestion,
  studentAnswer: string
): Promise<{ score: number; feedback: string }> {
  if (!studentAnswer.trim()) {
    return { score: 0, feedback: "No answer provided." };
  }

  if (!hasLLMProvider()) {
    // Fallback: keyword matching
    return gradeByKeywords(question, studentAnswer);
  }

  const systemPrompt = `You are grading a student's answer to an exam question.

QUESTION: ${question.question}
MODEL ANSWER: ${question.modelAnswer ?? "Not provided"}
${question.rubricTerms?.length ? `KEY TERMS EXPECTED: ${question.rubricTerms.join(", ")}` : ""}

GRADING RULES:
- Score 1.0 = correct and complete (covers key concepts, may use different words)
- Score 0.5 = partially correct (some key concepts present but incomplete/imprecise)
- Score 0.0 = incorrect or irrelevant
- Be lenient with wording — accept synonyms and paraphrasing
- Respond with ONLY valid JSON: {"score": 0|0.5|1, "feedback": "brief explanation"}`;

  try {
    const response = await callLLM({
      system: systemPrompt,
      user: `STUDENT'S ANSWER: ${studentAnswer}`,
      temperature: 0.1,
      maxTokens: 200,
      groqTimeoutMs: 10000,
      groqOnly: true,
    });

    if (!response?.trim()) return gradeByKeywords(question, studentAnswer);

    const cleaned = stripCodeFences(response).trim();
    const parsed = JSON.parse(cleaned);
    const score = typeof parsed.score === "number" ? Math.min(1, Math.max(0, parsed.score)) : 0;
    const feedback = typeof parsed.feedback === "string" ? parsed.feedback : "Graded by AI.";
    return { score, feedback };
  } catch {
    return gradeByKeywords(question, studentAnswer);
  }
}

function gradeByKeywords(question: ExamQuestion, studentAnswer: string): { score: number; feedback: string } {
  if (!question.rubricTerms?.length && !question.modelAnswer) {
    return { score: 0.5, feedback: "Could not auto-grade. Please review your answer against the model answer." };
  }

  const answerLower = studentAnswer.toLowerCase();

  if (question.rubricTerms?.length) {
    const matched = question.rubricTerms.filter((term) =>
      answerLower.includes(term.toLowerCase())
    );
    const ratio = matched.length / question.rubricTerms.length;
    if (ratio >= 0.7) return { score: 1, feedback: "Key terms present." };
    if (ratio >= 0.4) return { score: 0.5, feedback: `Partially correct. Missing: ${question.rubricTerms.filter((t) => !answerLower.includes(t.toLowerCase())).join(", ")}` };
    return { score: 0, feedback: `Key terms missing: ${question.rubricTerms.join(", ")}` };
  }

  // Fallback: check overlap with model answer
  const modelWords = new Set((question.modelAnswer ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const studentWords = new Set(answerLower.split(/\s+/).filter((w) => w.length > 3));
  let overlap = 0;
  for (const w of studentWords) {
    if (modelWords.has(w)) overlap++;
  }
  const overlapRatio = modelWords.size > 0 ? overlap / modelWords.size : 0;
  if (overlapRatio >= 0.5) return { score: 1, feedback: "Answer matches expected content." };
  if (overlapRatio >= 0.25) return { score: 0.5, feedback: "Partial match with expected content." };
  return { score: 0, feedback: "Answer does not match expected content." };
}
