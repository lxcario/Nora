"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

// ---------------------------------------------------------------------------
// Prediction Mode — Pre-Testing Effect (Pan & Carpenter 2023)
// ---------------------------------------------------------------------------
// Fetches cards the user is LEAST likely to know (new or low-stability),
// so guessing them wrong primes the brain for deeper encoding on later study.
// ---------------------------------------------------------------------------

export interface PredictionCard {
  id: string;
  front: string;
  back: string;
  topic_name: string | null;
  subject_name: string | null;
  stability: number | null;
}

/**
 * Get cards for a prediction session — prioritizes cards the user
 * probably CAN'T answer (new or low stability), which is the point.
 */
export async function getPredictionCards(count = 3): Promise<{
  cards: PredictionCard[];
  error?: string;
}> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { cards: [], error: "Not authenticated" };

  // Fetch the user's weakest cards: new (state=0) or low stability, random sample
  const { data, error } = await supabase
    .from("cards")
    .select("id, front, back, stability, topics(name, subjects(name))")
    .eq("user_id", user.id)
    .order("stability", { ascending: true, nullsFirst: true })
    .limit(20);

  if (error) return { cards: [], error: error.message };
  if (!data || data.length === 0) return { cards: [] };

  // Shuffle and take `count` cards from the weakest pool
  const shuffled = data.sort(() => Math.random() - 0.5).slice(0, count);

  const cards: PredictionCard[] = shuffled.map((card) => {
    const topic = card.topics as unknown as {
      name: string;
      subjects: { name: string } | null;
    } | null;
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      topic_name: topic?.name ?? null,
      subject_name: topic?.subjects?.name ?? null,
      stability: card.stability ?? null,
    };
  });

  return { cards };
}
