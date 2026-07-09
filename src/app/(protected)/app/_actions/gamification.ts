"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getRewardAmounts } from "@/lib/rewards";

/**
 * Reward amounts are centralized in `@/lib/rewards` (the single source of truth
 * shared with the UI copy). See that file for the per-action XP/coin table.
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
 * Awards XP and coins for a study action using atomic DB increments.
 * Eliminates the read-modify-write race condition.
 */
export async function rewardAction(
  action: "feynman" | "review_good" | "review_bad" | "card_created" | "session_complete" | "missions_complete"
): Promise<{ data?: RewardResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Rate-limit reward writes: generous for real study, but caps scripted abuse
  // of the atomic reward RPC. Best-effort per server instance (see SECURITY.md).
  const rl = checkRateLimit(
    user.id,
    "reward",
    RATE_LIMITS.reward.maxRequests,
    RATE_LIMITS.reward.windowMs
  );
  if (!rl.allowed) {
    return { error: "Too many reward requests — please slow down a moment." };
  }

  const { xp: xpGained, coins: coinsGained, affinity: petAffinityChange } = getRewardAmounts(action);

  // Atomic increment — no read-then-write race
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "increment_profile_rewards",
    { p_user_id: user.id, p_xp: xpGained, p_coins: coinsGained }
  );

  if (rpcError) {
    return { error: rpcError.message };
  }

  const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!row) return { error: "Profile not found" };

  const newXp = row.new_xp as number;
  const newCoins = row.new_coins as number;
  const newLevel = row.new_level as number;
  const oldLevel = row.old_level as number;
  const leveledUp = newLevel > oldLevel;

  // Atomic pet affinity increment
  if (petAffinityChange > 0) {
    await supabase.rpc("increment_pet_affinity", {
      p_user_id: user.id,
      p_amount: petAffinityChange,
    });
  }

  // Only revalidate the full layout on level-up (structural change that
  // warrants a server re-render). For normal XP gains, the client-side
  // SessionStatsProvider handles immediate UI updates without layout churn.
  if (leveledUp) {
    revalidatePath("/app");
    revalidatePath("/app/room");
  }

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
 * Awards XP and coins for multiple instances of the same action using atomic DB increments.
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

  // Rate-limit reward writes (shared "reward" budget with rewardAction).
  const rl = checkRateLimit(
    user.id,
    "reward",
    RATE_LIMITS.reward.maxRequests,
    RATE_LIMITS.reward.windowMs
  );
  if (!rl.allowed) {
    return { error: "Too many reward requests — please slow down a moment." };
  }

  const { xp: xpPerAction, coins: coinsPerAction, affinity: affinityPerAction } = getRewardAmounts(action);

  const xpGained = xpPerAction * count;
  const coinsGained = coinsPerAction * count;
  const petAffinityChange = affinityPerAction * count;

  // Atomic increment — no read-then-write race
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "increment_profile_rewards",
    { p_user_id: user.id, p_xp: xpGained, p_coins: coinsGained }
  );

  if (rpcError) {
    return { error: rpcError.message };
  }

  const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!row) return { error: "Profile not found" };

  const newXp = row.new_xp as number;
  const newCoins = row.new_coins as number;
  const newLevel = row.new_level as number;
  const oldLevel = row.old_level as number;
  const leveledUp = newLevel > oldLevel;

  // Atomic pet affinity increment
  if (petAffinityChange > 0) {
    await supabase.rpc("increment_pet_affinity", {
      p_user_id: user.id,
      p_amount: petAffinityChange,
    });
  }

  // Only revalidate on level-up — same logic as rewardAction.
  if (leveledUp) {
    revalidatePath("/app");
    revalidatePath("/app/room");
  }

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
