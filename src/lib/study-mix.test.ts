/**
 * Tests for src/lib/study-mix.ts — evidence-based queue builder.
 *
 * MIX-1: No two verbal_vocabulary items are separated by a different-type item.
 * MIX-2: Queue length equals min(dueLoad, cap); weakest topics appear earlier.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildQueue, type QueueCardInput, type TopicMeta } from "./study-mix";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function card(id: string, topicId: string, difficulty: number | null = 5): QueueCardInput {
  return { id, topicId, difficulty };
}

function topic(
  id: string,
  subjectId: string,
  materialType: TopicMeta["materialType"],
  feynmanScore?: number | null
): TopicMeta {
  return { id, subjectId, materialType, feynmanScore };
}

// ---------------------------------------------------------------------------
// Unit tests — basic behaviour
// ---------------------------------------------------------------------------

describe("buildQueue — basic", () => {
  it("returns empty array for no due cards", () => {
    expect(buildQueue({ dueCards: [], topics: [] })).toEqual([]);
  });

  it("preserves all cards when cap is omitted (due-load sizing)", () => {
    const cards = [card("c1", "t1"), card("c2", "t2"), card("c3", "t1")];
    const topics = [
      topic("t1", "s1", "conceptual"),
      topic("t2", "s1", "conceptual"),
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    expect(queue).toHaveLength(3);
  });

  it("respects cap (truncates to min(dueLoad, cap))", () => {
    const cards = [card("c1", "t1"), card("c2", "t2"), card("c3", "t1")];
    const topics = [
      topic("t1", "s1", "conceptual"),
      topic("t2", "s1", "conceptual"),
    ];
    const queue = buildQueue({ dueCards: cards, topics, cap: 2 });
    expect(queue).toHaveLength(2);
  });

  it("cap larger than due load still returns all cards", () => {
    const cards = [card("c1", "t1"), card("c2", "t2")];
    const topics = [topic("t1", "s1", "conceptual"), topic("t2", "s1", "conceptual")];
    const queue = buildQueue({ dueCards: cards, topics, cap: 100 });
    expect(queue).toHaveLength(2);
  });

  it("returns no duplicate card ids", () => {
    const cards = [card("c1", "t1"), card("c2", "t2"), card("c3", "t1")];
    const topics = [
      topic("t1", "s1", "conceptual"),
      topic("t2", "s1", "conceptual"),
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    const ids = queue.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// MIX-1 unit tests — vocab blocking
// ---------------------------------------------------------------------------

describe("buildQueue — verbal_vocabulary blocking (MIX-1)", () => {
  it("all vocab cards appear in a contiguous block", () => {
    const cards = [
      card("math1", "math-topic", 8),
      card("vocab1", "vocab-topic", 5),
      card("math2", "math-topic", 6),
      card("vocab2", "vocab-topic", 7),
      card("concept1", "concept-topic", 4),
    ];
    const topics = [
      topic("math-topic", "s1", "procedural_math"),
      topic("vocab-topic", "s1", "verbal_vocabulary"),
      topic("concept-topic", "s1", "conceptual"),
    ];
    const queue = buildQueue({ dueCards: cards, topics });

    const vocabIndices = queue
      .map((c, i) => ({ i, isVocab: c.topicId === "vocab-topic" }))
      .filter((x) => x.isVocab)
      .map((x) => x.i);

    expect(vocabIndices).toHaveLength(2);
    // All vocab indices must be contiguous (max - min === count - 1).
    const min = Math.min(...vocabIndices);
    const max = Math.max(...vocabIndices);
    expect(max - min).toBe(vocabIndices.length - 1);
  });

  it("vocab block appears AFTER non-vocab cards", () => {
    const cards = [
      card("v1", "vt", 5),
      card("m1", "mt", 5),
    ];
    const topics = [
      topic("vt", "s1", "verbal_vocabulary"),
      topic("mt", "s1", "procedural_math"),
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    const vocabIdx = queue.findIndex((c) => c.topicId === "vt");
    const mathIdx = queue.findIndex((c) => c.topicId === "mt");
    expect(vocabIdx).toBeGreaterThan(mathIdx);
  });

  it("a queue with only vocab cards keeps all vocab contiguous", () => {
    const cards = [
      card("v1", "vt1", 3),
      card("v2", "vt2", 7),
      card("v3", "vt1", 9),
    ];
    const topics = [
      topic("vt1", "s1", "verbal_vocabulary"),
      topic("vt2", "s1", "verbal_vocabulary"),
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    // Every card is vocab → trivially contiguous but length should be preserved.
    expect(queue).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// MIX-2 unit tests — weakness ordering
// ---------------------------------------------------------------------------

describe("buildQueue — weakness ordering (MIX-2)", () => {
  it("harder cards (higher difficulty) appear earlier for a single topic", () => {
    const cards = [
      card("easy", "t1", 2),
      card("hard", "t1", 9),
      card("mid", "t1", 5),
    ];
    const topics = [topic("t1", "s1", "conceptual")];
    const queue = buildQueue({ dueCards: cards, topics });
    expect(queue[0].id).toBe("hard");
  });

  it("weakest topic (highest difficulty avg) appears earlier", () => {
    const cards = [
      card("easy1", "easy-topic", 2),
      card("easy2", "easy-topic", 3),
      card("hard1", "hard-topic", 9),
      card("hard2", "hard-topic", 8),
    ];
    const topics = [
      topic("easy-topic", "s1", "conceptual", 90), // strong feynman
      topic("hard-topic", "s1", "conceptual", 20), // weak feynman
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    // Hard-topic cards should appear before easy-topic cards.
    const firstHardIdx = queue.findIndex((c) => c.topicId === "hard-topic");
    const firstEasyIdx = queue.findIndex((c) => c.topicId === "easy-topic");
    expect(firstHardIdx).toBeLessThan(firstEasyIdx);
  });

  it("low Feynman score pushes a topic earlier even if FSRS difficulty is moderate", () => {
    const cards = [
      card("a", "high-feynman", 6),
      card("b", "low-feynman", 6),
    ];
    const topics = [
      topic("high-feynman", "s1", "conceptual", 85),
      topic("low-feynman", "s1", "conceptual", 15),
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    expect(queue[0].topicId).toBe("low-feynman");
  });
});

// ---------------------------------------------------------------------------
// Interleaving unit tests
// ---------------------------------------------------------------------------

describe("buildQueue — interleaving across topics", () => {
  it("round-robin interleaves two same-subject topics", () => {
    // 2 cards each in topics A and B, same subject.
    const cards = [
      card("a1", "tA", 5), card("a2", "tA", 5),
      card("b1", "tB", 5), card("b2", "tB", 5),
    ];
    const topics = [
      topic("tA", "s1", "conceptual"),
      topic("tB", "s1", "conceptual"),
    ];
    const queue = buildQueue({ dueCards: cards, topics });
    // Should alternate: one from tA, one from tB (or vice versa).
    expect(queue).toHaveLength(4);
    expect(queue[0].topicId).not.toBe(queue[1].topicId);
  });
});

// ---------------------------------------------------------------------------
// Property tests — MIX-1
// ---------------------------------------------------------------------------

describe("property tests — MIX-1", () => {
  const materialTypes: TopicMeta["materialType"][] = [
    "conceptual",
    "procedural_math",
    "visual_discrimination",
    "verbal_vocabulary",
  ];

  const topicArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 4 }),
    subjectId: fc.constantFrom("s1", "s2"),
    materialType: fc.constantFrom(...materialTypes),
    feynmanScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  });

  const cardArb = (topicIds: string[]) =>
    fc.record({
      id: fc.uuid(),
      topicId: fc.constantFrom(...topicIds),
      difficulty: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
    });

  it("MIX-1: verbal_vocabulary cards always form a contiguous block", () => {
    // Use a fixed topic set and arbitrary card assignments to keep types simple.
    const fixedTopics: TopicMeta[] = [
      topic("tConc", "s1", "conceptual"),
      topic("tMath", "s1", "procedural_math"),
      topic("tVocab", "s1", "verbal_vocabulary"),
      topic("tVocab2", "s2", "verbal_vocabulary"),
    ];
    const cardArb2 = fc.record({
      id: fc.uuid(),
      topicId: fc.constantFrom("tConc", "tMath", "tVocab", "tVocab2"),
      difficulty: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
    });
    const topicMaterialMap = new Map(fixedTopics.map((t) => [t.id, t.materialType]));

    fc.assert(
      fc.property(
        fc.array(cardArb2, { minLength: 0, maxLength: 25 }),
        (cards) => {
          const queue = buildQueue({ dueCards: cards, topics: fixedTopics });

          const vocabIndices = queue
            .map((c, i) => ({
              i,
              isVocab: topicMaterialMap.get(c.topicId) === "verbal_vocabulary",
            }))
            .filter((x) => x.isVocab)
            .map((x) => x.i);

          if (vocabIndices.length < 2) return true;
          const min = Math.min(...vocabIndices);
          const max = Math.max(...vocabIndices);
          return max - min === vocabIndices.length - 1;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property tests — MIX-2
// ---------------------------------------------------------------------------

describe("property tests — MIX-2", () => {
  const materialTypes: TopicMeta["materialType"][] = [
    "conceptual",
    "procedural_math",
    "visual_discrimination",
    "verbal_vocabulary",
  ];

  it("MIX-2: queue length equals min(dueCards.length, cap)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // number of cards
        fc.integer({ min: 0, max: 25 }), // cap
        (n, cap) => {
          const cards = Array.from({ length: n }, (_, i) =>
            card(`c${i}`, `t${i % 3}`, 5)
          );
          const topics = [0, 1, 2].map((i) =>
            topic(`t${i}`, "s1", "conceptual")
          );
          const queue = buildQueue({ dueCards: cards, topics, cap });
          return queue.length === Math.min(n, cap);
        }
      )
    );
  });

  it("MIX-2: queue contains no more cards than dueCards when cap is omitted", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            topicId: fc.constantFrom("t1", "t2", "t3"),
            difficulty: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
          }),
          { maxLength: 30 }
        ),
        (cards) => {
          const topics: TopicMeta[] = ["t1", "t2", "t3"].map((id, i) =>
            topic(id, `s${i % 2}`, materialTypes[i % 4])
          );
          const queue = buildQueue({ dueCards: cards, topics });
          return queue.length <= cards.length;
        }
      )
    );
  });
});
