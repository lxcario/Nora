"use server";

import { createClient } from "@/lib/supabase/server";
import { buildQueue, type QueueCardInput, type TopicMeta } from "@/lib/study-mix";
import { endOfUserLocalDay } from "@/lib/due";
import type { MaterialType } from "@/lib/material-type";

export type StudyItemType = "flashcard" | "feynman_prompt" | "rag_question";

export interface StudyItem {
  id: string;
  type: StudyItemType;
  subject: string;
  topic: string;
  cardId?: string;
  front?: string;
  back?: string;
  topicId?: string;
  prompt?: string;
  paperId?: string;
  question?: string;
  paperTitle?: string;
}

/**
 * Generates an evidence-based study queue (spec Req 4.1–4.6):
 *   • Flashcards: ordered by buildQueue (vocab blocked, non-vocab interleaved
 *     by subject + weakness signal).
 *   • Feynman prompts: topics not explained in the last 7 days.
 *   • RAG questions: from indexed papers.
 *
 * Queue size scales to the actual due-card load (Req 4.5).
 */
export async function generateStudyQueue(): Promise<{
  queue: StudyItem[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { queue: [], error: "Not authenticated" };

  // Timezone-aware "due today" cutoff (same logic as getDueCards).
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const tz = profile?.timezone ?? "UTC";
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const cutoff = endOfUserLocalDay(now, tz);

  // ── 1. Fetch due flashcards (FSRS + SM-2 fallback, scale to due load) ──────
  const { data: dueCardRows } = await supabase
    .from("cards")
    .select("id, front, back, difficulty, topics(id, name, subject_id, material_type, subjects(name))")
    .eq("user_id", user.id)
    .lte("due", cutoff.toISOString())
    .order("due", { ascending: true })
    .limit(50);

  // ── 2. Get latest Feynman score per topic (weakness signal) ────────────────
  const { data: feynmanRows } = await supabase
    .from("feynman_explanations")
    .select("topic_id, score")
    .eq("user_id", user.id)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const latestFeynmanScore = new Map<string, number>();
  for (const row of feynmanRows ?? []) {
    if (!latestFeynmanScore.has(row.topic_id) && typeof row.score === "number") {
      latestFeynmanScore.set(row.topic_id, row.score);
    }
  }

  // ── 3. Build the evidence-based flashcard queue via buildQueue ─────────────
  type TopicRaw = {
    id: string;
    name: string;
    subject_id: string;
    material_type: string;
    subjects: { name: string } | null;
  };

  const cardInputs: QueueCardInput[] = (dueCardRows ?? []).map((c) => {
    const t = c.topics as unknown as TopicRaw | null;
    return { id: c.id, topicId: t?.id ?? "", difficulty: c.difficulty as number | null };
  });

  const topicMetaMap = new Map<string, TopicMeta>();
  for (const c of dueCardRows ?? []) {
    const t = c.topics as unknown as TopicRaw | null;
    if (t && !topicMetaMap.has(t.id)) {
      topicMetaMap.set(t.id, {
        id: t.id,
        subjectId: t.subject_id,
        materialType: (t.material_type as MaterialType) ?? "conceptual",
        feynmanScore: latestFeynmanScore.get(t.id) ?? null,
      });
    }
  }

  const orderedCards = buildQueue({
    dueCards: cardInputs,
    topics: [...topicMetaMap.values()],
  });

  // Rebuild a lookup map so we can reconstruct the full card row by id.
  const cardRowById = new Map(
    (dueCardRows ?? []).map((c) => [c.id, c])
  );

  const flashcardItems: StudyItem[] = orderedCards
    .map((qc) => {
      const c = cardRowById.get(qc.id);
      if (!c) return null;
      const t = c.topics as unknown as TopicRaw | null;
      const item: StudyItem = {
        id: `card-${c.id}`,
        type: "flashcard",
        subject: t?.subjects?.name ?? "General",
        topic: t?.name ?? "Uncategorized",
        cardId: c.id,
        front: c.front,
        back: c.back,
      };
      return item;
    })
    .filter((x): x is StudyItem => x !== null);

  // ── 4. Feynman prompts (topics stale > 7 days) ─────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: allTopics } = await supabase
    .from("topics")
    .select("id, name, subjects(name)")
    .eq("user_id", user.id);

  const { data: recentExplanations } = await supabase
    .from("feynman_explanations")
    .select("topic_id")
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgo.toISOString());

  const recentTopicIds = new Set((recentExplanations ?? []).map((e) => e.topic_id));

  const feynmanItems: StudyItem[] = (allTopics ?? [])
    .filter((t) => !recentTopicIds.has(t.id))
    .slice(0, 3)
    .map((t) => {
      const subject = t.subjects as unknown as { name: string } | null;
      return {
        id: `feynman-${t.id}`,
        type: "feynman_prompt" as const,
        subject: subject?.name ?? "General",
        topic: t.name,
        topicId: t.id,
        prompt: `Explain "${t.name}" in your own words as if teaching someone new to the subject.`,
      };
    });

  // ── 5. RAG questions ───────────────────────────────────────────────────────
  const { data: readyPapers } = await supabase
    .from("papers")
    .select("id, title, abstract, topics(name, subjects(name))")
    .eq("user_id", user.id)
    .eq("parse_status", "ready")
    .limit(2);

  const ragItems: StudyItem[] = (readyPapers ?? []).map((paper) => {
    const topic = paper.topics as unknown as {
      name: string;
      subjects: { name: string } | null;
    } | null;
    const question = paper.abstract
      ? `Based on "${paper.title}", what are the key findings or arguments presented?`
      : `What can you learn from the paper "${paper.title}"?`;
    return {
      id: `rag-${paper.id}`,
      type: "rag_question" as const,
      subject: topic?.subjects?.name ?? "Research",
      topic: topic?.name ?? "Papers",
      paperId: paper.id,
      question,
      paperTitle: paper.title,
    };
  });

  // ── 6. Interleave flashcards (evidence-ordered) with Feynman + RAG ─────────
  const queue: StudyItem[] = [];
  let fi = 0, ri = 0;
  const pattern: StudyItemType[] = [
    "flashcard", "feynman_prompt", "flashcard", "rag_question",
    "flashcard", "feynman_prompt", "flashcard", "rag_question",
    "flashcard", "feynman_prompt",
  ];

  let flashIdx = 0;
  for (const type of pattern) {
    if (type === "flashcard" && flashIdx < flashcardItems.length) {
      queue.push(flashcardItems[flashIdx++]);
    } else if (type === "feynman_prompt" && fi < feynmanItems.length) {
      queue.push(feynmanItems[fi++]);
    } else if (type === "rag_question" && ri < ragItems.length) {
      queue.push(ragItems[ri++]);
    }
  }

  // Append remaining items that didn't fit the pattern.
  while (flashIdx < flashcardItems.length) queue.push(flashcardItems[flashIdx++]);
  while (fi < feynmanItems.length) queue.push(feynmanItems[fi++]);
  while (ri < ragItems.length) queue.push(ragItems[ri++]);

  return { queue };
}
