/**
 * Formats a streak value for display.
 *
 * When streak === 0, returns an encouraging string instead of "0".
 * Context controls which encouraging message is appropriate:
 *
 *   'home'      → "Day 1 starts now ✨"  (homepage hero stat)
 *   'analytics' → "—"                    (table/chart cell, neutral dash)
 *   'profile'   → "Not started yet"      (settings/profile label)
 *
 * When streak > 0, returns streak.toString() — the caller handles
 * suffix (" day" / " days") and emoji (🔥) to avoid duplication.
 */

export type StreakContext = "home" | "analytics" | "profile";

export function formatStreak(streak: number, context: StreakContext): string {
  if (streak === 0) {
    switch (context) {
      case "home":      return "Day 1 starts now ✨";
      case "analytics": return "—";
      case "profile":   return "Not started yet";
    }
  }
  return streak.toString();
}
