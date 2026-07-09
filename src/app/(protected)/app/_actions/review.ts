"use server";

import { createClient } from "@/lib/supabase/server";
import {
  scheduleReview,
  Rating,
  type Grade,
  type FSRSCardState,
} from "@/lib/fsrs";
import { endOfUserLocalDay } from "@/lib/due";
import { revalidatePath } from "next/cache";
import { rewardAction } from "./gamification";
import { incrementQuestProgress } from "./party-quests";

// ---------------------------------------------------------------------------
// DueCard — FSRS-only (SM-2 columns dropped in migration 016)
// ---------------------------------------------------------------------------

export interface DueCard {
  id: string;
  front: string;
  back: string;
  source_type: string;
  metadata: { video_id?: string; youtube_id?: string; offset_seconds?: number } | null;
  // FSRS state
  stability: number | null;
  difficulty: number | null;
  /** FSRS due timestamp as ISO string. */
  fsrs_due: string;
  last_review: string | null;
  reps: number;
  lapses: number;
  /** FSRS state code: 0=New 1=Learning 2=Review 3=Relearning */
  fsrs_state: number;
  scheduled_days: number;
  learning_steps: number;
  topic_name: string | null;
  subject_name: string | null;
}

// ---------------------------------------------------------------------------
// getDueCards — FSRS-only query (no SM-2 fallback)
// ---------------------------------------------------------------------------

/**
 * Fetches cards due for review.
 * Uses FSRS `due` (NOT NULL after migration 016) compared against
 * `endOfUserLocalDay(now, profileTimezone)` (spec Req 2.3, 2.4).
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";
  const now = new Date();
  const cutoff = endOfUserLocalDay(now, timezone);

  const { data, error } = await supabase
    .from("cards")
    .select("id, front, back, source_type, metadata, stability, difficulty, due, last_review, reps, lapses, state, scheduled_days, learning_steps, topics(name, subjects(name))")
    .eq("user_id", user.id)
    .lte("due", cutoff.toISOString())
    .order("due", { ascending: true })
    .limit(limit);

  if (error) return { cards: [], error: error.message };

  const cards: DueCard[] = (data ?? []).map((card) => {
    const topic = card.topics as unknown as {
      name: string;
      subjects: { name: string } | null;
    } | null;
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      source_type: card.source_type,
      metadata: card.metadata as { video_id?: string; offset_seconds?: number } | null,
      stability: card.stability ?? null,
      difficulty: card.difficulty ?? null,
      fsrs_due: card.due,
      last_review: card.last_review ?? null,
      reps: card.reps ?? 0,
      lapses: card.lapses ?? 0,
      fsrs_state: card.state ?? 0,
      scheduled_days: card.scheduled_days ?? 0,
      learning_steps: card.learning_steps ?? 0,
      topic_name: topic?.name ?? null,
      subject_name: topic?.subjects?.name ?? null,
    };
  });

  return { cards };
}

// ---------------------------------------------------------------------------
// submitReview — FSRS-only (SM-2 write removed in Task 19)
// ---------------------------------------------------------------------------

/**
 * Submits a review for a card using FSRS four-button grading.
 * SM-2 write path removed — app runs entirely on FSRS (spec Task 19).
 */
export async function submitReview(
  cardId: string,
  rating: Grade,
  jolConfidence?: number
): Promise<{ success?: boolean; error?: string }> {
  // Defensive guard: FSRS grades are 1-4 (Again/Hard/Good/Easy). Reject
  // anything else (e.g. a stale client sending an old 0-5 SM-2 grade).
  if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating)) {
    return { error: "Invalid rating — expected Again, Hard, Good, or Easy." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date();

  // Fetch current FSRS card state.
  const { data: card, error: fetchError } = await supabase
    .from("cards")
    .select("stability, difficulty, due, last_review, reps, lapses, state, scheduled_days, learning_steps")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !card) {
    return { error: "Card not found" };
  }

  // Build FSRSCardState from the fetched row.
  // After migration 016 all cards have FSRS state (due IS NOT NULL).
  const fsrsState: FSRSCardState = {
    stability: card.stability ?? 1,
    difficulty: card.difficulty ?? 5,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : null,
    reps: card.reps ?? 0,
    lapses: card.lapses ?? 0,
    state: card.state ?? 0,
    scheduled_days: card.scheduled_days ?? 0,
    learning_steps: card.learning_steps ?? 0,
  };

  const { card: nextFsrs } = scheduleReview(fsrsState, rating, now);

  // Write FSRS state — no SM-2 columns (dropped in migration 016).
  const { error: updateError } = await supabase
    .from("cards")
    .update({
      stability: nextFsrs.stability,
      difficulty: nextFsrs.difficulty,
      due: nextFsrs.due.toISOString(),
      last_review: now.toISOString(),
      reps: nextFsrs.reps,
      lapses: nextFsrs.lapses,
      state: nextFsrs.state,
      scheduled_days: nextFsrs.scheduled_days,
      learning_steps: nextFsrs.learning_steps,
      elapsed_days: fsrsState.scheduled_days,
      updated_at: now.toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  // Store the FSRS Rating (1-4) in card_reviews.grade.
  // Historical 0–5 SM-2 grades are preserved read-only (spec Req 2.5).
  await supabase.from("card_reviews").insert({
    user_id: user.id,
    card_id: cardId,
    grade: rating, // Rating.Again=1, Hard=2, Good=3, Easy=4 — within 0-5 constraint
    jol_confidence: jolConfidence && jolConfidence >= 1 && jolConfidence <= 5 ? jolConfidence : null,
  });

  await rewardAction(rating !== Rating.Again ? "review_good" : "review_bad");

  try {
    await incrementQuestProgress(user.id, "cards_reviewed", 1);
  } catch {
    // Party quest tracking is best-effort; don't break reviews.
  }

  revalidatePath("/app/review");
  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteCard
// ---------------------------------------------------------------------------

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
