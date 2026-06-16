/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Grades: 0 (blackout) → 5 (perfect recall)
 *
 * Reference implementation from the README:
 *   if grade >= 3:
 *     if repetition == 0: interval = 1
 *     elif repetition == 1: interval = 6
 *     else: interval = round(interval * efactor)
 *     repetition += 1
 *   else:
 *     repetition = 0
 *     interval = 1
 *
 *   efactor = max(1.3, efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)))
 *   next_review_at = today + interval days
 */

export interface SM2State {
  interval: number;
  repetition: number;
  efactor: number;
}

export interface SM2Result extends SM2State {
  nextReviewAt: string; // ISO date string (YYYY-MM-DD)
}

export function computeSM2(
  current: SM2State,
  grade: number
): SM2Result {
  let { interval, repetition, efactor } = current;

  if (grade >= 3) {
    // Successful recall
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;
  } else {
    // Failed recall — reset
    repetition = 0;
    interval = 1;
  }

  // Update ease factor
  efactor = Math.max(
    1.3,
    efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  // Round efactor to 2 decimal places
  efactor = Math.round(efactor * 100) / 100;

  // Compute next review date
  const today = new Date();
  today.setDate(today.getDate() + interval);
  const nextReviewAt = today.toISOString().split("T")[0];

  return { interval, repetition, efactor, nextReviewAt };
}
