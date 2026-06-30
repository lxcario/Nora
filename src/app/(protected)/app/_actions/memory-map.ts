"use server";

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Memory Map — server action
// ---------------------------------------------------------------------------
// Computes per-topic mean retrievability from FSRS card state.
// R = e^(-elapsed_days / stability) for each card, then averaged per topic.
// Spec: .kiro/specs/memory-map (Requirements 1.1–1.5, 6.1–6.3)
// ---------------------------------------------------------------------------

export type PlantHealth = "blooming" | "healthy" | "wilting" | "dead" | "new";

export interface MemoryMapTopic {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  health: PlantHealth;
  retrievability: number; // 0–1
  cardCount: number;
  daysUntilDue: number | null; // days until avg retrievability drops below 0.80
}

function classifyHealth(r: number): PlantHealth {
  if (r > 0.85) return "blooming";
  if (r >= 0.6) return "healthy";
  if (r >= 0.3) return "wilting";
  return "dead";
}

/**
 * Computes retrievability as R = e^(-t/S) where:
 * - t = days elapsed since last_review (or due date for new cards)
 * - S = stability (days)
 */
function computeRetrievability(stability: number | null, lastReview: string | null, now: number): number {
  if (stability == null || stability <= 0) return 0;
  if (!lastReview) return 0;
  const elapsedMs = now - new Date(lastReview).getTime();
  const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));
  return Math.exp(-elapsedDays / stability);
}

/**
 * Predicts days until retrievability drops below threshold.
 * From R = e^(-t/S): t = -S * ln(threshold)
 * Days remaining = predicted_total - elapsed
 */
function daysUntilBelow(stability: number, lastReview: string, now: number, threshold = 0.8): number | null {
  if (stability <= 0) return null;
  const elapsedMs = now - new Date(lastReview).getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const totalDaysAtThreshold = -stability * Math.log(threshold);
  const remaining = totalDaysAtThreshold - elapsedDays;
  return Math.max(0, Math.round(remaining));
}

export async function getMemoryMap(): Promise<{
  topics: MemoryMapTopic[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { topics: [], error: "Not authenticated" };

  // Fetch all cards with their topic + subject info and FSRS state
  const { data: cards, error } = await supabase
    .from("cards")
    .select("stability, last_review, state, topics(id, name, subjects(name, color))")
    .eq("user_id", user.id);

  if (error) return { topics: [], error: error.message };

  const now = Date.now();

  // Aggregate per topic
  type TopicAgg = {
    topicName: string;
    subjectName: string;
    subjectColor: string;
    retrievabilities: number[];
    stabilities: number[];
    lastReviews: string[];
  };

  const topicMap = new Map<string, TopicAgg>();

  for (const card of cards ?? []) {
    const topic = card.topics as unknown as {
      id: string;
      name: string;
      subjects: { name: string; color: string | null } | null;
    } | null;
    if (!topic) continue;

    const agg = topicMap.get(topic.id) ?? {
      topicName: topic.name,
      subjectName: topic.subjects?.name ?? "General",
      subjectColor: topic.subjects?.color ?? "#d4a526",
      retrievabilities: [],
      stabilities: [],
      lastReviews: [],
    };

    const state = card.state as number | null;
    const stability = card.stability as number | null;
    const lastReview = card.last_review as string | null;

    // New cards (state === 0 or null) have no retrievability data
    if (state === 0 || state == null) {
      agg.retrievabilities.push(0);
    } else {
      const r = computeRetrievability(stability, lastReview, now);
      agg.retrievabilities.push(r);
      if (stability != null && lastReview) {
        agg.stabilities.push(stability);
        agg.lastReviews.push(lastReview);
      }
    }

    topicMap.set(topic.id, agg);
  }

  // Also fetch topics that have no cards at all (show as "new/seedling")
  const { data: allTopics } = await supabase
    .from("topics")
    .select("id, name, subjects(name, color)")
    .eq("user_id", user.id);

  for (const t of allTopics ?? []) {
    const topicRaw = t as unknown as {
      id: string;
      name: string;
      subjects: { name: string; color: string | null } | null;
    };
    if (!topicMap.has(topicRaw.id)) {
      topicMap.set(topicRaw.id, {
        topicName: topicRaw.name,
        subjectName: topicRaw.subjects?.name ?? "General",
        subjectColor: topicRaw.subjects?.color ?? "#d4a526",
        retrievabilities: [],
        stabilities: [],
        lastReviews: [],
      });
    }
  }

  const topics: MemoryMapTopic[] = [];

  for (const [topicId, agg] of topicMap) {
    const cardCount = agg.retrievabilities.length;

    if (cardCount === 0) {
      topics.push({
        topicId,
        topicName: agg.topicName,
        subjectName: agg.subjectName,
        subjectColor: agg.subjectColor,
        health: "new",
        retrievability: 0,
        cardCount: 0,
        daysUntilDue: null,
      });
      continue;
    }

    const meanR = agg.retrievabilities.reduce((s, v) => s + v, 0) / cardCount;
    const health = meanR === 0 && cardCount > 0 && agg.stabilities.length === 0
      ? "new"
      : classifyHealth(meanR);

    // Average days until review needed
    let daysUntilDue: number | null = null;
    if (agg.stabilities.length > 0) {
      const predictions = agg.stabilities.map((s, i) =>
        daysUntilBelow(s, agg.lastReviews[i], now, 0.8)
      ).filter((d): d is number => d !== null);
      if (predictions.length > 0) {
        daysUntilDue = Math.round(predictions.reduce((a, b) => a + b, 0) / predictions.length);
      }
    }

    topics.push({
      topicId,
      topicName: agg.topicName,
      subjectName: agg.subjectName,
      subjectColor: agg.subjectColor,
      health,
      retrievability: Math.round(meanR * 100) / 100,
      cardCount,
      daysUntilDue,
    });
  }

  // Sort: wilting/dead first (need attention), then by retrievability ascending
  const healthPriority: Record<PlantHealth, number> = { dead: 0, wilting: 1, new: 2, healthy: 3, blooming: 4 };
  topics.sort((a, b) => healthPriority[a.health] - healthPriority[b.health] || a.retrievability - b.retrievability);

  return { topics };
}
