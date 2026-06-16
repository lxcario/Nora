"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculateLevel } from "@/lib/gamification";

/**
 * XP/Coin reward rules:
 * - Feynman explanation completed: +15 XP, +5 coins
 * - Card reviewed (grade >= 3): +3 XP, +1 coin
 * - Card reviewed (grade < 3): +1 XP
 * - Card created: +2 XP
 * - Study session completed (>=15 min): +10 XP, +3 coins
 * - All daily missions done: +20 XP, +10 coins (bonus)
 *
 * Level formula: level = floor(sqrt(xp / 50)) + 1
 * So: Lv2 at 50XP, Lv3 at 200XP, Lv4 at 450XP, Lv5 at 800XP...
 */

interface RewardResult {
  xpGained: number;
  coinsGained: number;
  newXp: number;
  newCoins: number;
  newLevel: number;
  leveledUp: boolean;
  petAffinityChange: number;
}

/**
 * Awards XP and coins for a study action.
 */
export async function rewardAction(
  action: "feynman" | "review_good" | "review_bad" | "card_created" | "session_complete" | "missions_complete"
): Promise<{ data?: RewardResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  // Determine rewards
  let xpGained = 0;
  let coinsGained = 0;
  let petAffinityChange = 0;

  switch (action) {
    case "feynman":
      xpGained = 15;
      coinsGained = 5;
      petAffinityChange = 3;
      break;
    case "review_good":
      xpGained = 3;
      coinsGained = 1;
      petAffinityChange = 1;
      break;
    case "review_bad":
      xpGained = 1;
      coinsGained = 0;
      petAffinityChange = 0;
      break;
    case "card_created":
      xpGained = 2;
      coinsGained = 0;
      petAffinityChange = 0;
      break;
    case "session_complete":
      xpGained = 10;
      coinsGained = 3;
      petAffinityChange = 2;
      break;
    case "missions_complete":
      xpGained = 20;
      coinsGained = 10;
      petAffinityChange = 5;
      break;
  }

  const newXp = profile.xp + xpGained;
  const newCoins = profile.coins + coinsGained;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > profile.level;

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      xp: newXp,
      coins: newCoins,
      level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  // Update pet affinity
  if (petAffinityChange > 0) {
    const { data: pet } = await supabase
      .from("pets")
      .select("affinity")
      .eq("user_id", user.id)
      .single();

    if (pet) {
      const newAffinity = Math.min(100, pet.affinity + petAffinityChange);
      const newState = newAffinity > 70 ? "happy" : newAffinity > 40 ? "neutral" : "sad";

      await supabase
        .from("pets")
        .update({ affinity: newAffinity, state: newState, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/room");

  return {
    data: {
      xpGained,
      coinsGained,
      newXp,
      newCoins,
      newLevel,
      leveledUp,
      petAffinityChange,
    },
  };
}

/**
 * Awards XP and coins for multiple instances of the same action in a single DB round-trip.
 * Use this instead of calling rewardAction() in a loop.
 */
export async function rewardBatch(
  action: "feynman" | "review_good" | "review_bad" | "card_created" | "session_complete" | "missions_complete",
  count: number
): Promise<{ data?: RewardResult; error?: string }> {
  if (count <= 0) return { data: { xpGained: 0, coinsGained: 0, newXp: 0, newCoins: 0, newLevel: 1, leveledUp: false, petAffinityChange: 0 } };
  if (count === 1) return rewardAction(action);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  // Calculate per-action rewards
  let xpPerAction = 0;
  let coinsPerAction = 0;
  let affinityPerAction = 0;

  switch (action) {
    case "feynman": xpPerAction = 15; coinsPerAction = 5; affinityPerAction = 3; break;
    case "review_good": xpPerAction = 3; coinsPerAction = 1; affinityPerAction = 1; break;
    case "review_bad": xpPerAction = 1; coinsPerAction = 0; affinityPerAction = 0; break;
    case "card_created": xpPerAction = 2; coinsPerAction = 0; affinityPerAction = 0; break;
    case "session_complete": xpPerAction = 10; coinsPerAction = 3; affinityPerAction = 2; break;
    case "missions_complete": xpPerAction = 20; coinsPerAction = 10; affinityPerAction = 5; break;
  }

  const xpGained = xpPerAction * count;
  const coinsGained = coinsPerAction * count;
  const petAffinityChange = affinityPerAction * count;

  const newXp = profile.xp + xpGained;
  const newCoins = profile.coins + coinsGained;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > profile.level;

  // Single DB update for profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      xp: newXp,
      coins: newCoins,
      level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  // Single DB update for pet affinity
  if (petAffinityChange > 0) {
    const { data: pet } = await supabase
      .from("pets")
      .select("affinity")
      .eq("user_id", user.id)
      .single();

    if (pet) {
      const newAffinity = Math.min(100, pet.affinity + petAffinityChange);
      const newState = newAffinity > 70 ? "happy" : newAffinity > 40 ? "neutral" : "sad";

      await supabase
        .from("pets")
        .update({ affinity: newAffinity, state: newState, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/room");

  return {
    data: { xpGained, coinsGained, newXp, newCoins, newLevel, leveledUp, petAffinityChange },
  };
}

/**
 * Creates the user's initial pet (if they don't have one).
 */
export async function choosePet(pokemonId: number, nickname: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if pet already exists
  const { data: existing } = await supabase
    .from("pets")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Update existing pet
    const { error } = await supabase
      .from("pets")
      .update({ pet_type: pokemonId.toString(), name: nickname, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    // Create new pet
    const { error } = await supabase
      .from("pets")
      .insert({
        user_id: user.id,
        pet_type: pokemonId.toString(),
        name: nickname,
        state: "happy",
        affinity: 50,
      });
    if (error) return { error: error.message };
  }

  revalidatePath("/app/room");
  revalidatePath("/app/settings");
  return { success: true };
}
