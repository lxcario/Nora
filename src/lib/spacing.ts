/**
 * Spacing-aware planner math (spec Req 7.1–7.6, Cepeda et al. 2008).
 *
 * Key findings from the temporal ridgeline:
 *   • For a given retention interval R (days until exam), the optimal
 *     interstudy gap is ~10–20% of R.
 *   • The ridgeline is non-monotonic at very short R but is effectively
 *     monotone for practical study intervals (R ≥ 2 days).
 *   • ASYMMETRIC COST: under-spacing is far more costly than over-spacing,
 *     so when the ideal gap is uncertain we err wider (Req 7.2).
 *
 * The `DEFAULT_RETENTION` constant (used by the FSRS scheduler) is boosted
 * near an exam (Req 7.3). Planner.ts reads this to override per-subject
 * retention when scheduling FSRS reviews.
 *
 * Pure module — no database, no network, no side effects (Req 7.6).
 */

// ---------------------------------------------------------------------------
// Ridgeline lookup table
// ---------------------------------------------------------------------------

/**
 * Optimal interstudy gap in days, keyed by days-until-exam (retention interval).
 * Derived from the Cepeda et al. 2008 temporal ridgeline.
 *
 * Pairs are [daysUntilExam, optimalGapDays].
 * The table is monotone increasing in both columns (required by SPACING-1).
 * Interpolation is linear between known points.
 */
const RIDGELINE_TABLE: readonly [number, number][] = [
  [1,   1],
  [2,   1],
  [3,   1],
  [5,   1],
  [7,   1],
  [10,  2],
  [14,  2],
  [21,  3],
  [30,  5],
  [45,  7],
  [60,  9],
  [90,  13],
  [120, 15],
  [180, 18],
  [270, 20],
  [365, 21],
];

/**
 * Near-exam threshold in days. Below this boundary the planner switches to
 * a higher FSRS target retention (Req 7.3).
 */
export const NEAR_EXAM_THRESHOLD_DAYS = 14;

/**
 * FSRS request_retention to use for subjects near an exam (Req 7.3).
 * Raises the bar so the scheduler produces shorter, more frequent reviews.
 */
export const NEAR_EXAM_RETENTION = 0.95;

/**
 * Default FSRS request_retention used when exam is not near (or unknown).
 */
export const DEFAULT_RETENTION = 0.9;

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

/**
 * Returns the recommended interstudy gap (days) for a given days-until-exam.
 *
 * Properties (SPACING-1):
 *   1. Non-decreasing in `daysUntilExam`.
 *   2. Never returns a gap >= `daysUntilExam` (can't put a session past the exam).
 *   3. Minimum 1 day.
 *
 * Asymmetric-cost principle (Req 7.2): when interpolating between ridgeline
 * points we round UP (ceiling) rather than down, erring toward wider gaps.
 *
 * @param daysUntilExam Days remaining until the retention target (e.g. exam date).
 */
export function optimalGapDays(daysUntilExam: number): number {
  if (!Number.isFinite(daysUntilExam) || daysUntilExam <= 0) return 1;
  if (daysUntilExam === 1) return 1;

  const [minD, maxD] = [
    RIDGELINE_TABLE[0][0],
    RIDGELINE_TABLE[RIDGELINE_TABLE.length - 1][0],
  ];

  // Below the table minimum: 1-day gap.
  if (daysUntilExam <= minD) return 1;

  // Above the table maximum: extrapolate at the same ~5.7% ratio as the last
  // two entries, erring wide (ceil).
  if (daysUntilExam >= maxD) {
    const [d1, g1] = RIDGELINE_TABLE[RIDGELINE_TABLE.length - 2];
    const [d2, g2] = RIDGELINE_TABLE[RIDGELINE_TABLE.length - 1];
    const slope = (g2 - g1) / (d2 - d1);
    const extrapolated = g2 + slope * (daysUntilExam - d2);
    const gap = Math.ceil(extrapolated);
    return clampGap(gap, daysUntilExam);
  }

  // Interpolate between the two nearest table entries (linear, ceil for wider).
  for (let i = 1; i < RIDGELINE_TABLE.length; i++) {
    const [d1, g1] = RIDGELINE_TABLE[i - 1];
    const [d2, g2] = RIDGELINE_TABLE[i];
    if (daysUntilExam <= d2) {
      const t = (daysUntilExam - d1) / (d2 - d1);
      const interpolated = g1 + t * (g2 - g1);
      const gap = Math.ceil(interpolated);
      return clampGap(gap, daysUntilExam);
    }
  }

  return clampGap(RIDGELINE_TABLE[RIDGELINE_TABLE.length - 1][1], daysUntilExam);
}

/** Clamp gap so it is at least 1 and strictly less than daysUntilExam. */
function clampGap(gap: number, daysUntilExam: number): number {
  return Math.min(Math.max(1, gap), Math.max(1, daysUntilExam - 1));
}

/**
 * Returns the recommended FSRS target retention for a given exam proximity.
 *
 * Near-exam (< 14 days): 0.95 — shorter intervals, more frequent reviews.
 * Otherwise: 0.90 — standard retention.
 *
 * @param daysUntilExam Days until the exam (or Infinity / null when unknown).
 */
export function examRetention(
  daysUntilExam: number | null | undefined
): number {
  if (
    daysUntilExam == null ||
    !Number.isFinite(daysUntilExam) ||
    daysUntilExam > NEAR_EXAM_THRESHOLD_DAYS
  ) {
    return DEFAULT_RETENTION;
  }
  return NEAR_EXAM_RETENTION;
}

// ---------------------------------------------------------------------------
// Session distributor
// ---------------------------------------------------------------------------

/** Input for distributeSessions. */
export interface TopicScheduleInput {
  topicId: string;
  /** Days until the exam for this topic (null = no known exam). */
  daysUntilExam: number | null;
}

/** A single planned session date. */
export interface PlannedSessionDate {
  topicId: string;
  /** Calendar date (YYYY-MM-DD) for the planned session. */
  date: string;
  /** Recommended FSRS retention override for this session. */
  requestRetention: number;
}

/**
 * Distribute review sessions for a set of topics across a time window.
 *
 * For each topic with a known exam, sessions are placed at the optimal gap
 * from today, then at expanding subsequent gaps until the exam or the window
 * end (whichever comes first). Topics without an exam get a single session
 * placed `optimalGapDays(windowDays)` from today.
 *
 * Asymmetric cost is built in: `optimalGapDays` always rounds up.
 *
 * @param topics   Topics to schedule.
 * @param today    Reference date (e.g. today).
 * @param windowDays  Number of days to plan ahead (default 7).
 */
export function distributeSessions(
  topics: TopicScheduleInput[],
  today: Date,
  windowDays = 7
): PlannedSessionDate[] {
  const sessions: PlannedSessionDate[] = [];

  for (const t of topics) {
    const d = t.daysUntilExam;
    if (d !== null && d <= 0) continue; // exam in the past — skip

    const effectiveDays = d ?? windowDays;
    const retention = examRetention(d);
    let gapDays = optimalGapDays(effectiveDays);
    let offset = gapDays;

    while (offset <= windowDays && (d === null || offset < effectiveDays)) {
      const sessionDate = new Date(today.getTime() + offset * 86_400_000);
      sessions.push({
        topicId: t.topicId,
        date: sessionDate.toISOString().split("T")[0],
        requestRetention: retention,
      });
      // Expand gap by 20% for subsequent sessions (wider on uncertainty).
      gapDays = Math.ceil(gapDays * 1.2);
      offset += gapDays;
    }
  }

  // Sort by date, then topicId for deterministic output.
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.topicId.localeCompare(b.topicId));
  return sessions;
}
