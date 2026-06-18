/**
 * Tests for src/lib/due.ts
 *
 * Covers DUE-1 from the spec:
 *   - isDueToday is timezone-consistent: a card due at 23:59 user-local
 *     is due that day regardless of what the server's local clock shows.
 *   - Due instants in the past are always due today.
 *   - A due instant at 00:00:00 of the NEXT local day is NOT due today.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { endOfUserLocalDay, isDueToday } from "./due";

// ---------------------------------------------------------------------------
// Fixed reference timestamps for deterministic unit tests
// ---------------------------------------------------------------------------

// All times chosen so they are well within a single calendar day in every TZ.
const UTC_NOON_JUNE_15 = new Date("2025-06-15T12:00:00.000Z");
const UTC_EARLY_JUNE_15 = new Date("2025-06-15T02:00:00.000Z");

// ---------------------------------------------------------------------------
// endOfUserLocalDay — unit tests
// ---------------------------------------------------------------------------

describe("endOfUserLocalDay — UTC timezone", () => {
  it("returns 23:59:59.999 UTC on the same calendar date", () => {
    const end = endOfUserLocalDay(UTC_NOON_JUNE_15, "UTC");
    expect(end.toISOString()).toBe("2025-06-15T23:59:59.999Z");
  });

  it("works when now is already late in the UTC day", () => {
    const lateUtc = new Date("2025-06-15T23:00:00.000Z");
    const end = endOfUserLocalDay(lateUtc, "UTC");
    expect(end.toISOString()).toBe("2025-06-15T23:59:59.999Z");
  });

  it("works when now is at the very start of a UTC day", () => {
    const midnightUtc = new Date("2025-06-15T00:00:00.000Z");
    const end = endOfUserLocalDay(midnightUtc, "UTC");
    expect(end.toISOString()).toBe("2025-06-15T23:59:59.999Z");
  });
});

describe("endOfUserLocalDay — timezone behind UTC (America/New_York, EDT = UTC−4)", () => {
  // UTC 02:00 June 15 = June 14 22:00 EDT → local date is June 14
  it("resolves to end of June 14 local when UTC is already June 15 early morning", () => {
    const end = endOfUserLocalDay(UTC_EARLY_JUNE_15, "America/New_York");
    // June 14 23:59:59.999 EDT = June 15 03:59:59.999Z
    expect(end.toISOString()).toBe("2025-06-15T03:59:59.999Z");
  });

  // UTC 12:00 June 15 = 08:00 EDT → local date is June 15
  it("resolves to end of June 15 local when UTC noon June 15", () => {
    const end = endOfUserLocalDay(UTC_NOON_JUNE_15, "America/New_York");
    // June 15 23:59:59.999 EDT = June 16 03:59:59.999Z
    expect(end.toISOString()).toBe("2025-06-16T03:59:59.999Z");
  });
});

describe("endOfUserLocalDay — timezone ahead of UTC (Asia/Tokyo, JST = UTC+9)", () => {
  // UTC 12:00 June 15 = June 15 21:00 JST → local date is June 15
  it("resolves to end of June 15 local when UTC noon June 15", () => {
    const end = endOfUserLocalDay(UTC_NOON_JUNE_15, "Asia/Tokyo");
    // June 15 23:59:59.999 JST = June 15 14:59:59.999Z
    expect(end.toISOString()).toBe("2025-06-15T14:59:59.999Z");
  });

  // UTC 02:00 June 15 = June 15 11:00 JST → local date is June 15
  it("resolves to end of June 15 local when UTC early morning June 15", () => {
    const end = endOfUserLocalDay(UTC_EARLY_JUNE_15, "Asia/Tokyo");
    expect(end.toISOString()).toBe("2025-06-15T14:59:59.999Z");
  });
});

describe("endOfUserLocalDay — invalid/empty timezone falls back to UTC", () => {
  it("handles empty string", () => {
    const end = endOfUserLocalDay(UTC_NOON_JUNE_15, "");
    expect(end.toISOString()).toBe("2025-06-15T23:59:59.999Z");
  });

  it("handles a nonsense string", () => {
    const end = endOfUserLocalDay(UTC_NOON_JUNE_15, "Not/ATimezone");
    expect(end.toISOString()).toBe("2025-06-15T23:59:59.999Z");
  });
});

// ---------------------------------------------------------------------------
// isDueToday — unit tests
// ---------------------------------------------------------------------------

describe("isDueToday — UTC timezone", () => {
  const now = UTC_NOON_JUNE_15;
  const tz = "UTC";

  it("a card due right now is due today", () => {
    expect(isDueToday(now, now, tz)).toBe(true);
  });

  it("a card due in the past is due today", () => {
    const past = new Date("2025-01-01T00:00:00.000Z");
    expect(isDueToday(past, now, tz)).toBe(true);
  });

  it("a card due at 23:59:59.999Z today is due today", () => {
    const endOfDay = new Date("2025-06-15T23:59:59.999Z");
    expect(isDueToday(endOfDay, now, tz)).toBe(true);
  });

  it("a card due at midnight UTC is NOT due today (it's tomorrow)", () => {
    const midnight = new Date("2025-06-16T00:00:00.000Z");
    expect(isDueToday(midnight, now, tz)).toBe(false);
  });

  it("a card due far in the future is not due today", () => {
    const future = new Date("2025-12-31T12:00:00.000Z");
    expect(isDueToday(future, now, tz)).toBe(false);
  });
});

describe("isDueToday — DUE-1 core: card at 23:59 user-local is due today", () => {
  // New York (EDT, UTC−4) — June 15 in NYC.
  // UTC noon June 15 → NYC is 08:00 June 15.
  it("NYC: card due at 23:59:59.999 local (= 2025-06-16T03:59:59.999Z) IS due today", () => {
    const nyNow = UTC_NOON_JUNE_15; // 08:00 June 15 EDT
    const dueAtLocalMidnight = new Date("2025-06-16T03:59:59.999Z"); // 23:59:59 EDT
    expect(isDueToday(dueAtLocalMidnight, nyNow, "America/New_York")).toBe(true);
  });

  it("NYC: card due 1 ms after local midnight (= 2025-06-16T04:00:00.000Z) is NOT due today", () => {
    const nyNow = UTC_NOON_JUNE_15;
    const dueNextDay = new Date("2025-06-16T04:00:00.000Z"); // 00:00:00 EDT next day
    expect(isDueToday(dueNextDay, nyNow, "America/New_York")).toBe(false);
  });

  // Tokyo (JST, UTC+9) — June 15 in Tokyo.
  // UTC noon June 15 → Tokyo is 21:00 June 15.
  it("Tokyo: card due at 23:59:59.999 local (= 2025-06-15T14:59:59.999Z) IS due today", () => {
    const tokyoNow = UTC_NOON_JUNE_15; // 21:00 June 15 JST
    const dueAtLocalMidnight = new Date("2025-06-15T14:59:59.999Z"); // 23:59:59 JST
    expect(isDueToday(dueAtLocalMidnight, tokyoNow, "Asia/Tokyo")).toBe(true);
  });

  it("Tokyo: card due 1 ms after local midnight (= 2025-06-15T15:00:00.000Z) is NOT due today", () => {
    const tokyoNow = UTC_NOON_JUNE_15;
    const dueNextDay = new Date("2025-06-15T15:00:00.000Z"); // 00:00:00 JST next day
    expect(isDueToday(dueNextDay, tokyoNow, "Asia/Tokyo")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property tests — DUE-1
// ---------------------------------------------------------------------------

describe("property tests — DUE-1", () => {
  /**
   * Representative IANA timezone sample covering all offset classes:
   * ahead, behind, and equal to UTC, plus a DST-observing zone.
   */
  const TIMEZONES = [
    "UTC",
    "America/New_York",   // UTC−5/−4 (DST)
    "America/Los_Angeles", // UTC−8/−7 (DST)
    "Europe/London",       // UTC+0/+1 (DST)
    "Europe/Berlin",       // UTC+1/+2 (DST)
    "Asia/Tokyo",          // UTC+9, no DST
    "Asia/Kolkata",        // UTC+5:30, no DST
    "Pacific/Auckland",    // UTC+12/+13 (DST, extreme ahead)
    "Pacific/Honolulu",    // UTC−10, no DST (extreme behind)
  ] as const;

  const tzArb = fc.constantFrom(...TIMEZONES);

  // Arbitrary "now" spread over a 2-year range to exercise DST transitions.
  const nowArb = fc
    .integer({ min: 0, max: 730 })
    .map((offsetDays) => new Date(UTC_NOON_JUNE_15.getTime() + offsetDays * 86_400_000));

  it("DUE-1: endOfUserLocalDay always falls strictly after now", () => {
    fc.assert(
      fc.property(nowArb, tzArb, (now, tz) => {
        const end = endOfUserLocalDay(now, tz);
        return end.getTime() > now.getTime();
      })
    );
  });

  it("DUE-1: endOfUserLocalDay is never more than 24 h after now", () => {
    fc.assert(
      fc.property(nowArb, tzArb, (now, tz) => {
        const end = endOfUserLocalDay(now, tz);
        return end.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;
      })
    );
  });

  it("DUE-1: a card due exactly at endOfUserLocalDay IS due today", () => {
    fc.assert(
      fc.property(nowArb, tzArb, (now, tz) => {
        const end = endOfUserLocalDay(now, tz);
        return isDueToday(end, now, tz);
      })
    );
  });

  it("DUE-1: a card due 1 ms after endOfUserLocalDay is NOT due today", () => {
    fc.assert(
      fc.property(nowArb, tzArb, (now, tz) => {
        const end = endOfUserLocalDay(now, tz);
        const nextMs = new Date(end.getTime() + 1);
        return !isDueToday(nextMs, now, tz);
      })
    );
  });

  it("DUE-1: any card due in the past is always due today", () => {
    fc.assert(
      fc.property(
        nowArb,
        tzArb,
        fc.integer({ min: 1, max: 365 }).map((d) => d * 86_400_000),
        (now, tz, msBefore) => {
          const pastDue = new Date(now.getTime() - msBefore);
          return isDueToday(pastDue, now, tz);
        }
      )
    );
  });

  it("DUE-1: isDueToday(due, now, tz) iff due <= endOfUserLocalDay(now, tz)", () => {
    fc.assert(
      fc.property(
        nowArb,
        tzArb,
        // due can be anywhere from 30 days ago to 30 days in the future
        fc.integer({ min: -30, max: 30 }).map((d) => d * 86_400_000),
        (now, tz, offsetMs) => {
          const due = new Date(now.getTime() + offsetMs);
          const end = endOfUserLocalDay(now, tz);
          return isDueToday(due, now, tz) === due.getTime() <= end.getTime();
        }
      )
    );
  });
});
