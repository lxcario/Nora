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

import { startOfUserLocalDay, userLocalDateKey } from "./due";

/**
 * Compute a streak from a set of activity date keys.
 *
 * IMPORTANT: `activityDates` must be keyed with {@link userLocalDateKey} using
 * the SAME timezone passed here, so the day-keys line up with the user's local
 * calendar (not the server's UTC date). Callers that omit `timezone` get UTC
 * keys, which matches the historical behaviour.
 *
 * @param activityDates Set of user-local YYYY-MM-DD keys where the user had at
 *                      least one session or review.
 * @param today Reference instant (defaults to now). Used for testing.
 * @param timezone User's IANA timezone (defaults to "UTC").
 * @returns Number of consecutive days with activity (including today if active).
 */
export function computeStreak(
  activityDates: Set<string>,
  today: Date = new Date(),
  timezone: string = "UTC"
): number {
  // Local noon of a given instant's day — a DST-proof anchor for stepping
  // back one calendar day at a time (never lands on a day boundary).
  const localNoon = (d: Date) =>
    new Date(startOfUserLocalDay(d, timezone).getTime() + 12 * 60 * 60 * 1000);

  let streak = 0;
  let cursor = localNoon(today);

  // Count today if it has activity; either way keep checking backwards so the
  // streak doesn't reset before the user has studied today.
  if (activityDates.has(userLocalDateKey(cursor, timezone))) {
    streak++;
  }

  // Walk back through consecutive active local days.
  cursor = localNoon(new Date(cursor.getTime() - 24 * 60 * 60 * 1000));
  while (activityDates.has(userLocalDateKey(cursor, timezone))) {
    streak++;
    cursor = localNoon(new Date(cursor.getTime() - 24 * 60 * 60 * 1000));
  }

  return streak;
}
