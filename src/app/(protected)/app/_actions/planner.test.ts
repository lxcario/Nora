/**
 * Tests for the forward-fill helper in planner.ts.
 *
 * Covers spec Req 7.4: missed sessions reschedule forward intelligently
 * without compressing all of them onto the same next day.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { nextFreeDate } from "@/lib/planner-scheduling";

describe("nextFreeDate", () => {
  it("returns the next day when nothing is occupied", () => {
    expect(nextFreeDate("2025-06-15", new Set())).toBe("2025-06-16");
  });

  it("skips over occupied dates to find the first free one", () => {
    const occupied = new Set(["2025-06-16", "2025-06-17"]);
    expect(nextFreeDate("2025-06-15", occupied)).toBe("2025-06-18");
  });

  it("returns null when no free slot exists within maxDays", () => {
    const occupied = new Set(
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date("2025-06-16T00:00:00Z");
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      })
    );
    expect(nextFreeDate("2025-06-15", occupied, 14)).toBeNull();
  });

  it("the original date itself is not considered (looks strictly forward)", () => {
    // "2025-06-15" is the afterDate — the function should start from 2025-06-16.
    const occupied = new Set(["2025-06-15"]);
    expect(nextFreeDate("2025-06-15", new Set())).toBe("2025-06-16");
  });

  it("handles end-of-month boundary correctly", () => {
    const result = nextFreeDate("2025-01-31", new Set());
    expect(result).toBe("2025-02-01");
  });

  it("handles end-of-year boundary correctly", () => {
    const result = nextFreeDate("2025-12-31", new Set());
    expect(result).toBe("2026-01-01");
  });

  it("property: result is always strictly after afterDate", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }).map((n) => {
          const d = new Date("2025-06-15T00:00:00Z");
          d.setDate(d.getDate() + n);
          return d.toISOString().split("T")[0];
        }),
        (dateStr) => {
          const result = nextFreeDate(dateStr, new Set());
          if (result === null) return true;
          return result > dateStr;
        }
      )
    );
  });

  it("property: result is never in the occupied set", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 7 }).map((n) => {
            const d = new Date("2025-06-16T00:00:00Z");
            d.setDate(d.getDate() + n);
            return d.toISOString().split("T")[0];
          }),
          { maxLength: 5 }
        ),
        (occupied) => {
          const occupiedSet = new Set(occupied);
          const result = nextFreeDate("2025-06-15", occupiedSet);
          if (result === null) return true;
          return !occupiedSet.has(result);
        }
      )
    );
  });
});
