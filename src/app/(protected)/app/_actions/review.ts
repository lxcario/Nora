"use server";

import { createClient } from "@/lib/supabase/server";
import { computeSM2 } from "@/lib/sm2";
import { revalidatePath } from "next/cache";

export interface DueCard {
  id: string;
  front: string;
  back: string;
  source_type: string;
  metadata: { video_id?: string; youtube_id?: string; offset_seconds?: number } | null;
  interval: number;
  repetition: number;
  efactor: number;
  topic_name: string | null;
  subject_name: string | null;
}

/**
 * Fetches cards due for review (next_review_at <= today).
 * Returns up to `limit` cards ordered by priority.
 */
export async function getDueCards(limit = 50): Promise<{
  cards: DueCard[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cards: [], error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cards")
    .select("id, front, back, source_type, metadata, interval, repetition, efactor, topics(name, subjects(name))")
    .eq("user_id", user.id)
    .lte("next_review_at", today)
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (error) return { cards: [], error: error.message };

  const cards: DueCard[] = (data ?? []).map((card) => {
    const topic = card.topics as unknown as { name: string; subjects: { name: string } } | null;
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      source_type: card.source_type,
      metadata: card.metadata as { video_id?: string; offset_seconds?: number } | null,
      interval: card.interval,
      repetition: card.repetition,
      efactor: card.efactor,
      topic_name: topic?.name ?? null,
      subject_name: topic?.subjects?.name ?? null,
    };
  });

  return { cards };
}

/**
 * Submits a review grade (0-5) for a card.
 * Applies the SM-2 algorithm and updates the card schedule.
 */
export async function submitReview(
  cardId: string,
  grade: number
): Promise<{ success?: boolean; error?: string }> {
  if (grade < 0 || grade > 5) {
    return { error: "Grade must be between 0 and 5" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch current card state
  const { data: card, error: fetchError } = await supabase
    .from("cards")
    .select("interval, repetition, efactor")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !card) {
    return { error: "Card not found" };
  }

  // Apply SM-2 algorithm
  const result = computeSM2(
    {
      interval: card.interval,
      repetition: card.repetition,
      efactor: Number(card.efactor),
    },
    grade
  );

  // Update card with new schedule
  const { error: updateError } = await supabase
    .from("cards")
    .update({
      interval: result.interval,
      repetition: result.repetition,
      efactor: result.efactor,
      next_review_at: result.nextReviewAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  // Log the review in card_reviews
  await supabase.from("card_reviews").insert({
    user_id: user.id,
    card_id: cardId,
    grade,
  });

  // Award XP/coins based on grade
  const { rewardAction } = await import("./gamification");
  await rewardAction(grade >= 3 ? "review_good" : "review_bad");

  // Track party quest progress (non-blocking — errors don't affect review flow)
  try {
    const { incrementQuestProgress } = await import("./party-quests");
    await incrementQuestProgress(user.id, "cards_reviewed", 1);
  } catch {
    // Party quest tracking is best-effort; don't break reviews
  }

  revalidatePath("/app/review");
  return { success: true };
}


/**
 * Deletes a card permanently.
 */
export async function deleteCard(
  cardId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/review");
  return { success: true };
}
