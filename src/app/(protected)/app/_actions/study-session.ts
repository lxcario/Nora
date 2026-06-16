"use server";

import { createClient } from "@/lib/supabase/server";

export type StudyItemType = "flashcard" | "feynman_prompt" | "rag_question";

export interface StudyItem {
  id: string;
  type: StudyItemType;
  subject: string;
  topic: string;
  // For flashcards
  cardId?: string;
  front?: string;
  back?: string;
  // For feynman prompts
  topicId?: string;
  prompt?: string;
  // For rag questions
  paperId?: string;
  question?: string;
  paperTitle?: string;
}

/**
 * Generates an interleaved study queue combining:
 * - Due flashcards (SM-2 review queue)
 * - Feynman explanation prompts (topics not explained recently)
 * - RAG research questions (from indexed papers)
 *
 * Items are interleaved to create "desirable difficulty" across modalities.
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

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // 1. Fetch up to 5 due cards
  const { data: dueCards } = await supabase
    .from("cards")
    .select("id, front, back, topics(id, name, subjects(name))")
    .eq("user_id", user.id)
    .lte("next_review_at", today)
    .order("next_review_at", { ascending: true })
    .limit(5);

  // 2. Fetch up to 3 topics without a recent Feynman explanation (last 7 days)
  // First get all user topics, then filter out those with recent explanations
  const { data: allTopics } = await supabase
    .from("topics")
    .select("id, name, subjects(name)")
    .eq("user_id", user.id);

  const { data: recentExplanations } = await supabase
    .from("feynman_explanations")
    .select("topic_id")
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgoISO);

  const recentTopicIds = new Set(
    (recentExplanations ?? []).map((e) => e.topic_id)
  );

  const staleTopics = (allTopics ?? [])
    .filter((t) => !recentTopicIds.has(t.id))
    .slice(0, 3);

  // 3. Fetch up to 2 papers with parse_status = 'ready' for RAG questions
  const { data: readyPapers } = await supabase
    .from("papers")
    .select("id, title, abstract, topics(name, subjects(name))")
    .eq("user_id", user.id)
    .eq("parse_status", "ready")
    .limit(2);

  // Build items for each type
  const flashcardItems: StudyItem[] = (dueCards ?? []).map((card) => {
    const topic = card.topics as unknown as {
      id: string;
      name: string;
      subjects: { name: string } | null;
    } | null;
    return {
      id: `card-${card.id}`,
      type: "flashcard" as const,
      subject: topic?.subjects?.name ?? "General",
      topic: topic?.name ?? "Uncategorized",
      cardId: card.id,
      front: card.front,
      back: card.back,
    };
  });

  const feynmanItems: StudyItem[] = staleTopics.map((t) => {
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

  const ragItems: StudyItem[] = (readyPapers ?? []).map((paper) => {
    const topic = paper.topics as unknown as {
      name: string;
      subjects: { name: string } | null;
    } | null;
    // Generate a question from the paper's abstract/title
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

  // Interleave: card, feynman, card, rag, card, feynman, card, rag, card, feynman
  const queue: StudyItem[] = [];
  let cardIdx = 0;
  let feynmanIdx = 0;
  let ragIdx = 0;

  const pattern: StudyItemType[] = [
    "flashcard",
    "feynman_prompt",
    "flashcard",
    "rag_question",
    "flashcard",
    "feynman_prompt",
    "flashcard",
    "rag_question",
    "flashcard",
    "feynman_prompt",
  ];

  for (const type of pattern) {
    if (type === "flashcard" && cardIdx < flashcardItems.length) {
      queue.push(flashcardItems[cardIdx++]);
    } else if (type === "feynman_prompt" && feynmanIdx < feynmanItems.length) {
      queue.push(feynmanItems[feynmanIdx++]);
    } else if (type === "rag_question" && ragIdx < ragItems.length) {
      queue.push(ragItems[ragIdx++]);
    }
  }

  // Append any remaining items that didn't fit the pattern
  while (cardIdx < flashcardItems.length) queue.push(flashcardItems[cardIdx++]);
  while (feynmanIdx < feynmanItems.length) queue.push(feynmanItems[feynmanIdx++]);
  while (ragIdx < ragItems.length) queue.push(ragItems[ragIdx++]);

  return { queue };
}
