"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import {
  computeComprehensionScore,
  normalizeSegmentStatus,
  type ComprehensionScore,
} from "@/lib/feynman-score";
import {
  buildGroundedPrompt,
  chunksToPassages,
  textToPassages,
  UNVERIFIED_LABEL,
  type SourcePassage,
} from "@/lib/feynman-grounding";
import { generateQueryEmbedding, hasEmbeddingSupport } from "./rag/embedder";
import { rewardAction, rewardBatch } from "./gamification";
import { incrementQuestProgress } from "./party-quests";
import { NORA_VOICE_EVALUATOR } from "@/lib/nora-voice";

// Feynman evaluation result types
export interface GapAnalysis {
  questions: string[];
  paraphrase: string;
  segments: {
    text: string;
    status: "green" | "amber" | "red";
    feedback: string;
  }[];
  suggestedCards: { front: string; back: string }[];
  /** Deterministic comprehension score derived from the segments. */
  score: ComprehensionScore;
  /**
   * True when the explanation was graded against attached source material
   * (Req 3.2). False = unverified (graded from model knowledge only, Req 3.4).
   */
  grounded: boolean;
  /** Provenance label, e.g. a paper title, or the "unverified" notice. */
  sourceLabel: string;
}

/** Optional context for an iterative refinement attempt. */
export interface RefineContext {
  /** 1-based attempt number for this topic in the current session. */
  attemptNumber: number;
  /** Score (0–100) from the previous attempt, for the prompt to build on. */
  previousScore: number;
  /** Feedback strings for the gaps (amber/red) the student was asked to close. */
  previousGaps: string[];
}

const FEYNMAN_PROMPT = `${NORA_VOICE_EVALUATOR}

---

You are the "Inquisitive Student" — a knowledgeable evaluator who deeply understands the topic the student is studying. You know the subject matter at an expert level, but your role is to TEST the student's understanding, not teach them.

THE STUDENT IS STUDYING: {{TOPIC_NAME}} (Subject: {{SUBJECT_NAME}})

Your job:
1. You ALREADY KNOW this topic thoroughly. Use your expertise to evaluate accuracy.
2. Read the student's explanation and assess whether they truly understand the concept.
3. Ask 2-3 probing questions that test DEEPER understanding — not basic "what is this?" questions. Ask about edge cases, implications, trade-offs, or real-world scenarios.
4. Paraphrase what the student explained in technical but clear terms.
5. Break their explanation into segments and classify each:
   - "green" = technically accurate, demonstrates real understanding
   - "amber" = partially correct but oversimplified, missing nuance, or vague
   - "red" = factually wrong, critical misconception, or missing essential information
6. For each segment, explain WHAT specifically is right/wrong/missing using your expert knowledge. Reference actual technical facts.
7. Suggest 3-5 high-quality flashcard Q/A pairs that cover the KEY concepts of this topic — include technical details, formulas, or specifications where relevant.

RULES:
- Do NOT ask "what topic is this?" — you already know it.
- Do NOT accept questions as explanations. If the student asks questions instead of explaining, mark everything RED and tell them to EXPLAIN the concept, not ask about it.
- Be technically precise. Reference real specifications, standards, or formulas when evaluating accuracy.
- Suggested cards should be study-worthy: specific facts, comparisons, definitions — not vague generalities.

Respond ONLY with valid JSON (no markdown, no code fences, no extra text):
{
  "questions": ["deep probing question 1", "edge case question 2", "implication question 3"],
  "paraphrase": "your technical restatement of what they explained",
  "segments": [
    {"text": "exact quote from their explanation", "status": "green|amber|red", "feedback": "technical evaluation with specific facts"}
  ],
  "suggestedCards": [
    {"front": "Specific technical question about this topic?", "back": "Precise answer with details/specs/formulas"}
  ]
}`;

/**
 * Builds an extra prompt section for iterative refinement attempts so the
 * evaluator knows this is a re-explanation and which gaps were flagged before.
 */
function buildRefineSection(refine: RefineContext): string {
  const gaps = refine.previousGaps
    .slice(0, 6)
    .map((g, i) => `${i + 1}. ${g}`)
    .join("\n");

  return `

THIS IS A RE-EXPLANATION (attempt #${refine.attemptNumber}). The student previously scored ${refine.previousScore}/100.
Previously flagged gaps the student was asked to address:
${gaps || "(none recorded)"}

When evaluating this attempt:
- Judge it on its own merits, but explicitly note in your feedback where a previously weak area is now improved or still missing.
- Reward genuine improvement; do not be lenient on remaining gaps.`;
}

/**
 * Safely parses and validates the AI response as a GapAnalysis.
 * Handles invalid JSON, missing fields, and malformed responses, then
 * normalizes the data (valid statuses, non-empty entries) and attaches a
 * deterministic comprehension score.
 */
function safeParseGapAnalysis(
  jsonStr: string,
  grounding: { grounded: boolean; sourceLabel: string }
): { analysis?: GapAnalysis; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { error: "AI returned invalid JSON. Please try again." };
  }

  const p = parsed as Record<string, unknown> | null;

  // Structural validation — ensure required arrays/fields exist
  if (
    !p ||
    !Array.isArray(p.questions) ||
    typeof p.paraphrase !== "string" ||
    !Array.isArray(p.segments) ||
    !Array.isArray(p.suggestedCards)
  ) {
    return { error: "AI returned invalid structure. Please try again." };
  }

  // Normalize questions: keep non-empty strings only.
  const questions = (p.questions as unknown[])
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .map((q) => q.trim());

  // Normalize segments: coerce status to the enum, drop empty text.
  const segments = (p.segments as unknown[])
    .map((s) => {
      const seg = (s ?? {}) as Record<string, unknown>;
      const text = typeof seg.text === "string" ? seg.text.trim() : "";
      const feedback = typeof seg.feedback === "string" ? seg.feedback.trim() : "";
      return {
        text,
        status: normalizeSegmentStatus(seg.status),
        feedback,
      };
    })
    .filter((s) => s.text.length > 0);

  // Normalize suggested cards: require both sides, cap lengths defensively.
  const suggestedCards = (p.suggestedCards as unknown[])
    .map((c) => {
      const card = (c ?? {}) as Record<string, unknown>;
      const front = typeof card.front === "string" ? card.front.trim() : "";
      const back = typeof card.back === "string" ? card.back.trim() : "";
      return { front: front.slice(0, 200), back: back.slice(0, 1000) };
    })
    .filter((c) => c.front.length > 0 && c.back.length > 0);

  const score = computeComprehensionScore(segments);

  return {
    analysis: {
      questions,
      paraphrase: (p.paraphrase as string).trim(),
      segments,
      suggestedCards,
      score,
      grounded: grounding.grounded,
      sourceLabel: grounding.sourceLabel,
    },
  };
}

// ---------------------------------------------------------------------------
// Source grounding (Req 3.2–3.4)
// ---------------------------------------------------------------------------

/** Narrow a raw JSONB `feynman_source_ref` to a typed FeynmanSourceRef. */
function parseSourceRef(raw: unknown): FeynmanSourceRef | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== "paper" && r.type !== "video" && r.type !== "notes") return null;
  return r as unknown as FeynmanSourceRef;
}

/**
 * Resolve the attached source into citeable passages + a provenance label.
 * Returns empty passages (unverified mode) when no usable source is attached.
 */
async function resolveSourcePassages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  ref: FeynmanSourceRef | null,
  explanationText: string
): Promise<{ passages: SourcePassage[]; sourceLabel: string }> {
  if (!ref) {
    return { passages: [], sourceLabel: UNVERIFIED_LABEL };
  }

  // --- Pasted notes: already the ground truth, no retrieval needed. ---
  if (ref.type === "notes") {
    const passages = textToPassages(ref.notes ?? "", "N", "Pasted notes");
    return passages.length > 0
      ? { passages, sourceLabel: "your pasted notes" }
      : { passages: [], sourceLabel: UNVERIFIED_LABEL };
  }

  // --- Indexed paper: retrieve the most relevant chunks for the explanation. ---
  if (ref.type === "paper" && ref.paperId) {
    const paperTitle = ref.paperTitle ?? "attached paper";
    const chunks = await retrievePaperChunks(
      supabase,
      userId,
      ref.paperId,
      explanationText
    );
    const passages = chunksToPassages(chunks, paperTitle);
    return passages.length > 0
      ? { passages, sourceLabel: `"${paperTitle}"` }
      : { passages: [], sourceLabel: UNVERIFIED_LABEL };
  }

  // --- Video transcript: concatenate transcript text into passages. ---
  if (ref.type === "video" && ref.videoId) {
    const { data: transcript } = await supabase
      .from("video_transcripts")
      .select("segments")
      .eq("video_id", ref.videoId)
      .maybeSingle();

    const segments = (transcript?.segments ?? []) as { text?: string }[];
    const transcriptText = Array.isArray(segments)
      ? segments.map((s) => s.text ?? "").join(" ")
      : "";
    const label = ref.videoTitle ?? "video transcript";
    const passages = textToPassages(transcriptText, "T", label);
    return passages.length > 0
      ? { passages, sourceLabel: label }
      : { passages: [], sourceLabel: UNVERIFIED_LABEL };
  }

  return { passages: [], sourceLabel: UNVERIFIED_LABEL };
}

/**
 * Retrieve the chunks of a paper most relevant to the explanation, using the
 * hybrid retrieval RPC (lexical + vector RRF). Falls back to the first chunks
 * by index if the RPC is unavailable.
 */
async function retrievePaperChunks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paperId: string,
  explanationText: string
): Promise<{ content: string; sectionHeading: string | null; chunkIndex: number }[]> {
  // Generate an embedding for the explanation when embeddings are configured.
  let embedding: number[] | null = null;
  if (hasEmbeddingSupport()) {
    embedding = await generateQueryEmbedding(explanationText);
  }

  const { data: rows, error } = await supabase.rpc("match_paper_chunks_hybrid", {
    query_text: explanationText,
    query_embedding: embedding ? JSON.stringify(embedding) : null,
    match_user_id: userId,
    match_paper_id: paperId,
    match_topic_id: null,
    match_count: 6,
    rrf_k: 60,
    candidate_pool: 50,
  });

  if (!error && rows && rows.length > 0) {
    return (rows as { content: string; section_heading: string | null; chunk_index: number }[]).map(
      (r) => ({
        content: r.content,
        sectionHeading: r.section_heading,
        chunkIndex: r.chunk_index,
      })
    );
  }

  // Fallback: first chunks by index (e.g. if the hybrid RPC isn't deployed).
  const { data: fallback } = await supabase
    .from("paper_chunks")
    .select("content, section_heading, chunk_index")
    .eq("user_id", userId)
    .eq("paper_id", paperId)
    .order("chunk_index", { ascending: true })
    .limit(6);

  return (fallback ?? []).map((r) => ({
    content: r.content,
    sectionHeading: r.section_heading,
    chunkIndex: r.chunk_index,
  }));
}

export async function evaluateExplanation(
  topicId: string,
  explanationText: string,
  refine?: RefineContext
): Promise<{ data?: GapAnalysis; error?: string }> {
  if (!explanationText?.trim()) {
    return { error: "Please write an explanation first." };
  }
  if (explanationText.trim().length < 50) {
    return { error: "Please write a more detailed explanation (at least 50 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Rate limit check
  const rateCheck = checkRateLimit(user.id, "feynman", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) {
    return { error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)} seconds.` };
  }

  // Fetch topic, subject names, and any attached source for grounding.
  const { data: topic } = await supabase
    .from("topics")
    .select("name, subjects(name), feynman_source_ref")
    .eq("id", topicId)
    .single();

  const topicName = topic?.name ?? "Unknown topic";
  const subjectData = topic?.subjects as unknown as { name: string } | null;
  const subjectName = subjectData?.name ?? "Unknown subject";

  // Resolve source passages for grounded evaluation (Req 3.2). When no source
  // is attached, passages is empty → unverified mode (Req 3.4).
  const sourceRef = parseSourceRef(topic?.feynman_source_ref);
  const { passages, sourceLabel } = await resolveSourcePassages(
    supabase,
    user.id,
    sourceRef,
    explanationText
  );
  const grounded = passages.length > 0;

  // Build the prompt: grounded when we have passages, otherwise the default
  // "expert evaluator" prompt with an explicit unverified instruction.
  const basePrompt = grounded
    ? buildGroundedPrompt(topicName, subjectName, passages)
    : FEYNMAN_PROMPT.replace("{{TOPIC_NAME}}", topicName).replace(
        "{{SUBJECT_NAME}}",
        subjectName
      );
  const contextualPrompt = basePrompt + (refine ? buildRefineSection(refine) : "");

  try {
    if (!hasLLMProvider()) {
      return { error: "No AI API key configured" };
    }
    const responseText = await callLLM({
      system: contextualPrompt,
      user: explanationText,
      temperature: 0.7,
      groqTimeoutMs: 15000,
      openRouterTimeoutMs: 45000,
    });

    // Guard against empty response
    if (!responseText?.trim()) {
      return { error: "AI returned an empty response. Please try again." };
    }

    // Strip possible markdown fences
    const jsonStr = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Safe parse with structural validation
    const { analysis, error: parseError } = safeParseGapAnalysis(jsonStr, {
      grounded,
      sourceLabel,
    });
    if (parseError || !analysis) {
      console.error("Feynman JSON parse error:", parseError, responseText.slice(0, 500));
      return { error: parseError ?? "AI returned invalid JSON. Please try again." };
    }

    // Store in database. The `score` column was added in migration 006; if it
    // hasn't been applied yet, fall back to inserting without it so evaluation
    // keeps working (the score is also embedded in gaps_json regardless).
    const baseRow = {
      user_id: user.id,
      topic_id: topicId,
      raw_text: explanationText,
      ai_summary: analysis.paraphrase,
      gaps_json: analysis,
    };

    let { error: insertError } = await supabase
      .from("feynman_explanations")
      .insert({ ...baseRow, score: analysis.score.score });

    if (insertError && /score/i.test(insertError.message ?? "")) {
      ({ error: insertError } = await supabase
        .from("feynman_explanations")
        .insert(baseRow));
    }
    if (insertError) {
      console.warn("Failed to store Feynman explanation:", insertError.message);
    }

    // Award XP for completing a Feynman explanation
    await rewardAction("feynman");

    // Track quest progress for party quests (non-blocking)
    try {
      await incrementQuestProgress(user.id, "feynman_sessions", 1);
    } catch (e) {
      console.warn("Party quest progress update failed (feynman):", e);
    }

    revalidatePath("/app/feynman");
    return { data: analysis };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Feynman evaluation error:", errorMessage);
    if (errorMessage.includes("aborted") || errorMessage.includes("abort")) {
      return { error: "Request timed out. AI models may be busy — try again." };
    }
    return { error: `AI evaluation failed: ${errorMessage}` };
  }
}

export async function createCardsFromFeynman(
  topicId: string,
  cards: { front: string; back: string }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cardsToInsert = cards.map((card) => ({
    user_id: user.id,
    topic_id: topicId,
    front: card.front,
    back: card.back,
    source_type: "feynman" as const,
  }));

  const { error } = await supabase.from("cards").insert(cardsToInsert);
  if (error) return { error: error.message };

  // Award XP for all cards created in a single DB round-trip
  await rewardBatch("card_created", cards.length);

  revalidatePath("/app/review");
  return { success: true, count: cards.length };
}

export interface TopicScorePoint {
  score: number;
  createdAt: string;
}

/**
 * Returns the comprehension scores of recent Feynman attempts for a topic,
 * oldest → newest, for the per-topic progress sparkline.
 *
 * Reads the score from `gaps_json` (always present) so it works whether or not
 * migration 006 (the dedicated `score` column) has been applied.
 */
export async function getTopicScoreHistory(
  topicId: string,
  limit = 10
): Promise<{ points: TopicScorePoint[] }> {
  if (!topicId) return { points: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { points: [] };

  // Fetch the most recent N, then reverse to chronological order.
  const { data, error } = await supabase
    .from("feynman_explanations")
    .select("gaps_json, created_at")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return { points: [] };

  const points: TopicScorePoint[] = [];
  for (const row of data) {
    const gaps = row.gaps_json as unknown as { score?: { score?: number } } | null;
    const score = gaps?.score?.score;
    if (typeof score === "number" && score >= 0 && score <= 100) {
      points.push({ score, createdAt: row.created_at });
    }
  }

  // Reverse to oldest → newest for left-to-right charting.
  points.reverse();
  return { points };
}

// ===========================================================================
// Feynman source attachment (spec Req 3.1)
// ===========================================================================

/** The kind of source attached to a topic for grounded Feynman evaluation. */
export type FeynmanSourceType = "paper" | "video" | "notes";

/**
 * A source reference stored on a topic (`topics.feynman_source_ref`).
 * When present, Task 12's `evaluateExplanation` will use it to grade the
 * student's explanation against real source material instead of model memory.
 */
export interface FeynmanSourceRef {
  type: FeynmanSourceType;
  // paper
  paperId?: string;
  paperTitle?: string;
  // video
  videoId?: string;
  videoTitle?: string;
  // notes (pasted inline text)
  notes?: string;
}

/** A concise paper summary for the source-picker dropdown. */
export interface IndexedPaperSummary {
  id: string;
  title: string;
  chunkCount: number;
}

/**
 * Returns the Feynman source reference stored on a topic.
 * Returns `null` when no source is attached (unverified mode).
 */
export async function getFeynmanSource(
  topicId: string
): Promise<FeynmanSourceRef | null> {
  if (!topicId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("topics")
    .select("feynman_source_ref")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .single();

  const raw = data?.feynman_source_ref;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const ref = raw as Record<string, unknown>;
  if (ref.type !== "paper" && ref.type !== "video" && ref.type !== "notes") {
    return null;
  }

  return raw as unknown as FeynmanSourceRef;
}

/**
 * Persists a Feynman source reference on a topic.
 * Pass `null` to clear the attachment (equivalent to `clearFeynmanSource`).
 */
export async function setFeynmanSource(
  topicId: string,
  ref: FeynmanSourceRef
): Promise<{ success?: boolean; error?: string }> {
  if (!topicId) return { error: "No topic selected." };
  if (!ref.type) return { error: "Invalid source reference." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("topics")
    .update({ feynman_source_ref: ref as unknown as Record<string, unknown> })
    .eq("id", topicId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/app/feynman");
  return { success: true };
}

/**
 * Removes the Feynman source reference from a topic (reverts to unverified mode).
 */
export async function clearFeynmanSource(
  topicId: string
): Promise<{ success?: boolean; error?: string }> {
  if (!topicId) return { error: "No topic selected." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("topics")
    .update({ feynman_source_ref: null })
    .eq("id", topicId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/app/feynman");
  return { success: true };
}

/**
 * Returns all papers with `parse_status = 'ready'` for the source picker.
 * Only papers that have indexed chunks can be used as grounding sources.
 */
export async function getIndexedPapersForSource(): Promise<IndexedPaperSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("papers")
    .select("id, title, chunk_count")
    .eq("user_id", user.id)
    .eq("parse_status", "ready")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    chunkCount: p.chunk_count ?? 0,
  }));
}
