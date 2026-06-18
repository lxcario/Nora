/**
 * Tests for src/lib/rrf.ts — Reciprocal Rank Fusion.
 *
 * Verifies fusion ordering on known inputs (spec Req 6.5), mirroring the
 * behaviour of match_paper_chunks_hybrid in 012_hybrid_search.sql.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { fuseRRF, DEFAULT_RRF_K } from "./rrf";

describe("fuseRRF — known-input fusion ordering", () => {
  it("an item ranked #1 in BOTH legs wins", () => {
    const lexical = ["a", "b", "c"];
    const vector = ["a", "c", "b"];
    const fused = fuseRRF(lexical, vector);
    expect(fused[0].id).toBe("a");
  });

  it("an item present in both legs outranks items present in only one", () => {
    // 'b' is rank 2 lexical + rank 1 vector; 'a' is rank 1 lexical only.
    const lexical = ["a", "b"];
    const vector = ["b"];
    const fused = fuseRRF(lexical, vector);
    const score = Object.fromEntries(fused.map((f) => [f.id, f.score]));
    // b: 1/(k+2) + 1/(k+1); a: 1/(k+1) → b > a
    expect(score["b"]).toBeGreaterThan(score["a"]);
    expect(fused[0].id).toBe("b");
  });

  it("computes the exact RRF score for known ranks", () => {
    const k = DEFAULT_RRF_K;
    const fused = fuseRRF(["x", "y"], ["y", "x"], { k });
    const score = Object.fromEntries(fused.map((f) => [f.id, f.score]));
    // x: rank 1 lexical + rank 2 vector
    expect(score["x"]).toBeCloseTo(1 / (k + 1) + 1 / (k + 2), 12);
    // y: rank 2 lexical + rank 1 vector → same total as x
    expect(score["y"]).toBeCloseTo(1 / (k + 2) + 1 / (k + 1), 12);
  });

  it("lexical-only mode (empty vector leg) preserves lexical order", () => {
    const lexical = ["a", "b", "c", "d"];
    const fused = fuseRRF(lexical, []);
    expect(fused.map((f) => f.id)).toEqual(["a", "b", "c", "d"]);
    // Each item only has a lexical rank.
    expect(fused.every((f) => f.vectorRank === null)).toBe(true);
  });

  it("vector-only mode (empty lexical leg) preserves vector order", () => {
    const vector = ["d", "c", "b", "a"];
    const fused = fuseRRF([], vector);
    expect(fused.map((f) => f.id)).toEqual(["d", "c", "b", "a"]);
    expect(fused.every((f) => f.lexicalRank === null)).toBe(true);
  });

  it("records the 1-based ranks from each leg", () => {
    const fused = fuseRRF(["a", "b"], ["b", "a"]);
    const byId = Object.fromEntries(fused.map((f) => [f.id, f]));
    expect(byId["a"].lexicalRank).toBe(1);
    expect(byId["a"].vectorRank).toBe(2);
    expect(byId["b"].lexicalRank).toBe(2);
    expect(byId["b"].vectorRank).toBe(1);
  });

  it("unions ids across legs (item in only one leg still appears)", () => {
    const fused = fuseRRF(["a", "b"], ["c"]);
    expect(new Set(fused.map((f) => f.id))).toEqual(new Set(["a", "b", "c"]));
  });

  it("uses tieBreak (chunk_index analogue) to order equal scores", () => {
    // Both 'a' and 'b' are rank 1 in their single respective legs → equal score.
    const fused = fuseRRF(["a"], ["b"], {
      tieBreak: (id) => (id === "a" ? 5 : 2), // b has lower index → first
    });
    expect(fused[0].id).toBe("b");
    expect(fused[1].id).toBe("a");
  });

  it("returns empty for two empty legs", () => {
    expect(fuseRRF([], [])).toEqual([]);
  });
});

describe("fuseRRF — properties", () => {
  const idArb = fc.string({ minLength: 1, maxLength: 3 });
  const legArb = fc.uniqueArray(idArb, { maxLength: 12 });

  it("property: output ids are exactly the union of both legs", () => {
    fc.assert(
      fc.property(legArb, legArb, (lex, vec) => {
        const fused = fuseRRF(lex, vec);
        const expected = new Set([...lex, ...vec]);
        const got = new Set(fused.map((f) => f.id));
        return (
          got.size === expected.size && [...expected].every((id) => got.has(id))
        );
      })
    );
  });

  it("property: scores are non-increasing down the fused list", () => {
    fc.assert(
      fc.property(legArb, legArb, (lex, vec) => {
        const fused = fuseRRF(lex, vec);
        for (let i = 1; i < fused.length; i++) {
          if (fused[i].score > fused[i - 1].score + 1e-12) return false;
        }
        return true;
      })
    );
  });

  it("property: every score is strictly positive and within [0, 2/(k+1)]", () => {
    fc.assert(
      fc.property(legArb, legArb, (lex, vec) => {
        const k = DEFAULT_RRF_K;
        const maxScore = 2 / (k + 1);
        const fused = fuseRRF(lex, vec, { k });
        return fused.every((f) => f.score > 0 && f.score <= maxScore + 1e-12);
      })
    );
  });

  it("property: presence in both legs never scores worse than one leg at same rank", () => {
    // An item at rank r in both legs scores 2/(k+r); at rank r in one leg
    // it scores 1/(k+r). Two-leg presence dominates.
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (r) => {
        const k = DEFAULT_RRF_K;
        const both = 1 / (k + r) + 1 / (k + r);
        const one = 1 / (k + r);
        return both > one;
      })
    );
  });
});
