/**
 * Gamification utility functions (XP/Level calculations).
 * These are pure functions — no server actions.
 */

/**
 * Level formula: level = floor(sqrt(xp / 50)) + 1
 * Lv2 at 50XP, Lv3 at 200XP, Lv4 at 450XP, Lv5 at 800XP...
 */
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

export function xpForNextLevel(currentXp: number): {
  needed: number;
  current: number;
  progress: number;
} {
  const level = calculateLevel(currentXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const needed = nextLevelXp - currentLevelXp;
  const current = currentXp - currentLevelXp;
  const progress = Math.min(current / needed, 1);
  return { needed, current, progress };
}
