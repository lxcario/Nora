/**
 * Single source of truth for XP / coin / affinity rewards.
 *
 * Imported by both the reward server actions (`_actions/gamification.ts`) and
 * any UI that displays reward amounts, so the numbers can never drift out of
 * sync again. Keep these values aligned with docs/PRODUCT_DESCRIPTION.md.
 *
 * Reward rules:
 * - Feynman explanation completed: +15 XP, +5 coins
 * - Card reviewed (grade >= 3): +3 XP, +1 coin
 * - Card reviewed (grade < 3): +1 XP
 * - Card created: +2 XP
 * - Study session completed (>=15 min): +10 XP, +3 coins
 * - All daily quests done: +20 XP, +10 coins (bonus)
 */

export type RewardAction =
  | "feynman"
  | "review_good"
  | "review_bad"
  | "card_created"
  | "session_complete"
  | "missions_complete";

export interface RewardAmount {
  xp: number;
  coins: number;
  affinity: number;
}

export const REWARD_AMOUNTS: Record<RewardAction, RewardAmount> = {
  feynman: { xp: 15, coins: 5, affinity: 3 },
  review_good: { xp: 3, coins: 1, affinity: 1 },
  review_bad: { xp: 1, coins: 0, affinity: 0 },
  card_created: { xp: 2, coins: 0, affinity: 0 },
  session_complete: { xp: 10, coins: 3, affinity: 2 },
  missions_complete: { xp: 20, coins: 10, affinity: 5 },
};

/**
 * Resolve XP / coin / affinity amounts for a given action, with a safe
 * zero-reward fallback for unknown actions.
 */
export function getRewardAmounts(action: string): RewardAmount {
  return REWARD_AMOUNTS[action as RewardAction] ?? { xp: 0, coins: 0, affinity: 0 };
}

/** Bonus granted when all of today's quests are complete (shown on the dashboard). */
export const DAILY_QUEST_REWARD = REWARD_AMOUNTS.missions_complete;
