/**
 * RESEARCH-1 tests for validateResearchCitations.
 *
 * Spec property RESEARCH-1:
 *   "Answer contains no citation marker that lacks a backing source record;
 *    'insufficient' branch yields zero fabricated sources."
 *
 * The validateResearchCitations function is a pure utility that can be tested
 * without any database or LLM dependency.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateResearchCitations } from "@/lib/research-citations";

// ---------------------------------------------------------------------------
// Unit tests — known inputs
// ---------------------------------------------------------------------------

describe("validateResearchCitations — unit tests (RESEARCH-1)", () => {
  it("preserves valid in-range markers", () => {
    const answer = "Spaced repetition [1] improves retention [2].";
    expect(validateResearchCitations(answer, 3)).toBe(
      "Spaced repetition [1] improves retention [2]."
    );
  });

  it("strips out-of-range markers (N > sourceCount)", () => {
    const answer = "This claim [4] is unsupported.";
    expect(validateResearchCitations(answer, 3)).toBe(
      "This claim  is unsupported."
    );
  });

  it("strips marker [0] (1-based indexing)", () => {
    const answer = "Invalid index [0] here.";
    expect(validateResearchCitations(answer, 5)).toBe(
      "Invalid index  here."
    );
  });

  it("strips all markers when sourceCount is 0", () => {
    const answer = "Nothing [1] here [2] is valid [3].";
    expect(validateResearchCitations(answer, 0)).toBe(
      "Nothing  here  is valid ."
    );
  });

  it("handles an answer with no citation markers", () => {
    const answer = "A paragraph without any citations.";
    expect(validateResearchCitations(answer, 5)).toBe(answer);
  });

  it("handles empty answer", () => {
    expect(validateResearchCitations("", 5)).toBe("");
  });

  it("handles multiple markers on the same number", () => {
    const answer = "Cited [2] again [2] and invalid [9].";
    expect(validateResearchCitations(answer, 3)).toBe(
      "Cited [2] again [2] and invalid ."
    );
  });

  it("keeps marker exactly at the boundary (N === sourceCount)", () => {
    const answer = "Edge [5] case.";
    expect(validateResearchCitations(answer, 5)).toBe("Edge [5] case.");
  });

  it("strips marker one above the boundary (N === sourceCount + 1)", () => {
    const answer = "Edge [6] case.";
    expect(validateResearchCitations(answer, 5)).toBe("Edge  case.");
  });

  it("preserves surrounding text when stripping a marker", () => {
    const answer = "Good [1] Bad [99] Good [2].";
    const result = validateResearchCitations(answer, 3);
    expect(result).toContain("[1]");
    expect(result).toContain("[2]");
    expect(result).not.toContain("[99]");
  });
});

// ---------------------------------------------------------------------------
// Property tests — RESEARCH-1
// ---------------------------------------------------------------------------

describe("property tests — RESEARCH-1", () => {
  /**
   * Generates an answer string with embedded [N] markers (some in range,
   * some out of range) for a given sourceCount.
   */
  const answerWithCitations = fc
    .tuple(
      fc.integer({ min: 0, max: 10 }), // sourceCount
      fc.array(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 20 }) // citation number (some will be out of range)
        ),
        { minLength: 0, maxLength: 8 }
      )
    )
    .map(([sourceCount, parts]) => ({
      sourceCount,
      answer: parts.map(([text, n]) => `${text} [${n}]`).join(" ") + " end.",
    }));

  it("RESEARCH-1: no citation marker [N] with N > sourceCount survives validation", () => {
    fc.assert(
      fc.property(answerWithCitations, ({ answer, sourceCount }) => {
        const validated = validateResearchCitations(answer, sourceCount);
        const remaining = [...validated.matchAll(/\[(\d+)\]/g)].map((m) =>
          parseInt(m[1], 10)
        );
        return remaining.every((n) => n >= 1 && n <= sourceCount);
      })
    );
  });

  it("RESEARCH-1: no citation marker [0] survives validation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.string({ minLength: 5, maxLength: 100 }),
        (sourceCount, prefix) => {
          const answer = `${prefix} [0] test done.`;
          const validated = validateResearchCitations(answer, sourceCount);
          // [0] is always out of range (1-based) and must be stripped.
          return !validated.includes("[0]");
        }
      )
    );
  });

  it("RESEARCH-1: valid markers are never stripped", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 15 }), // sourceCount
        fc.integer({ min: 1, max: 15 }), // citation number within range
        fc.string({ minLength: 1, maxLength: 30 }),
        (sourceCount, n, text) => {
          fc.pre(n <= sourceCount);
          const answer = `${text} [${n}] end.`;
          const validated = validateResearchCitations(answer, sourceCount);
          return validated.includes(`[${n}]`);
        }
      )
    );
  });

  it("RESEARCH-1: validation is idempotent (running twice gives same result)", () => {
    fc.assert(
      fc.property(answerWithCitations, ({ answer, sourceCount }) => {
        const once = validateResearchCitations(answer, sourceCount);
        const twice = validateResearchCitations(once, sourceCount);
        return once === twice;
      })
    );
  });
});
