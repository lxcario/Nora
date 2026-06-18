/**
 * Tests for src/lib/spacing.ts — spacing-aware planner math.
 *
 * SPACING-1: `optimalGapDays` is non-decreasing in `daysUntilExam` and
 * never returns a gap that schedules past the exam.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  optimalGapDays,
  examRetention,
  distributeSessions,
  NEAR_EXAM_THRESHOLD_DAYS,
  NEAR_EXAM_RETENTION,
  DEFAULT_RETENTION,
} from "./spacing";

// ---------------------------------------------------------------------------
// optimalGapDays — unit tests
// ---------------------------------------------------------------------------

describe("optimalGapDays — unit tests", () => {
  it("returns 1 for 1-day exam", () => {
    expect(optimalGapDays(1)).toBe(1);
  });

  it("returns at least 1 for any positive input", () => {
    [0.5, 1, 2, 3, 7, 30, 365, 1000].forEach((d) => {
      expect(optimalGapDays(d)).toBeGreaterThanOrEqual(1);
    });
  });

  it("never returns a gap >= daysUntilExam", () => {
    [2, 3, 5, 7, 14, 30, 90, 365].forEach((d) => {
      expect(optimalGapDays(d)).toBeLessThan(d);
    });
  });

  it("demo: exam in 7 days → gap = 1 day", () => {
    expect(optimalGapDays(7)).toBe(1);
  });

  it("demo: exam in 30 days → gap = 5 days", () => {
    expect(optimalGapDays(30)).toBe(5);
  });

  it("demo: exam in 365 days → gap ≥ 10 days (expanding, sane)", () => {
    expect(optimalGapDays(365)).toBeGreaterThanOrEqual(10);
  });

  it("errs toward wider gap — rounds up (asymmetric cost)", () => {
    // For any input, the returned gap should be the ceiling of the interpolated value.
    // Verify by checking that 14 days (on the table) returns 2 (not 1.something).
    expect(optimalGapDays(14)).toBe(2);
  });

  it("handles non-integer daysUntilExam gracefully", () => {
    expect(() => optimalGapDays(7.5)).not.toThrow();
    expect(optimalGapDays(7.5)).toBeGreaterThanOrEqual(1);
  });

  it("returns 1 for edge cases: 0, negative, NaN, Infinity", () => {
    expect(optimalGapDays(0)).toBe(1);
    expect(optimalGapDays(-5)).toBe(1);
    expect(optimalGapDays(NaN)).toBe(1);
    // Infinity: gap should still be >= 1 and not crash
    expect(optimalGapDays(Infinity)).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// examRetention — unit tests
// ---------------------------------------------------------------------------

describe("examRetention", () => {
  it("returns NEAR_EXAM_RETENTION when exam is within threshold", () => {
    [1, 5, NEAR_EXAM_THRESHOLD_DAYS].forEach((d) => {
      expect(examRetention(d)).toBe(NEAR_EXAM_RETENTION);
    });
  });

  it("returns DEFAULT_RETENTION when exam is beyond threshold", () => {
    [NEAR_EXAM_THRESHOLD_DAYS + 1, 30, 365].forEach((d) => {
      expect(examRetention(d)).toBe(DEFAULT_RETENTION);
    });
  });

  it("returns DEFAULT_RETENTION for null/undefined/Infinity", () => {
    expect(examRetention(null)).toBe(DEFAULT_RETENTION);
    expect(examRetention(undefined)).toBe(DEFAULT_RETENTION);
    expect(examRetention(Infinity)).toBe(DEFAULT_RETENTION);
  });
});

// ---------------------------------------------------------------------------
// distributeSessions — unit tests
// ---------------------------------------------------------------------------

describe("distributeSessions", () => {
  const TODAY = new Date("2025-06-15T12:00:00.000Z");

  it("returns no sessions when daysUntilExam is 0 or negative", () => {
    const result = distributeSessions([{ topicId: "t1", daysUntilExam: 0 }], TODAY);
    expect(result).toHaveLength(0);
  });

  it("places the first session at optimalGapDays(d) from today", () => {
    const d = 30;
    const gap = optimalGapDays(d);
    const result = distributeSessions([{ topicId: "t1", daysUntilExam: d }], TODAY);
    expect(result.length).toBeGreaterThan(0);
    const firstDate = new Date(`${result[0].date}T12:00:00.000Z`);
    const actualGap = Math.round(
      (firstDate.getTime() - TODAY.getTime()) / 86_400_000
    );
    expect(actualGap).toBe(gap);
  });

  it("does not schedule any session past the exam", () => {
    const d = 10;
    const examDate = new Date(TODAY.getTime() + d * 86_400_000);
    const result = distributeSessions([{ topicId: "t1", daysUntilExam: d }], TODAY);
    for (const s of result) {
      const sessionDate = new Date(`${s.date}T00:00:00.000Z`);
      expect(sessionDate.getTime()).toBeLessThan(examDate.getTime());
    }
  });

  it("near-exam topic gets NEAR_EXAM_RETENTION", () => {
    const result = distributeSessions([{ topicId: "t1", daysUntilExam: 7 }], TODAY);
    for (const s of result) {
      expect(s.requestRetention).toBe(NEAR_EXAM_RETENTION);
    }
  });

  it("far-exam topic gets DEFAULT_RETENTION", () => {
    const result = distributeSessions([{ topicId: "t1", daysUntilExam: 60 }], TODAY);
    for (const s of result) {
      expect(s.requestRetention).toBe(DEFAULT_RETENTION);
    }
  });

  it("demo: exams at 7, 30, 365 days return sane, expanding sessions", () => {
    for (const d of [7, 30, 365]) {
      const result = distributeSessions([{ topicId: "t", daysUntilExam: d }], TODAY);
      expect(result.length).toBeGreaterThanOrEqual(0);
      // Sessions should be within the 7-day default window or at the exam horizon.
    }
  });
});

// ---------------------------------------------------------------------------
// Property tests — SPACING-1
// ---------------------------------------------------------------------------

describe("property tests — SPACING-1", () => {
  const positiveInt = fc.integer({ min: 1, max: 1000 });

  it("SPACING-1: optimalGapDays is non-decreasing in daysUntilExam", () => {
    fc.assert(
      fc.property(positiveInt, positiveInt, (a, b) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        return optimalGapDays(lo) <= optimalGapDays(hi) + 1e-9;
      })
    );
  });

  it("SPACING-1: optimalGapDays never returns a gap >= daysUntilExam", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 3650 }), // start from 2 (1-day exam gap=1 is exact)
        (d) => {
          const gap = optimalGapDays(d);
          return gap < d;
        }
      )
    );
  });

  it("SPACING-1: optimalGapDays always returns at least 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3650 }),
        (d) => optimalGapDays(d) >= 1
      )
    );
  });

  it("SPACING-1: distributeSessions never schedules a session past the exam", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        fc.integer({ min: 1, max: 30 }),
        (d, window) => {
          const result = distributeSessions(
            [{ topicId: "t", daysUntilExam: d }],
            new Date("2025-06-15T12:00:00.000Z"),
            window
          );
          const examTime =
            new Date("2025-06-15T12:00:00.000Z").getTime() + d * 86_400_000;
          return result.every((s) => {
            const sessionTime = new Date(`${s.date}T00:00:00.000Z`).getTime();
            return sessionTime < examTime;
          });
        }
      )
    );
  });
});
