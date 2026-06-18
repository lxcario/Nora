/**
 * FSRS (Free Spaced Repetition Scheduler) — pure module.
 *
 * Wraps ts-fsrs (MIT, v5.4.x / FSRS-6) with an app-level API that:
 *   - Uses our own FSRSCardState type that maps 1-to-1 with DB columns.
 *   - Keeps the scheduling function free of any DB / network calls.
 *   - Disables interval fuzz by default so the function is deterministic
 *     and easy to unit-test (callers can opt in via scheduleOptions).
 *
 * Re-exports Rating and State so callers never need to import ts-fsrs directly.
 */

import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
  type FSRSParameters,
  type ReviewLog,
} from "ts-fsrs";

// Re-export so callers never need to import ts-fsrs directly.
export { Rating, State };
// Grade is Rating.Again | Rating.Hard | Rating.Good | Rating.Easy.
export type { Grade };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default FSRS target retrieval probability (0–1). */
export const DEFAULT_RETENTION = 0.9;

/** Maximum interval cap (days). Large enough to be non-restrictive. */
export const DEFAULT_MAX_INTERVAL = 36500;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Persisted FSRS state that mirrors the DB columns added in migration 010.
 * Dates are JS Date objects; the persistence layer stores them as UTC
 * timestamptz and must convert when reading/writing.
 */
export interface FSRSCardState {
  stability: number;
  difficulty: number;
  /** Absolute UTC instant when the card next becomes due. */
  due: Date;
  /** UTC instant of the most recent review, or null for a brand-new card. */
  last_review: Date | null;
  /** Total successful review count. */
  reps: number;
  /** Total lapse (Again) count. */
  lapses: number;
  /**
   * Card state as a smallint:
   *   0 = New, 1 = Learning, 2 = Review, 3 = Relearning
   * Use the re-exported `State` enum for comparisons.
   */
  state: number;
  /** Number of days the card was last scheduled for. */
  scheduled_days: number;
  /**
   * Index into the (re)learning steps array — tracks progress through the
   * short-term learning queue. 0 for cards that have graduated to Review.
   */
  learning_steps: number;
}

/**
 * Review log entry produced after each call to scheduleReview.
 * Stored in card_reviews for analytics and SM-2 migration.
 */
export interface FSRSReviewLogEntry {
  /** Rating used for this review. */
  rating: number;
  /** Card state *before* the review. */
  state: number;
  /** The card's due date at review time. */
  due: Date;
  /** Stability after the review. */
  stability: number;
  /** Difficulty after the review. */
  difficulty: number;
  /** Interval (days) that was scheduled. */
  scheduled_days: number;
  /** UTC timestamp of the review. */
  review: Date;
  /** Learning-step index after the review. */
  learning_steps: number;
}

/** Result of a single scheduling call. */
export interface ScheduleResult {
  card: FSRSCardState;
  log: FSRSReviewLogEntry;
}

/** Optional overrides for a single scheduling call. */
export interface ScheduleOptions {
  /**
   * Override the target retention for this card (e.g. 0.95 near an exam).
   * Defaults to DEFAULT_RETENTION (0.90).
   */
  requestRetention?: number;
  /**
   * Enable interval fuzz (small random jitter). Default false so the function
   * stays deterministic for tests. Set true in production for natural spacing.
   */
  enableFuzz?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a ts-fsrs FSRS instance with the given options. */
function buildScheduler(
  requestRetention: number,
  enableFuzz: boolean
): ReturnType<typeof fsrs> {
  const params: Partial<FSRSParameters> = {
    request_retention: requestRetention,
    maximum_interval: DEFAULT_MAX_INTERVAL,
    enable_fuzz: enableFuzz,
    enable_short_term: true,
  };
  return fsrs(params);
}

/** Cached default scheduler (deterministic, retention = 0.90). */
const defaultScheduler = buildScheduler(DEFAULT_RETENTION, false);

/** Convert our persisted state to the ts-fsrs Card type. */
function toCard(state: FSRSCardState): Card {
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    // elapsed_days is deprecated in ts-fsrs v5; the library derives it
    // from last_review + the review timestamp passed to next().
    elapsed_days: 0,
    scheduled_days: state.scheduled_days,
    learning_steps: state.learning_steps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.last_review ?? undefined,
  };
}

/** Convert a ts-fsrs Card back to our persisted state. */
function fromCard(card: Card): FSRSCardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due,
    last_review: card.last_review ?? null,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
  };
}

/** Convert a ts-fsrs ReviewLog to our FSRSReviewLogEntry. */
function fromLog(log: ReviewLog): FSRSReviewLogEntry {
  return {
    rating: log.rating,
    state: log.state,
    due: log.due,
    stability: log.stability,
    difficulty: log.difficulty,
    scheduled_days: log.scheduled_days,
    review: log.review,
    learning_steps: log.learning_steps,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule the next review for a card.
 *
 * Pure function — no database, no network, no side effects.
 *
 * @param state   Current FSRS state of the card (from DB).
 * @param rating  User grade: Rating.Again | Hard | Good | Easy.
 * @param now     The moment of review (defaults to `new Date()`).
 * @param options Optional retention / fuzz overrides.
 *
 * @returns The updated card state and a log entry to persist.
 */
export function scheduleReview(
  state: FSRSCardState,
  rating: Grade,
  now: Date = new Date(),
  options: ScheduleOptions = {}
): ScheduleResult {
  const retention = options.requestRetention ?? DEFAULT_RETENTION;
  const fuzz = options.enableFuzz ?? false;

  const scheduler =
    retention === DEFAULT_RETENTION && !fuzz
      ? defaultScheduler
      : buildScheduler(retention, fuzz);

  const { card: nextCard, log } = scheduler.next(toCard(state), now, rating);

  return {
    card: fromCard(nextCard),
    log: fromLog(log),
  };
}

/**
 * Create a fresh FSRS state for a brand-new card.
 *
 * @param now Reference timestamp (defaults to `new Date()`).
 */
export function createNewFSRSCard(now: Date = new Date()): FSRSCardState {
  return fromCard(createEmptyCard(now));
}

// ---------------------------------------------------------------------------
// SM-2 → FSRS migration (backfill)
// ---------------------------------------------------------------------------

/** Default SM-2 ease factor (matches DB default of 2.50). */
const SM2_DEFAULT_EFACTOR = 2.5;
/** SM-2 ease floor (the algorithm clamps efactor to this minimum). */
const SM2_MIN_EFACTOR = 1.3;
/** Minimum stability ts-fsrs allows (avoids zero/negative memory state). */
const MIN_STABILITY = 0.1;

/** One day in milliseconds. */
const DAY_MS = 86_400_000;

/** A single SM-2 review pulled from the `card_reviews` table. */
export interface SM2Review {
  /** SM-2 grade, 0 (blackout) … 5 (perfect). */
  grade: number;
  /** When the review happened (UTC instant). */
  reviewedAt: Date;
}

/**
 * A card's existing SM-2 state plus its review history, used to seed FSRS
 * state during the one-time backfill (spec Requirement 1.4).
 */
export interface SM2History {
  /** Current SM-2 interval in days (cards.interval). */
  interval: number;
  /** Current SM-2 repetition count (cards.repetition). */
  repetition: number;
  /** Current SM-2 ease factor (cards.efactor). */
  efactor: number;
  /** The card's existing scheduled due date (cards.next_review_at), if any. */
  nextReviewAt: Date | null;
  /** Chronological review history from card_reviews (oldest → newest). */
  reviews?: SM2Review[];
}

/**
 * Maps an SM-2 grade (0–5) to the closest FSRS rating.
 *
 *   0,1,2 → Again  (SM-2 treats grade < 3 as a failed recall / reset)
 *   3     → Hard
 *   4     → Good
 *   5     → Easy
 */
export function sm2GradeToRating(grade: number): Grade {
  if (grade <= 2) return Rating.Again;
  if (grade === 3) return Rating.Hard;
  if (grade === 4) return Rating.Good;
  return Rating.Easy;
}

/**
 * Converts an SM-2 ease factor into an FSRS difficulty (1 easy … 10 hard).
 *
 * SM-2 ease ranges from ~1.3 (very hard) upward, with 2.5 as the neutral
 * default. We invert and scale it onto FSRS's [1, 10] difficulty band:
 *   efactor 1.3 → difficulty 10 (hardest)
 *   efactor 2.5 → difficulty ~4 (around the FSRS default)
 *   efactor 3.0+ → clamped toward 1 (easiest)
 */
function efactorToDifficulty(efactor: number): number {
  const ef = Number.isFinite(efactor) ? efactor : SM2_DEFAULT_EFACTOR;
  // Slope chosen so 1.3 → 10 and 2.5 → 4 (a 6-point drop over 1.2 ease).
  const difficulty = 10 - ((ef - SM2_MIN_EFACTOR) / (SM2_DEFAULT_EFACTOR - SM2_MIN_EFACTOR)) * 6;
  return clamp(difficulty, 1, 10);
}

/** Clamp helper. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Seed an FSRS card state from a card's SM-2 history (one-time backfill).
 *
 * Strategy (spec Requirement 1.4 — preserve data, don't force all cards due
 * on the same day):
 *   1. A card that has never been reviewed and has no interval is treated as
 *      brand-new (due now) — these are *meant* to be due.
 *   2. An established card (interval > 0 and/or repetition > 0) keeps its
 *      EXISTING due date (next_review_at). Its FSRS stability is seeded from
 *      the SM-2 interval and its difficulty from the ease factor, so the
 *      memory model starts in a plausible place without recomputing — and,
 *      crucially, each card keeps its own staggered due date.
 *
 * Pure function — no DB, no network.
 *
 * @param history The card's SM-2 fields + optional review history.
 * @param now     Reference "now" for brand-new cards (defaults to new Date()).
 */
export function initFromSM2(
  history: SM2History,
  now: Date = new Date()
): FSRSCardState {
  const reviews = (history.reviews ?? [])
    .filter((r) => r.reviewedAt instanceof Date && !Number.isNaN(r.reviewedAt.getTime()))
    .sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());

  const interval = Number.isFinite(history.interval) ? Math.max(0, history.interval) : 0;
  const repetition = Number.isFinite(history.repetition) ? Math.max(0, history.repetition) : 0;
  const hasBeenStudied = interval > 0 || repetition > 0 || reviews.length > 0;

  // Case 1: brand-new, never-studied card → standard empty FSRS card (due now).
  if (!hasBeenStudied) {
    return createNewFSRSCard(now);
  }

  // Lapses = number of failed SM-2 recalls (grade < 3) in the history.
  const lapses = reviews.reduce((n, r) => (r.grade < 3 ? n + 1 : n), 0);

  // reps = recorded reviews if we have them, else fall back to SM-2 repetition.
  const reps = reviews.length > 0 ? reviews.length : repetition;

  // last_review: the newest recorded review; otherwise derive it from the
  // existing schedule (next_review_at minus the current interval).
  let lastReview: Date | null = reviews.length > 0 ? reviews[reviews.length - 1].reviewedAt : null;
  if (!lastReview && history.nextReviewAt) {
    lastReview = new Date(history.nextReviewAt.getTime() - interval * DAY_MS);
  }
  if (!lastReview) {
    lastReview = now;
  }

  // due: preserve the card's existing schedule so the backfill never bunches
  // every card onto the same day. Fall back to last_review + interval.
  const due = history.nextReviewAt ?? new Date(lastReview.getTime() + interval * DAY_MS);

  // Stability ≈ SM-2 interval (both express "days until recall decays"),
  // floored so the FSRS memory model never starts at zero/negative.
  const stability = clamp(
    interval > 0 ? interval : MIN_STABILITY,
    MIN_STABILITY,
    DEFAULT_MAX_INTERVAL
  );

  const difficulty = efactorToDifficulty(history.efactor);

  // An established card with an interval is in the long-term Review state.
  const state = interval >= 1 || repetition > 1 ? State.Review : State.Learning;

  return {
    stability,
    difficulty,
    due,
    last_review: lastReview,
    reps,
    lapses,
    state,
    scheduled_days: interval,
    learning_steps: 0,
  };
}
