/**
 * Tests for src/lib/streak.ts
 *
 * Covers the timezone-correct streak (Req 2):
 *   - A session done tonight in the user's local time counts toward *today's*
 *     streak, even when it lands on a different UTC calendar date.
 *   - The streak stays continuous across local-day changes and DST.
 *   - The streak doesn't reset before the user has studied today.
 *   - UTC default preserves the historical behaviour for callers that don't
 *     pass a timezone (e.g. analytics.ts).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeStreak } from "./streak";
import { startOfUserLocalDay, userLocalDateKey } from "./due";

// Build a set of `days` consecutive user-local date keys ending on the local
// day that contains `today`.
function consecutiveLocalKeys(today: Date, tz: string, days: number): Set<string> {
  const set = new Set<string>();
  const localNoon = (d: Date) =>
    new Date(startOfUserLocalDay(d, tz).getTime() + 12 * 60 * 60 * 1000);
  let cursor = localNoon(today);
  for (let i = 0; i < days; i++) {
    set.add(userLocalDateKey(cursor, tz));
    cursor = localNoon(new Date(cursor.getTime() - 24 * 60 * 60 * 1000));
  }
  return set;
}

// ---------------------------------------------------------------------------
// Basic behaviour (UTC default — matches historical analytics.ts usage)
// ---------------------------------------------------------------------------

describe("computeStreak — basic (UTC default)", () => {
  const today = new Date("2025-06-15T12:00:00.000Z");

  it("counts today when active", () => {
    expect(computeStreak(new Set(["2025-06-15"]), today)).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    expect(
      computeStreak(new Set(["2025-06-15", "2025-06-14", "2025-06-13"]), today)
    ).toBe(3);
  });

  it("does not reset when today has no activity yet (yesterday still counts)", () => {
    expect(computeStreak(new Set(["2025-06-14", "2025-06-13"]), today)).toBe(2);
  });

  it("a gap breaks the streak", () => {
    // today active, but the day before yesterday is missing
    expect(computeStreak(new Set(["2025-06-15", "2025-06-13"]), today)).toBe(1);
  });

  it("empty activity → streak 0", () => {
    expect(computeStreak(new Set<string>(), today)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Timezone correctness (the bug this arc fixes)
// ---------------------------------------------------------------------------

describe("computeStreak — timezone correctness", () => {
  it("NYC: a session done tonight local time counts toward today's streak", () => {
    // now = 2025-06-15 23:00 EDT ; the session was at 2025-06-15 20:00 EDT.
    // Both are 'today' (June 15) in New York, though the session's UTC date
    // has already rolled over to June 16.
    const now = new Date("2025-06-16T03:00:00.000Z");
    const sessionInstant = new Date("2025-06-16T00:00:00.000Z");
    const key = userLocalDateKey(sessionInstant, "America/New_York");
    expect(key).toBe("2025-06-15"); // local date, not the UTC June 16
    expect(computeStreak(new Set([key]), now, "America/New_York")).toBe(1);
  });

  it("Tokyo: five consecutive local days read as a streak of 5", () => {
    const now = new Date("2025-06-15T12:00:00.000Z"); // June 15 21:00 JST
    const dates = new Set([
      "2025-06-11",
      "2025-06-12",
      "2025-06-13",
      "2025-06-14",
      "2025-06-15",
    ]);
    expect(computeStreak(dates, now, "Asia/Tokyo")).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Property tests — DST-safe counting across timezones
// ---------------------------------------------------------------------------

describe("property — consecutive local days ending today", () => {
  const TIMEZONES = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Kolkata",
    "Pacific/Auckland",
    "Pacific/Honolulu",
  ] as const;

  const tzArb = fc.constantFrom(...TIMEZONES);
  const nowArb = fc
    .integer({ min: 0, max: 400 })
    .map((d) => new Date(Date.UTC(2025, 5, 15, 12, 0, 0) + d * 86_400_000));
  const daysArb = fc.integer({ min: 0, max: 30 });

  it("N consecutive active local days ending today → streak === N (any tz/DST)", () => {
    fc.assert(
      fc.property(nowArb, tzArb, daysArb, (now, tz, days) => {
        const dates = consecutiveLocalKeys(now, tz, days);
        return computeStreak(dates, now, tz) === days;
      })
    );
  });

  it("streak never exceeds the number of active local days", () => {
    fc.assert(
      fc.property(nowArb, tzArb, daysArb, (now, tz, days) => {
        const dates = consecutiveLocalKeys(now, tz, days);
        return computeStreak(dates, now, tz) <= dates.size;
      })
    );
  });
});
