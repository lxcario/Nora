"use server";

import { createClient } from "@/lib/supabase/server";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { NORA_VOICE_EVALUATOR } from "@/lib/nora-voice";

// ---------------------------------------------------------------------------
// Error Spotter — "Derring Effect" study mode
// ---------------------------------------------------------------------------
// AI generates an explanation with deliberate calibrated mistakes. The student
// identifies and explains what's wrong. This strengthens far-transfer learning.
// Research: Springer 2023 — deliberately committing and correcting errors in
// low-stakes contexts enhances learning more than errorless elaboration.
// ---------------------------------------------------------------------------

export interface ErrorItem {
  /** The phrase/sentence that contains the error */
  errorText: string;
  /** What type of error: factual, logical, or conceptual */
  errorType: "factual" | "logical" | "conceptual";
  /** What the correct version should be */
  correction: string;
  /** Brief explanation of why it's wrong */
  explanation: string;
}

export interface ErrorExplanation {
  /** The full AI-generated text (200-400 words) containing hidden errors */
  text: string;
  /** Hidden errors embedded in the text (1-3) */
  errors: ErrorItem[];
  /** Difficulty level used for generation */
  difficulty: number;
  /** The topic this was generated for */
  topicName: string;
}

export interface SpotterAttempt {
  /** What the student highlighted */
  highlightedText: string;
  /** Student's explanation of why it's wrong */
  studentExplanation: string;
}

export interface SpotterResult {
  /** Whether this attempt matched a real error */
  verdict: "correct" | "partial" | "false_positive";
  /** Which error it matched (if any) */
  matchedError: ErrorItem | null;
  /** Feedback for the student */
  feedback: string;
}

export interface SpotterSessionResult {
  totalErrors: number;
  found: number;
  missed: ErrorItem[];
  attempts: { attempt: SpotterAttempt; result: SpotterResult }[];
  xpEarned: number;
}

/**
 * Generate an explanation with deliberate errors for a given topic.
 */
export async function generateErrorExplanation(topicId: string): Promise<{
  data?: ErrorExplanation;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!hasLLMProvider()) return { error: "No AI provider configured" };

  const rateCheck = checkRateLimit(user.id, "error-spotter", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) return { error: "Rate limited — try again in a minute" };

  // Get the topic info
  const { data: topic } = await supabase
    .from("topics")
    .select("name, subjects(name)")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .single();

  if (!topic) return { error: "Topic not found" };

  const subjectName = (topic.subjects as unknown as { name: string } | null)?.name ?? "General";

  // Get recent Feynman score to calibrate difficulty
  const { data: feynmanScores } = await supabase
    .from("feynman_explanations")
    .select("score")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const avgScore = feynmanScores && feynmanScores.length > 0
    ? feynmanScores.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0) / feynmanScores.length
    : 50;

  // Difficulty: 1-5 based on Feynman score (higher score → harder errors)
  const difficulty = avgScore <= 30 ? 1 : avgScore <= 50 ? 2 : avgScore <= 70 ? 3 : avgScore <= 85 ? 4 : 5;

  const difficultyGuide = difficulty <= 2
    ? "Plant OBVIOUS errors: wrong names, wrong dates, blatant contradictions that a student who barely knows the topic would catch."
    : difficulty <= 3
      ? "Plant MODERATE errors: subtle factual mistakes, a formula with one wrong component, or an oversimplification presented as complete truth."
      : "Plant SUBTLE errors: nuanced conceptual errors, flawed reasoning that sounds convincing, or a correct-sounding claim that misapplies a principle.";

  const prompt = `You are generating a study exercise. Write a 200-350 word explanation of "${topic.name}" (subject: ${subjectName}) that contains exactly ${difficulty <= 2 ? 2 : 3} deliberate errors for a student to find.

DIFFICULTY LEVEL: ${difficulty}/5
${difficultyGuide}

RULES:
- Write in a confident, authoritative tone (as if it were a textbook). The student should need to THINK to spot the errors.
- The surrounding content must be CORRECT. Only the deliberately planted errors should be wrong.
- Errors should be embedded naturally in the flow, not in obviously suspicious sentences.
- Each error should be a specific, identifiable claim (not vague handwaving).

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "text": "The full explanation text...",
  "errors": [
    {
      "errorText": "the exact phrase from the text that is wrong",
      "errorType": "factual" | "logical" | "conceptual",
      "correction": "what it should actually say",
      "explanation": "why the original is wrong and the correction is right"
    }
  ]
}`;

  const response = await callLLM({ system: "You generate study exercises with deliberate errors for students to find. Respond only with valid JSON.", user: prompt, temperature: 0.7, maxTokens: 1500 });
  if (!response) return { error: "AI generation failed" };

  try {
    // Strip markdown fences if the LLM wrapped the response
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { text: string; errors: ErrorItem[] };
    if (!parsed.text || !Array.isArray(parsed.errors) || parsed.errors.length === 0) {
      return { error: "AI returned an invalid response — try again" };
    }
    return {
      data: {
        text: parsed.text,
        errors: parsed.errors,
        difficulty,
        topicName: topic.name,
      },
    };
  } catch {
    return { error: "Failed to parse AI response — try again" };
  }
}

/**
 * Evaluate a student's error-spotting attempts against the hidden errors.
 * This is a client-side scoring function that doesn't need the LLM —
 * we compare the student's highlights against the known error locations.
 */
export async function evaluateSpotterAttempts(
  attempts: SpotterAttempt[],
  errors: ErrorItem[],
): Promise<{ data?: SpotterSessionResult; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const results: { attempt: SpotterAttempt; result: SpotterResult }[] = [];
  const foundErrorIndices = new Set<number>();

  for (const attempt of attempts) {
    const highlightLower = attempt.highlightedText.toLowerCase().trim();
    let bestMatch: { idx: number; overlap: number } | null = null;

    // Find the best-matching error for this attempt (fuzzy text overlap)
    for (let i = 0; i < errors.length; i++) {
      if (foundErrorIndices.has(i)) continue;
      const errorLower = errors[i].errorText.toLowerCase().trim();

      // Check if highlight substantially overlaps with the error text
      const overlap = highlightLower.includes(errorLower) || errorLower.includes(highlightLower)
        ? 1.0
        : computeWordOverlap(highlightLower, errorLower);

      if (overlap > 0.4 && (!bestMatch || overlap > bestMatch.overlap)) {
        bestMatch = { idx: i, overlap };
      }
    }

    if (bestMatch && bestMatch.overlap >= 0.4) {
      const matchedError = errors[bestMatch.idx];
      const hasGoodExplanation = attempt.studentExplanation.trim().length >= 15;

      if (bestMatch.overlap >= 0.6 && hasGoodExplanation) {
        foundErrorIndices.add(bestMatch.idx);
        results.push({
          attempt,
          result: { verdict: "correct", matchedError, feedback: `Correct! ${matchedError.explanation}` },
        });
      } else {
        foundErrorIndices.add(bestMatch.idx);
        results.push({
          attempt,
          result: { verdict: "partial", matchedError, feedback: `You found the right area but your explanation needs more detail. ${matchedError.explanation}` },
        });
      }
    } else {
      results.push({
        attempt,
        result: { verdict: "false_positive", matchedError: null, feedback: "This part is actually correct — no error here." },
      });
    }
  }

  const missed = errors.filter((_, i) => !foundErrorIndices.has(i));
  const found = foundErrorIndices.size;

  // XP: +15 per correct, +5 per partial, -5 per false positive (min 0)
  const xpEarned = Math.max(0,
    results.reduce((sum, r) => {
      if (r.result.verdict === "correct") return sum + 15;
      if (r.result.verdict === "partial") return sum + 5;
      return sum - 5;
    }, 0)
  );

  // Persist XP atomically (was previously returned client-side only)
  if (xpEarned > 0) {
    await supabase.rpc("increment_profile_rewards", {
      p_user_id: user.id,
      p_xp: xpEarned,
      p_coins: 0,
    });
  }

  return {
    data: {
      totalErrors: errors.length,
      found,
      missed,
      attempts: results,
      xpEarned,
    },
  };
}

/** Simple word-overlap ratio between two strings */
function computeWordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return overlap / Math.max(wordsA.size, wordsB.size);
}
