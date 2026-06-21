/**
 * Shared streak calculation — single source of truth.
 *
 * Used by both the dashboard (page.tsx) and analytics (analytics.ts).
 * Extracted to prevent the logic from drifting between copies.
 *
 * Algorithm: count consecutive calendar days with activity, starting from
 * yesterday backwards. If today also has activity, include it. This way the
 * streak doesn't reset mid-day before the user has studied.
 */

/**
 * Compute a streak from a set of activity date strings (YYYY-MM-DD).
 *
 * @param activityDates Set of date strings where the user had at least one session or review.
 * @param today Reference date (defaults to now). Used for testing.
 * @returns Number of consecutive days with activity (including today if active).
 */
export function computeStreak(
  activityDates: Set<string>,
  today: Date = new Date()
): number {
  let streak = 0;
  const checkDate = new Date(today);

  // Check if today has activity — if so, count it and move to yesterday.
  const todayStr = checkDate.toISOString().split("T")[0];
  if (activityDates.has(todayStr)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // Today has no activity yet — start checking from yesterday.
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive past days with activity.
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (activityDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
