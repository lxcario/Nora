/**
 * RAG-1 citation validation tests.
 *
 * Spec property RAG-1: "Every emitted citation index resolves to a retrieved chunk."
 *
 * These tests verify the `validateCitations` logic by exercising it through
 * the observable shape of the final citation output — no DB or LLM required.
 * The pure validation logic is extracted into a testable helper below that
 * mirrors the production implementation exactly.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Mirror of the production validateCitations implementation (src/app/…/rag.ts).
// Kept here as a pure function so the test doesn't need to import a server
// action (which would pull in Next.js server-only modules).
// ---------------------------------------------------------------------------

interface Citation {
  paperId: string;
  paperTitle: string;
  sectionHeading: string;
  chunkIndex: number;
  snippet: string;
}

interface RetrievedChunk {
  paperId: string;
  paperTitle: string;
  chunkIndex: number;
  content: string;
  sectionHeading: string;
  similarity: number;
}

function validateCitations(
  citations: Citation[],
  chunks: RetrievedChunk[]
): Citation[] {
  const byPaper = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const list = byPaper.get(chunk.paperId) ?? [];
    list.push(chunk);
    byPaper.set(chunk.paperId, list);
  }

  const validated: Citation[] = [];
  for (const cite of citations) {
    const paperChunks = byPaper.get(cite.paperId);
    if (!paperChunks || paperChunks.length === 0) continue;

    const match =
      cite.sectionHeading
        ? (paperChunks.find(
            (c) =>
              c.sectionHeading &&
              c.sectionHeading.toLowerCase() ===
                cite.sectionHeading.toLowerCase()
          ) ?? paperChunks[0])
        : paperChunks[0];

    validated.push({
      ...cite,
      chunkIndex: match.chunkIndex,
      sectionHeading: match.sectionHeading || cite.sectionHeading,
    });
  }
  return validated;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChunk(
  paperId: string,
  chunkIndex: number,
  sectionHeading = "Intro"
): RetrievedChunk {
  return {
    paperId,
    paperTitle: `Paper-${paperId}`,
    chunkIndex,
    content: `Content of chunk ${chunkIndex} in paper ${paperId}`,
    sectionHeading,
    similarity: 0.9,
  };
}

function makeCitation(
  paperId: string,
  chunkIndex = 0,
  sectionHeading = "Intro"
): Citation {
  return {
    paperId,
    paperTitle: `Paper-${paperId}`,
    chunkIndex,
    sectionHeading,
    snippet: "A quote from the paper.",
  };
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe("validateCitations — unit tests (RAG-1)", () => {
  it("drops a citation whose paperId is not in the retrieved chunks", () => {
    const chunks = [makeChunk("paper-A", 3)];
    const citations = [makeCitation("paper-A"), makeCitation("paper-GHOST")];
    const result = validateCitations(citations, chunks);
    expect(result).toHaveLength(1);
    expect(result[0].paperId).toBe("paper-A");
  });

  it("replaces chunkIndex=0 with the real chunk index from the retrieved set", () => {
    const chunks = [makeChunk("paper-A", 5, "Methods")];
    const citations = [makeCitation("paper-A", 0, "Methods")]; // LLM gave chunkIndex=0
    const result = validateCitations(citations, chunks);
    expect(result[0].chunkIndex).toBe(5); // resolved to real index
  });

  it("uses sectionHeading to pick the correct chunk when multiple exist", () => {
    const chunks = [
      makeChunk("paper-A", 1, "Introduction"),
      makeChunk("paper-A", 4, "Results"),
      makeChunk("paper-A", 7, "Discussion"),
    ];
    const cite = makeCitation("paper-A", 0, "Results");
    const result = validateCitations([cite], chunks);
    expect(result[0].chunkIndex).toBe(4);
    expect(result[0].sectionHeading).toBe("Results");
  });

  it("falls back to first chunk when no sectionHeading matches", () => {
    const chunks = [makeChunk("paper-A", 2, "Intro"), makeChunk("paper-A", 5, "Methods")];
    const cite = makeCitation("paper-A", 0, "Conclusion"); // section not in chunks
    const result = validateCitations([cite], chunks);
    expect(result[0].chunkIndex).toBe(2); // first chunk
  });

  it("returns empty when all citations are unresolvable", () => {
    const chunks = [makeChunk("paper-A", 1)];
    const citations = [makeCitation("ghost-1"), makeCitation("ghost-2")];
    expect(validateCitations(citations, chunks)).toHaveLength(0);
  });

  it("returns empty when both inputs are empty", () => {
    expect(validateCitations([], [])).toHaveLength(0);
  });

  it("keeps all valid citations when all resolve", () => {
    const chunks = [makeChunk("p1", 3), makeChunk("p2", 7)];
    const citations = [makeCitation("p1", 0), makeCitation("p2", 0)];
    const result = validateCitations(citations, chunks);
    expect(result).toHaveLength(2);
  });

  it("preserves non-chunkIndex fields from the original citation", () => {
    const chunks = [makeChunk("paper-A", 9, "Intro")];
    const cite: Citation = {
      paperId: "paper-A",
      paperTitle: "Some Title",
      sectionHeading: "Intro",
      chunkIndex: 0,
      snippet: "An important quote.",
    };
    const result = validateCitations([cite], chunks);
    expect(result[0].paperId).toBe("paper-A");
    expect(result[0].paperTitle).toBe("Some Title");
    expect(result[0].snippet).toBe("An important quote.");
  });
});

// ---------------------------------------------------------------------------
// Property tests — RAG-1
// ---------------------------------------------------------------------------

describe("property tests — RAG-1", () => {
  const paperIdArb = fc.string({ minLength: 1, maxLength: 6 });
  const chunkIndexArb = fc.integer({ min: 0, max: 100 });
  const sectionArb = fc.string({ minLength: 0, maxLength: 20 });

  const chunkArb = fc.record({
    paperId: paperIdArb,
    chunkIndex: chunkIndexArb,
    sectionHeading: sectionArb,
  }).map(({ paperId, chunkIndex, sectionHeading }) =>
    makeChunk(paperId, chunkIndex, sectionHeading)
  );

  const citationArb = fc.record({
    paperId: paperIdArb,
    chunkIndex: chunkIndexArb,
    sectionHeading: sectionArb,
  }).map(({ paperId, chunkIndex, sectionHeading }) =>
    makeCitation(paperId, chunkIndex, sectionHeading)
  );

  it("RAG-1: every validated citation's paperId appears in the retrieved chunks", () => {
    fc.assert(
      fc.property(
        fc.array(citationArb, { maxLength: 15 }),
        fc.array(chunkArb, { maxLength: 15 }),
        (citations, chunks) => {
          const result = validateCitations(citations, chunks);
          const paperIds = new Set(chunks.map((c) => c.paperId));
          return result.every((cite) => paperIds.has(cite.paperId));
        }
      )
    );
  });

  it("RAG-1: every validated chunkIndex matches an actual retrieved chunk", () => {
    fc.assert(
      fc.property(
        fc.array(citationArb, { maxLength: 15 }),
        fc.array(chunkArb, { maxLength: 15 }),
        (citations, chunks) => {
          const result = validateCitations(citations, chunks);
          // Build a set of (paperId, chunkIndex) pairs from the retrieved chunks.
          const validPairs = new Set(
            chunks.map((c) => `${c.paperId}:${c.chunkIndex}`)
          );
          return result.every((cite) =>
            validPairs.has(`${cite.paperId}:${cite.chunkIndex}`)
          );
        }
      )
    );
  });

  it("RAG-1: number of validated citations never exceeds number of input citations", () => {
    fc.assert(
      fc.property(
        fc.array(citationArb, { maxLength: 15 }),
        fc.array(chunkArb, { maxLength: 15 }),
        (citations, chunks) => {
          const result = validateCitations(citations, chunks);
          return result.length <= citations.length;
        }
      )
    );
  });

  it("RAG-1: no validated citations are produced when chunk list is empty", () => {
    fc.assert(
      fc.property(fc.array(citationArb, { maxLength: 10 }), (citations) => {
        return validateCitations(citations, []).length === 0;
      })
    );
  });
});
