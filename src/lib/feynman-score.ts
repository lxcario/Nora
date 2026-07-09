/**
 * Feynman comprehension scoring.
 *
 * Turns the qualitative gap analysis (green / amber / red segments) returned
 * by the "Inquisitive Student" evaluation into a deterministic, comparable
 * score so students can track understanding across attempts and the rest of
 * the app can reason about mastery.
 *
 * Pure functions — no side effects — so they're cheap to unit-test and don't
 * depend on the (non-deterministic) LLM for the number itself.
 */

export type SegmentStatus = "green" | "amber" | "red";

/** Weight each status contributes toward the comprehension score. */
const STATUS_WEIGHT: Record<SegmentStatus, number> = {
  green: 1,
  amber: 0.5,
  red: 0,
};

export type Verdict =
  | "strong"
  | "solid"
  | "partial"
  | "weak";

export interface ComprehensionScore {
  /** 0–100 weighted understanding score. */
  score: number;
  /** Coarse verdict band derived from the score. */
  verdict: Verdict;
  /** Short human-readable label for the verdict. */
  label: string;
  counts: { green: number; amber: number; red: number; total: number };
}

/**
 * Normalizes an arbitrary status string from the model into a valid
 * SegmentStatus. Unknown / missing values are treated as the most
 * conservative band ("red") so noise never inflates the score.
 */
export function normalizeSegmentStatus(raw: unknown): SegmentStatus {
  if (typeof raw !== "string") return "red";
  const v = raw.trim().toLowerCase();
  if (v === "green" || v === "amber" || v === "red") return v;
  // Tolerate common synonyms the model might emit.
  if (v === "correct" || v === "accurate" || v === "good") return "green";
  if (v === "partial" || v === "vague" || v === "unclear" || v === "yellow") return "amber";
  if (v === "wrong" || v === "incorrect" || v === "missing") return "red";
  return "red";
}

const VERDICT_LABELS: Record<Verdict, string> = {
  strong: "Strong understanding",
  solid: "Solid — minor gaps",
  partial: "Partial understanding",
  weak: "Needs more work",
};

/**
 * Maps a 0–100 score to a verdict band.
 */
export function scoreToVerdict(score: number): Verdict {
  if (score >= 85) return "strong";
  if (score >= 65) return "solid";
  if (score >= 40) return "partial";
  return "weak";
}

/**
 * Computes a comprehension score from classified explanation segments.
 *
 * score = round(100 * Σ weight(status) / segmentCount)
 *
 * Returns a score of 0 with the "weak" verdict when there are no segments
 * (e.g. the explanation was rejected as off-topic / all-questions).
 */
export function computeComprehensionScore(
  // Only `status` is read; extra keys (adversarial `text`/`feedback`/etc. the
  // model may emit) are tolerated and ignored, so callers never need to cast.
  segments: readonly { status?: unknown; [key: string]: unknown }[]
): ComprehensionScore {
  const counts = { green: 0, amber: 0, red: 0, total: 0 };

  for (const seg of segments) {
    const status = normalizeSegmentStatus(seg?.status);
    counts[status] += 1;
    counts.total += 1;
  }

  if (counts.total === 0) {
    return { score: 0, verdict: "weak", label: VERDICT_LABELS.weak, counts };
  }

  const weighted =
    counts.green * STATUS_WEIGHT.green +
    counts.amber * STATUS_WEIGHT.amber +
    counts.red * STATUS_WEIGHT.red;

  const score = Math.round((100 * weighted) / counts.total);
  const verdict = scoreToVerdict(score);

  return { score, verdict, label: VERDICT_LABELS[verdict], counts };
}

/**
 * Describes the change between two scores for the iterative refine loop.
 * Positive delta = improvement.
 */
export function scoreDelta(previous: number, current: number): number {
  return current - previous;
}
