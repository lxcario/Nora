// ---------------------------------------------------------------------------
// Focus Timer — Adaptive Engine (pure module)
// ---------------------------------------------------------------------------
// Computes a recommended Pomodoro work/break split from the student's recent
// focus-session history. Pure and deterministic so it is unit-testable without
// a database. Spec: .kiro/specs/focus-timer (Requirements 2.1–2.5).
// ---------------------------------------------------------------------------

export interface FocusSessionRecord {
  /** Actual focus-block duration in minutes. */
  durationMinutes: number;
  /** Whether the planned session ran to completion (vs. ended early). */
  completedFull: boolean;
  /** When the session occurred. */
  createdAt: Date;
}

export interface FocusRecommendation {
  /** Recommended focus block length, clamped to [10, 60]. */
  focusMinutes: number;
  /** Recommended break length, clamped to [3, 15]. */
  breakMinutes: number;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export const FOCUS_MIN = 10;
export const FOCUS_MAX = 60;
export const BREAK_MIN = 3;
export const BREAK_MAX = 15;
export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;

/** Minimum history size before we trust the adaptive recommendation. */
const MIN_SESSIONS_FOR_ADAPTATION = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Compute the recommended focus/break durations from focus-session history.
 *
 * Rules (see spec Req 2):
 *  - < 5 sessions → default 25/5, low confidence.
 *  - Otherwise: focus = clamp(round(avg duration over last 14d), 10..60).
 *  - break = clamp(round(focus * 0.2), 3..15).
 *  - If > 60% of last-7-day sessions ended early → shorten focus by 5 (clamped).
 *  - Confidence: high with >= 10 recent sessions, else medium.
 *
 * @param now injectable clock for deterministic testing (defaults to Date.now()).
 */
export function computeRecommendation(
  sessions: FocusSessionRecord[],
  now: number = Date.now(),
): FocusRecommendation {
  if (!sessions || sessions.length < MIN_SESSIONS_FOR_ADAPTATION) {
    return {
      focusMinutes: DEFAULT_FOCUS_MINUTES,
      breakMinutes: DEFAULT_BREAK_MINUTES,
      confidence: "low",
      reason: "Using defaults — not enough focus history yet",
    };
  }

  const recent14d = sessions.filter(
    (s) => now - s.createdAt.getTime() <= 14 * DAY_MS,
  );

  // Fall back to defaults if the window is empty (all history is stale).
  if (recent14d.length === 0) {
    return {
      focusMinutes: DEFAULT_FOCUS_MINUTES,
      breakMinutes: DEFAULT_BREAK_MINUTES,
      confidence: "low",
      reason: "Using defaults — no recent focus sessions",
    };
  }

  const avgDuration =
    recent14d.reduce((sum, s) => sum + s.durationMinutes, 0) / recent14d.length;

  const focusBase = clamp(Math.round(avgDuration), FOCUS_MIN, FOCUS_MAX);
  const breakMinutes = clamp(Math.round(focusBase * 0.2), BREAK_MIN, BREAK_MAX);

  // Early-end pattern over the last 7 days.
  const recent7d = recent14d.filter((s) => now - s.createdAt.getTime() <= 7 * DAY_MS);
  const earlyRatio =
    recent7d.length > 0
      ? recent7d.filter((s) => !s.completedFull).length / recent7d.length
      : 0;

  const oftenEndsEarly = earlyRatio > 0.6;
  const focusMinutes = oftenEndsEarly
    ? clamp(focusBase - 5, FOCUS_MIN, FOCUS_MAX)
    : focusBase;

  return {
    focusMinutes,
    breakMinutes,
    confidence: recent14d.length >= 10 ? "high" : "medium",
    reason: oftenEndsEarly
      ? "Shortened a little — you often finish early"
      : `Based on your ~${Math.round(avgDuration)} min average`,
  };
}
