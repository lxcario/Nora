/**
 * Evidence-based Study Mix queue builder (spec Req 4.1–4.6).
 *
 * Rules (from Brunmair & Richter 2019 meta-analysis):
 *   • verbal_vocabulary → BLOCKED: all vocab cards form one contiguous
 *     section; interleaving hurts word-list recall (g = −0.39).
 *   • All other types   → INTERLEAVED within confusable same-subject topics
 *     (g = 0.42 overall, 0.34 math, 0.67 visual discrimination).
 *
 * Weakness signal: FSRS difficulty (70%) + inverse Feynman score (30%).
 * Topics with the highest combined weakness appear earliest in the queue.
 *
 * Pure module — no database, no network, no side effects.
 */

import type { MaterialType } from "@/lib/material-type";
export type { MaterialType };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single due card as supplied by the review layer. */
export interface QueueCardInput {
  id: string;
  topicId: string;
  /**
   * FSRS difficulty (1–10). Higher = harder card → stronger weakness signal.
   * Pass `null` for cards not yet backfilled (treated as neutral 5).
   */
  difficulty: number | null;
}

/** Topic metadata used for ordering and grouping. */
export interface TopicMeta {
  id: string;
  subjectId: string;
  materialType: MaterialType;
  /**
   * Most-recent Feynman comprehension score (0–100).
   * Lower score → higher weakness penalty. Pass `null` when unknown.
   */
  feynmanScore?: number | null;
}

export interface BuildQueueOptions {
  dueCards: QueueCardInput[];
  topics: TopicMeta[];
  /**
   * Maximum queue length (spec Req 4.5 — scales to due load).
   * Defaults to `dueCards.length` so no card is silently dropped.
   */
  cap?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DIFFICULTY_WEIGHT = 0.7;
const FEYNMAN_WEIGHT = 0.3;
const NEUTRAL_DIFFICULTY = 5;

/**
 * Weakness score for a single card (0–1, higher = weaker).
 * Used as the card-level sort key within a topic group.
 */
function cardWeakness(c: QueueCardInput): number {
  return ((c.difficulty ?? NEUTRAL_DIFFICULTY) / 10) * DIFFICULTY_WEIGHT;
}

/**
 * Aggregate weakness score for a topic (0–1).
 * Combines average card difficulty with the inverse Feynman score.
 */
function topicWeakness(
  topicId: string,
  cards: QueueCardInput[],
  topicMap: Map<string, TopicMeta>
): number {
  const meta = topicMap.get(topicId);
  const topicCards = cards.filter((c) => c.topicId === topicId);
  if (topicCards.length === 0) return 0;

  const avgDiff =
    topicCards.reduce((sum, c) => sum + (c.difficulty ?? NEUTRAL_DIFFICULTY), 0) /
    topicCards.length;
  const diffSignal = avgDiff / 10;
  const feynmanSignal =
    meta?.feynmanScore != null ? (100 - meta.feynmanScore) / 100 : 0.5;

  return diffSignal * DIFFICULTY_WEIGHT + feynmanSignal * FEYNMAN_WEIGHT;
}

/**
 * Round-robin interleave of multiple ordered arrays.
 * [A1,A2], [B1,B2,B3] → [A1,B1,A2,B2,B3]
 */
function roundRobinInterleave<T>(queues: T[][]): T[] {
  const result: T[] = [];
  const idx = queues.map(() => 0);
  for (;;) {
    let added = false;
    for (let i = 0; i < queues.length; i++) {
      if (idx[i] < queues[i].length) {
        result.push(queues[i][idx[i]++]);
        added = true;
      }
    }
    if (!added) break;
  }
  return result;
}

/**
 * Build a contiguous blocked section for all verbal_vocabulary cards.
 * Topics ordered by weakness (weakest first); cards within a topic ordered
 * by card weakness (hardest first). No gaps allowed between vocab cards.
 */
function buildVocabBlocks(
  cards: QueueCardInput[],
  topicMap: Map<string, TopicMeta>,
  weaknessCache: Map<string, number>
): QueueCardInput[] {
  const byTopic = new Map<string, QueueCardInput[]>();
  for (const c of cards) {
    const list = byTopic.get(c.topicId) ?? [];
    list.push(c);
    byTopic.set(c.topicId, list);
  }

  return [...byTopic.entries()]
    .sort(([a], [b]) => (weaknessCache.get(b) ?? 0) - (weaknessCache.get(a) ?? 0))
    .flatMap(([, topicCards]) =>
      [...topicCards].sort((a, b) => cardWeakness(b) - cardWeakness(a))
    );
}

/**
 * Build an interleaved queue for all non-vocabulary cards.
 *
 * Grouping strategy (spec Req 4.2 — "confusable same-subject topics"):
 *   1. Partition cards by subject.
 *   2. Within each subject, group by topic; sort topics by weakness (desc).
 *   3. Round-robin interleave the topic groups within the subject.
 *   4. Sort subject groups by their average card weakness (desc).
 *   5. Concatenate subject groups.
 */
function buildInterleavedQueue(
  cards: QueueCardInput[],
  topicMap: Map<string, TopicMeta>,
  weaknessCache: Map<string, number>
): QueueCardInput[] {
  if (cards.length === 0) return [];

  const bySubject = new Map<string, QueueCardInput[]>();
  for (const c of cards) {
    const sid = topicMap.get(c.topicId)?.subjectId ?? "__unknown__";
    const list = bySubject.get(sid) ?? [];
    list.push(c);
    bySubject.set(sid, list);
  }

  const subjectBlocks: { avgWeakness: number; cards: QueueCardInput[] }[] = [];

  for (const [, subjectCards] of bySubject) {
    const byTopic = new Map<string, QueueCardInput[]>();
    for (const c of subjectCards) {
      const list = byTopic.get(c.topicId) ?? [];
      list.push(c);
      byTopic.set(c.topicId, list);
    }

    const topicQueues = [...byTopic.entries()]
      .sort(([a], [b]) => (weaknessCache.get(b) ?? 0) - (weaknessCache.get(a) ?? 0))
      .map(([, tc]) => [...tc].sort((a, b) => cardWeakness(b) - cardWeakness(a)));

    const interleaved = roundRobinInterleave(topicQueues);
    const avg =
      interleaved.reduce((s, c) => s + cardWeakness(c), 0) / interleaved.length;
    subjectBlocks.push({ avgWeakness: avg, cards: interleaved });
  }

  subjectBlocks.sort((a, b) => b.avgWeakness - a.avgWeakness);
  return subjectBlocks.flatMap((b) => b.cards);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an evidence-based study queue from a set of due cards.
 *
 * • verbal_vocabulary cards are blocked into a contiguous section (never
 *   interleaved with other types) per Brunmair & Richter 2019.
 * • All other cards are interleaved within same-subject topic groups,
 *   weighted toward the weakest topics (FSRS difficulty + Feynman score).
 * • Queue length = min(dueCards.length, cap) — scales to the due load.
 *
 * Pure function: same inputs → same output. (spec Req 4.6)
 */
export function buildQueue({
  dueCards,
  topics,
  cap,
}: BuildQueueOptions): QueueCardInput[] {
  if (dueCards.length === 0) return [];

  const topicMap = new Map<string, TopicMeta>(topics.map((t) => [t.id, t]));

  // Pre-compute per-topic weakness scores once.
  const weaknessCache = new Map<string, number>();
  for (const topic of topics) {
    weaknessCache.set(topic.id, topicWeakness(topic.id, dueCards, topicMap));
  }
  // Assign neutral weakness to cards whose topic isn't in the metadata list.
  for (const c of dueCards) {
    if (!weaknessCache.has(c.topicId)) {
      weaknessCache.set(c.topicId, 0.5);
    }
  }

  const vocabCards = dueCards.filter(
    (c) => topicMap.get(c.topicId)?.materialType === "verbal_vocabulary"
  );
  const nonVocabCards = dueCards.filter(
    (c) => topicMap.get(c.topicId)?.materialType !== "verbal_vocabulary"
  );

  const interleaved = buildInterleavedQueue(nonVocabCards, topicMap, weaknessCache);
  const vocabBlock = buildVocabBlocks(vocabCards, topicMap, weaknessCache);

  // Non-vocab first (interleaved by subject/weakness), then vocab block.
  const combined = [...interleaved, ...vocabBlock];
  const limit = cap ?? combined.length;
  return combined.slice(0, Math.max(0, limit));
}
