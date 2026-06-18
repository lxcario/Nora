/**
 * Tests for src/lib/fsrs.ts
 *
 * Covers FSRS-1 properties from the spec:
 *   - due > now for all four ratings on any valid card.
 *   - Monotonic stability growth on Good/Easy vs Hard for Review-state cards.
 *   - Again on a Review card → Relearning state + lapses incremented.
 *   - Pure function: same inputs → same outputs (fuzz disabled).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  scheduleReview,
  createNewFSRSCard,
  initFromSM2,
  sm2GradeToRating,
  Rating,
  State,
  type FSRSCardState,
  type SM2History,
} from "./fsrs";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2025-06-15T12:00:00.000Z");

const ALL_GRADES = [
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
] as const;

/**
 * Build a card already in Review state with the given memory parameters.
 * `daysAgo` simulates how many days have elapsed since the last review.
 */
function makeReviewCard(
  stability: number,
  difficulty: number,
  daysAgo: number,
  now: Date = NOW
): FSRSCardState {
  const lastReview = new Date(now.getTime() - daysAgo * 86_400_000);
  return {
    stability,
    difficulty,
    due: lastReview, // already overdue
    last_review: lastReview,
    reps: 3,
    lapses: 0,
    state: State.Review,
    scheduled_days: daysAgo,
    learning_steps: 0,
  };
}

// ---------------------------------------------------------------------------
// Unit tests — createNewFSRSCard
// ---------------------------------------------------------------------------

describe("createNewFSRSCard", () => {
  it("returns a New-state card with zero reps and lapses", () => {
    const card = createNewFSRSCard(NOW);
    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
  });

  it("due is set to now for a brand-new card", () => {
    const card = createNewFSRSCard(NOW);
    // ts-fsrs creates empty cards with due = now
    expect(card.due.getTime()).toBe(NOW.getTime());
  });
});

// ---------------------------------------------------------------------------
// Unit tests — scheduleReview on a New card
// ---------------------------------------------------------------------------

describe("scheduleReview — State.New", () => {
  it("all four ratings return due strictly after now", () => {
    const newCard = createNewFSRSCard(NOW);
    for (const rating of ALL_GRADES) {
      const { card } = scheduleReview(newCard, rating, NOW);
      expect(card.due.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("reps increments after any first review", () => {
    const newCard = createNewFSRSCard(NOW);
    for (const rating of ALL_GRADES) {
      const { card } = scheduleReview(newCard, rating, NOW);
      expect(card.reps).toBeGreaterThan(newCard.reps);
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests — scheduleReview on a Review-state card
// ---------------------------------------------------------------------------

describe("scheduleReview — State.Review", () => {
  it("all four ratings return due strictly after now", () => {
    const card = makeReviewCard(10, 5, 10);
    for (const rating of ALL_GRADES) {
      const { card: next } = scheduleReview(card, rating, NOW);
      expect(next.due.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("Good and Easy keep the card in Review state", () => {
    const card = makeReviewCard(10, 5, 10);
    for (const rating of [Rating.Good, Rating.Easy] as const) {
      const { card: next } = scheduleReview(card, rating, NOW);
      expect(next.state).toBe(State.Review);
    }
  });

  it("Again → Relearning state", () => {
    const card = makeReviewCard(10, 5, 10);
    const { card: next } = scheduleReview(card, Rating.Again, NOW);
    expect(next.state).toBe(State.Relearning);
  });

  it("Again → lapses increments by exactly 1", () => {
    const card = makeReviewCard(10, 5, 10);
    const { card: next } = scheduleReview(card, Rating.Again, NOW);
    expect(next.lapses).toBe(card.lapses + 1);
  });

  it("stability monotonicity: Easy >= Good > Hard", () => {
    const card = makeReviewCard(10, 5, 10);
    const hardStab = scheduleReview(card, Rating.Hard, NOW).card.stability;
    const goodStab = scheduleReview(card, Rating.Good, NOW).card.stability;
    const easyStab = scheduleReview(card, Rating.Easy, NOW).card.stability;

    expect(goodStab).toBeGreaterThan(hardStab);
    expect(easyStab).toBeGreaterThanOrEqual(goodStab);
  });

  it("Good review increases stability compared to current value", () => {
    const card = makeReviewCard(10, 5, 10);
    const { card: next } = scheduleReview(card, Rating.Good, NOW);
    expect(next.stability).toBeGreaterThan(card.stability);
  });

  it("stability remains positive for Good and Easy", () => {
    const card = makeReviewCard(10, 5, 10);
    for (const rating of [Rating.Good, Rating.Easy] as const) {
      const { card: next } = scheduleReview(card, rating, NOW);
      expect(next.stability).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests — review log
// ---------------------------------------------------------------------------

describe("scheduleReview — log output", () => {
  it("log.review equals the 'now' passed in", () => {
    const card = makeReviewCard(10, 5, 10);
    const { log } = scheduleReview(card, Rating.Good, NOW);
    expect(log.review.getTime()).toBe(NOW.getTime());
  });

  it("log.state captures state BEFORE the review", () => {
    const card = makeReviewCard(10, 5, 10);
    const { log } = scheduleReview(card, Rating.Good, NOW);
    expect(log.state).toBe(State.Review);
  });

  it("log.rating matches the grade passed in for all grades", () => {
    const card = makeReviewCard(10, 5, 10);
    for (const rating of ALL_GRADES) {
      const { log } = scheduleReview(card, rating, NOW);
      expect(log.rating).toBe(rating);
    }
  });

  it("log.scheduled_days > 0 for Good on a Review card", () => {
    const card = makeReviewCard(10, 5, 10);
    const { log } = scheduleReview(card, Rating.Good, NOW);
    expect(log.scheduled_days).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — near-exam retention override
// ---------------------------------------------------------------------------

describe("scheduleReview — requestRetention override", () => {
  it("higher retention (0.95) schedules a shorter interval than default (0.90)", () => {
    const card = makeReviewCard(20, 5, 15);
    const defaultResult = scheduleReview(card, Rating.Good, NOW);
    const highRetResult = scheduleReview(card, Rating.Good, NOW, {
      requestRetention: 0.95,
    });
    // Higher retention → shorter interval → closer due date
    expect(highRetResult.card.due.getTime()).toBeLessThanOrEqual(
      defaultResult.card.due.getTime()
    );
  });
});

// ---------------------------------------------------------------------------
// Property tests — FSRS-1
// ---------------------------------------------------------------------------

describe("property tests — FSRS-1", () => {
  /**
   * Generator for a Review-state card with valid FSRS parameter ranges.
   * Stability: [1, 200] days (representative post-graduate range).
   * Difficulty: [1, 10] (FSRS difficulty bounds).
   * daysAgo: [1, 60] (realistic elapsed time in days).
   */
  const reviewCardArb = fc
    .record({
      stability: fc.float({ min: 1, max: 200, noNaN: true }),
      difficulty: fc.float({ min: 1, max: 10, noNaN: true }),
      daysAgo: fc.integer({ min: 1, max: 60 }),
    })
    .map(({ stability, difficulty, daysAgo }) =>
      makeReviewCard(stability, difficulty, daysAgo)
    );

  it("FSRS-1: due > now for all ratings on any valid Review-state card", () => {
    fc.assert(
      fc.property(
        reviewCardArb,
        fc.constantFrom(...ALL_GRADES),
        (card, rating) => {
          const { card: next } = scheduleReview(card, rating, NOW);
          return next.due.getTime() > NOW.getTime();
        }
      )
    );
  });

  it("FSRS-1: stability monotonicity — Easy ≥ Good ≥ Hard for any Review card", () => {
    fc.assert(
      fc.property(reviewCardArb, (card) => {
        const eps = 1e-9;
        const hard = scheduleReview(card, Rating.Hard, NOW).card.stability;
        const good = scheduleReview(card, Rating.Good, NOW).card.stability;
        const easy = scheduleReview(card, Rating.Easy, NOW).card.stability;
        return good >= hard - eps && easy >= good - eps;
      })
    );
  });

  it("FSRS-1: Again on any Review card → Relearning and lapses + 1", () => {
    fc.assert(
      fc.property(reviewCardArb, (card) => {
        const { card: next } = scheduleReview(card, Rating.Again, NOW);
        return (
          next.state === State.Relearning && next.lapses === card.lapses + 1
        );
      })
    );
  });

  it("FSRS-1: stability > 0 for Good/Easy on any Review card", () => {
    fc.assert(
      fc.property(
        reviewCardArb,
        fc.constantFrom(Rating.Good, Rating.Easy),
        (card, rating) => {
          const { card: next } = scheduleReview(card, rating, NOW);
          return next.stability > 0;
        }
      )
    );
  });

  it("FSRS-1: pure function — identical inputs produce identical due dates (fuzz off)", () => {
    fc.assert(
      fc.property(
        reviewCardArb,
        fc.constantFrom(...ALL_GRADES),
        (card, rating) => {
          const r1 = scheduleReview(card, rating, NOW);
          const r2 = scheduleReview(card, rating, NOW);
          return (
            r1.card.due.getTime() === r2.card.due.getTime() &&
            r1.card.stability === r2.card.stability &&
            r1.card.scheduled_days === r2.card.scheduled_days
          );
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — sm2GradeToRating
// ---------------------------------------------------------------------------

describe("sm2GradeToRating", () => {
  it("maps SM-2 grades 0–5 to the closest FSRS rating", () => {
    expect(sm2GradeToRating(0)).toBe(Rating.Again);
    expect(sm2GradeToRating(1)).toBe(Rating.Again);
    expect(sm2GradeToRating(2)).toBe(Rating.Again);
    expect(sm2GradeToRating(3)).toBe(Rating.Hard);
    expect(sm2GradeToRating(4)).toBe(Rating.Good);
    expect(sm2GradeToRating(5)).toBe(Rating.Easy);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — initFromSM2
// ---------------------------------------------------------------------------

describe("initFromSM2", () => {
  it("treats a never-studied card as brand-new (New state, due ~now)", () => {
    const seed = initFromSM2(
      { interval: 0, repetition: 0, efactor: 2.5, nextReviewAt: null },
      NOW
    );
    expect(seed.state).toBe(State.New);
    expect(seed.reps).toBe(0);
    expect(seed.lapses).toBe(0);
    expect(seed.due.getTime()).toBe(NOW.getTime());
  });

  it("preserves an established card's existing due date", () => {
    const nextReviewAt = new Date("2025-07-01T00:00:00.000Z");
    const seed = initFromSM2(
      { interval: 12, repetition: 4, efactor: 2.4, nextReviewAt },
      NOW
    );
    expect(seed.due.getTime()).toBe(nextReviewAt.getTime());
    expect(seed.state).toBe(State.Review);
    expect(seed.scheduled_days).toBe(12);
  });

  it("seeds stability from the SM-2 interval", () => {
    const seed = initFromSM2(
      {
        interval: 30,
        repetition: 5,
        efactor: 2.5,
        nextReviewAt: new Date("2025-07-15T00:00:00.000Z"),
      },
      NOW
    );
    expect(seed.stability).toBeCloseTo(30, 5);
  });

  it("maps a low ease factor to high difficulty", () => {
    const hard = initFromSM2(
      { interval: 3, repetition: 2, efactor: 1.3, nextReviewAt: null },
      NOW
    );
    const easy = initFromSM2(
      { interval: 3, repetition: 2, efactor: 2.8, nextReviewAt: null },
      NOW
    );
    expect(hard.difficulty).toBeGreaterThan(easy.difficulty);
    expect(hard.difficulty).toBeLessThanOrEqual(10);
    expect(easy.difficulty).toBeGreaterThanOrEqual(1);
  });

  it("counts lapses (grade < 3) from review history", () => {
    const reviews = [
      { grade: 5, reviewedAt: new Date("2025-05-01T00:00:00.000Z") },
      { grade: 2, reviewedAt: new Date("2025-05-10T00:00:00.000Z") }, // lapse
      { grade: 4, reviewedAt: new Date("2025-05-20T00:00:00.000Z") },
      { grade: 1, reviewedAt: new Date("2025-06-01T00:00:00.000Z") }, // lapse
    ];
    const seed = initFromSM2(
      { interval: 6, repetition: 2, efactor: 2.1, nextReviewAt: null, reviews },
      NOW
    );
    expect(seed.lapses).toBe(2);
    expect(seed.reps).toBe(4);
    // last_review = newest review timestamp
    expect(seed.last_review?.getTime()).toBe(
      new Date("2025-06-01T00:00:00.000Z").getTime()
    );
  });

  it("produces a state usable by scheduleReview (round-trips cleanly)", () => {
    const seed = initFromSM2(
      {
        interval: 8,
        repetition: 3,
        efactor: 2.2,
        nextReviewAt: new Date("2025-06-20T00:00:00.000Z"),
      },
      NOW
    );
    const { card } = scheduleReview(seed, Rating.Good, NOW);
    expect(Number.isFinite(card.stability)).toBe(true);
    expect(card.due.getTime()).toBeGreaterThan(NOW.getTime());
  });
});

// ---------------------------------------------------------------------------
// Property tests — FSRS-2 (migration safety)
// ---------------------------------------------------------------------------

describe("property tests — FSRS-2", () => {
  /** Generates a plausible SM-2 history for an established card. */
  const sm2HistoryArb = fc.record({
    interval: fc.integer({ min: 0, max: 365 }),
    repetition: fc.integer({ min: 0, max: 50 }),
    efactor: fc.float({ min: Math.fround(1.3), max: Math.fround(3.5), noNaN: true }),
    // days from NOW the card is next due (can be in the past = overdue)
    dueOffsetDays: fc.integer({ min: -30, max: 365 }),
  });

  function toHistory(rec: {
    interval: number;
    repetition: number;
    efactor: number;
    dueOffsetDays: number;
  }): SM2History {
    return {
      interval: rec.interval,
      repetition: rec.repetition,
      efactor: rec.efactor,
      nextReviewAt: new Date(NOW.getTime() + rec.dueOffsetDays * 86_400_000),
    };
  }

  it("FSRS-2: never produces NaN or negative stability/difficulty", () => {
    fc.assert(
      fc.property(sm2HistoryArb, (rec) => {
        const seed = initFromSM2(toHistory(rec), NOW);
        // Requirement FSRS-2: finite, non-negative, difficulty within [0,10].
        // (A never-studied card is seeded as a New card whose stability and
        //  difficulty are the FSRS zero sentinel — zero is valid, negative
        //  and NaN are not.)
        return (
          Number.isFinite(seed.stability) &&
          seed.stability >= 0 &&
          Number.isFinite(seed.difficulty) &&
          seed.difficulty >= 0 &&
          seed.difficulty <= 10
        );
      })
    );
  });

  it("FSRS-2: established cards get a positive stability and difficulty in [1,10]", () => {
    fc.assert(
      fc.property(
        sm2HistoryArb.filter((r) => r.interval > 0 || r.repetition > 0),
        (rec) => {
          const seed = initFromSM2(toHistory(rec), NOW);
          return (
            seed.stability > 0 &&
            seed.difficulty >= 1 &&
            seed.difficulty <= 10
          );
        }
      )
    );
  });

  it("FSRS-2: reps and lapses are non-negative integers", () => {
    fc.assert(
      fc.property(sm2HistoryArb, (rec) => {
        const seed = initFromSM2(toHistory(rec), NOW);
        return (
          Number.isInteger(seed.reps) &&
          seed.reps >= 0 &&
          Number.isInteger(seed.lapses) &&
          seed.lapses >= 0
        );
      })
    );
  });

  it("FSRS-2: state is a valid FSRS state (0–3)", () => {
    fc.assert(
      fc.property(sm2HistoryArb, (rec) => {
        const seed = initFromSM2(toHistory(rec), NOW);
        return [State.New, State.Learning, State.Review, State.Relearning].includes(
          seed.state
        );
      })
    );
  });

  it("FSRS-2: does NOT force all cards due on the same day", () => {
    // Build a batch of established cards with distinct existing due dates.
    const histories: SM2History[] = Array.from({ length: 25 }, (_, i) => ({
      interval: 5 + i,
      repetition: 3,
      efactor: 2.5,
      nextReviewAt: new Date(NOW.getTime() + i * 86_400_000),
    }));

    const dueTimes = histories.map(
      (h) => initFromSM2(h, NOW).due.getTime()
    );
    const distinct = new Set(dueTimes);

    // With distinct input schedules, the seeded due dates must stay distinct.
    expect(distinct.size).toBe(histories.length);
  });

  it("FSRS-2: established cards keep their existing due date (no rescheduling to now)", () => {
    fc.assert(
      fc.property(
        sm2HistoryArb.filter((r) => r.interval > 0 || r.repetition > 0),
        (rec) => {
          const history = toHistory(rec);
          const seed = initFromSM2(history, NOW);
          return seed.due.getTime() === history.nextReviewAt!.getTime();
        }
      )
    );
  });
});
