/**
 * Pure planner scheduling helpers (spec Req 7.4).
 *
 * Lives in a plain module (not a "use server" file) because Next.js 16 only
 * allows async exports from server-action modules. Imported by planner.ts
 * and its tests.
 */

/**
 * Returns the first date AFTER `afterDate` (exclusive) that is not in
 * `occupiedDates`. Checks up to `maxDays` forward before giving up.
 *
 * Used to forward-fill a missed planner session to the next free day without
 * compressing all rescheduled sessions onto the same day.
 *
 * The result is in YYYY-MM-DD format, or `null` when no free slot is found.
 */
export function nextFreeDate(
  afterDate: string,
  occupiedDates: ReadonlySet<string>,
  maxDays = 14
): string | null {
  const base = new Date(`${afterDate}T00:00:00Z`);
  for (let i = 1; i <= maxDays; i++) {
    const candidate = new Date(base.getTime() + i * 86_400_000);
    const dateStr = candidate.toISOString().split("T")[0];
    if (!occupiedDates.has(dateStr)) return dateStr;
  }
  return null;
}
