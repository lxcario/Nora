/**
 * Timezone-safe due-date helpers.
 *
 * Spec requirements (Req 2.3, 2.4):
 *   - "Due today" is determined by the user's stored timezone, NOT the
 *     server's local date.
 *   - Due timestamps are UTC instants; they are compared against the end of
 *     the user's local calendar day.
 *
 * Pure functions — no database, no network, no side effects.
 * Requires Node.js >= 20 (full Intl.DateTimeFormat.formatToParts support).
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the UTC offset (ms) for `timezone` at the given UTC instant.
 *
 *   positive → TZ is ahead of UTC  (e.g. Tokyo JST  +9 h → +32_400_000)
 *   negative → TZ is behind UTC   (e.g. New York EDT −4 h → −14_400_000)
 *
 * Implementation: ask Intl for the local hour/minute/second at `utcDate`,
 * treat those as if they were UTC, then subtract the real UTC epoch value.
 */
function utcOffsetMs(utcDate: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  // Intl with hour12:false can return hour=24 for midnight — normalise it.
  const hour = get("hour") % 24;

  const localAsIfUtc = Date.UTC(
    get("year"),
    get("month") - 1, // 0-indexed
    get("day"),
    hour,
    get("minute"),
    get("second")
  );

  return localAsIfUtc - utcDate.getTime();
}

/**
 * Validates that `tz` is a recognised IANA timezone identifier.
 * Returns false for blank, invalid, or unsupported strings.
 */
function isValidTimezone(tz: string): boolean {
  if (!tz || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the UTC instant that corresponds to 23:59:59.999 on the calendar
 * day that contains `now` when viewed in `timezone`.
 *
 * Examples:
 *   now = 2025-06-15T08:00:00Z, tz = "America/New_York" (EDT, UTC−4)
 *   → local date is June 15 → end = 2025-06-16T03:59:59.999Z
 *
 *   now = 2025-06-15T12:00:00Z, tz = "Asia/Tokyo" (JST, UTC+9)
 *   → local date is June 15 → end = 2025-06-15T14:59:59.999Z
 *
 * Falls back to UTC when `timezone` is empty or unrecognised.
 *
 * @param now      Reference UTC instant (typically `new Date()`).
 * @param timezone IANA timezone string (e.g. "Europe/London").
 */
export function endOfUserLocalDay(now: Date, timezone: string): Date {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";

  // Step 1 — find the user's local calendar date for `now`.
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getDate = (type: string) =>
    Number(dateParts.find((p) => p.type === type)?.value ?? "0");

  const year = getDate("year");
  const month = getDate("month"); // 1-indexed
  const day = getDate("day");

  // Step 2 — naive UTC Date for 23:59:59.000 on this calendar date (no ms —
  //   Intl only has second precision; we add 999 ms after offset correction).
  const naiveEndUtc = new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59, 0)
  );

  // Step 3 — how many ms is `tz` ahead of UTC at that naive moment?
  const offset = utcOffsetMs(naiveEndUtc, tz);

  // Step 4 — shift: "local 23:59:59.999" as a UTC instant = naiveEnd − offset + 999.
  //   e.g. NYC (offset = −14_400_000): naiveEnd + 14_400_000 + 999 → 4 h later ✓
  //   e.g. Tokyo (offset = +32_400_000): naiveEnd − 32_400_000 + 999 → 9 h earlier ✓
  return new Date(naiveEndUtc.getTime() - offset + 999);
}

/**
 * Returns `true` when the card's `due` UTC timestamp falls on or before the
 * end of the user's current local calendar day.
 *
 * This is the single authoritative "is this card due today?" check.
 * Pass `profiles.timezone` for `timezone`; fall back to "UTC" when absent.
 *
 * DUE-1 guarantee: a card due at 23:59 user-local time is always considered
 * due today regardless of the server's own timezone.
 *
 * @param due      The card's `due` column value (UTC instant).
 * @param now      Current UTC instant (typically `new Date()`).
 * @param timezone User's IANA timezone string.
 */
export function isDueToday(due: Date, now: Date, timezone: string): boolean {
  return due.getTime() <= endOfUserLocalDay(now, timezone).getTime();
}

/**
 * Returns the UTC instant that corresponds to 00:00:00.000 on the calendar
 * day that contains `now` when viewed in `timezone`.
 *
 * This is the start-of-day mirror of {@link endOfUserLocalDay}. Together they
 * bound the user's local calendar day:
 *   startOfUserLocalDay(now, tz) <= now <= endOfUserLocalDay(now, tz)
 *
 * Examples:
 *   now = 2025-06-15T02:00:00Z, tz = "America/New_York" (EDT, UTC−4)
 *   → local date is June 14 → start = 2025-06-14T04:00:00.000Z
 *
 *   now = 2025-06-15T12:00:00Z, tz = "Asia/Tokyo" (JST, UTC+9)
 *   → local date is June 15 → start = 2025-06-14T15:00:00.000Z
 *
 * Falls back to UTC when `timezone` is empty or unrecognised.
 *
 * @param now      Reference UTC instant (typically `new Date()`).
 * @param timezone IANA timezone string (e.g. "Europe/London").
 */
export function startOfUserLocalDay(now: Date, timezone: string): Date {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";

  // Step 1 — find the user's local calendar date for `now`.
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getDate = (type: string) =>
    Number(dateParts.find((p) => p.type === type)?.value ?? "0");

  const year = getDate("year");
  const month = getDate("month"); // 1-indexed
  const day = getDate("day");

  // Step 2 — naive UTC Date for 00:00:00.000 on this calendar date.
  const naiveStartUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Step 3 — how many ms is `tz` ahead of UTC at that naive moment?
  const offset = utcOffsetMs(naiveStartUtc, tz);

  // Step 4 — shift: "local 00:00:00.000" as a UTC instant = naiveStart − offset.
  //   e.g. NYC (offset = −14_400_000): naiveStart + 14_400_000 → 4 h later ✓
  //   e.g. Tokyo (offset = +32_400_000): naiveStart − 32_400_000 → 9 h earlier ✓
  return new Date(naiveStartUtc.getTime() - offset);
}

/**
 * Returns the user's local calendar date for `date` as a stable YYYY-MM-DD key.
 *
 * This is the single source of truth for day-keying activity by the user's
 * local date (not the server's UTC date). Use it on both sides of a lookup —
 * when building an activity Set and when probing it — so the keys always match.
 *
 * Falls back to UTC when `timezone` is empty or unrecognised.
 *
 * @param date     A UTC instant.
 * @param timezone User's IANA timezone string.
 */
export function userLocalDateKey(date: Date, timezone: string): string {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}
