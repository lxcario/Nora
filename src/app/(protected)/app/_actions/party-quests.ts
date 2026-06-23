"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PartyQuestView } from "./party";

// ─── Types ──────────────────────────────────────────────────────────

interface QuestTemplate {
  type: "cards_reviewed" | "feynman_sessions" | "study_minutes";
  target: number;
}

// Allowed target ranges per quest type
const TARGET_RANGES: Record<string, { min: number; max: number }> = {
  cards_reviewed: { min: 10, max: 1000 },
  feynman_sessions: { min: 5, max: 200 },
  study_minutes: { min: 30, max: 5000 },
};

const VALID_QUEST_TYPES = ["cards_reviewed", "feynman_sessions", "study_minutes"];

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Validates quest templates: must be 1-3 templates with valid types and targets.
 */
function validateTemplates(
  templates: unknown[]
): { valid: true; parsed: QuestTemplate[] } | { valid: false; error: string } {
  if (!Array.isArray(templates) || templates.length === 0 || templates.length > 3) {
    return { valid: false, error: "Quest templates must contain 1-3 entries" };
  }

  const parsed: QuestTemplate[] = [];

  for (const tmpl of templates) {
    if (typeof tmpl !== "object" || tmpl === null) {
      return { valid: false, error: "Each template must be an object with type and target" };
    }

    const { type, target } = tmpl as { type?: string; target?: number };

    if (!type || !VALID_QUEST_TYPES.includes(type)) {
      return {
        valid: false,
        error: `Invalid quest type: ${type}. Must be one of: ${VALID_QUEST_TYPES.join(", ")}`,
      };
    }

    if (typeof target !== "number" || !Number.isFinite(target) || !Number.isInteger(target)) {
      return { valid: false, error: `Target must be an integer for quest type ${type}` };
    }

    const range = TARGET_RANGES[type];
    if (target < range.min || target > range.max) {
      return {
        valid: false,
        error: `Target must be between ${range.min} and ${range.max} for ${type}`,
      };
    }

    parsed.push({ type: type as QuestTemplate["type"], target });
  }

  return { valid: true, parsed };
}

/**
 * Computes the next Monday 00:00 and Sunday 23:59:59 in the given timezone.
 * Returns UTC ISO timestamps for cycle_start and cycle_end.
 *
 * Uses Intl.DateTimeFormat.formatToParts (the same reliable approach as
 * src/lib/due.ts) instead of parsing locale strings back to Dates.
 */
function computeNextCycleBoundaries(timezone: string): { cycleStart: string; cycleEnd: string } {
  const now = new Date();

  // Get current day-of-week in the target timezone using formatToParts.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const weekday = getPart("weekday"); // Mon, Tue, Wed, ...
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
  };

  const currentDow = dayMap[weekday] ?? 1;

  // Days until next Monday (if today is Monday, next Monday is 7 days away)
  const daysUntilMonday = currentDow === 1 ? 7 : ((1 - currentDow + 7) % 7) || 7;

  // Advance `now` by daysUntilMonday to get a Date that falls on the target Monday.
  const nextMondayApprox = new Date(now.getTime() + daysUntilMonday * 86_400_000);

  // Get the calendar date (YYYY-MM-DD) of that Monday in the target timezone.
  const mondayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nextMondayApprox);

  // Sunday is 6 days after Monday.
  const sundayApprox = new Date(nextMondayApprox.getTime() + 6 * 86_400_000);
  const sundayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(sundayApprox);

  // Convert "Monday 00:00:00 in timezone" to UTC using formatToParts offset.
  // Strategy: build the naive UTC Date, compute the TZ offset at that moment
  // via formatToParts, then shift.
  const cycleStartUtc = localDateTimeToUtc(mondayStr, "00:00:00", timezone);
  const cycleEndUtc = localDateTimeToUtc(sundayStr, "23:59:59", timezone);

  return {
    cycleStart: cycleStartUtc.toISOString(),
    cycleEnd: cycleEndUtc.toISOString(),
  };
}

/**
 * Converts a local date+time in a given timezone to a UTC Date.
 * Uses Intl.DateTimeFormat.formatToParts to derive the UTC offset — never
 * parses a locale string back into a Date (which is fragile across runtimes).
 */
function localDateTimeToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  // Treat dateStr + timeStr as if they were UTC, then compute how far the
  // timezone is from UTC at that instant to apply the correction.
  const naiveUtc = new Date(`${dateStr}T${timeStr}.000Z`);

  // Get the local date/time parts in the target timezone at this naive instant.
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(naiveUtc);

  const get = (type: string) => Number(tzParts.find((p) => p.type === type)?.value ?? "0");
  const hour = get("hour") % 24; // Intl can return 24 for midnight

  const localAsUtcMs = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    hour, get("minute"), get("second")
  );

  // offset = how far the timezone is ahead of UTC (positive = east).
  const offsetMs = localAsUtcMs - naiveUtc.getTime();

  // The actual UTC instant for "dateStr timeStr in timezone" = naive - offset.
  return new Date(naiveUtc.getTime() - offsetMs);
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * generateWeeklyQuests — Creates party quest rows for the current cycle.
 *
 * Reads quest_templates from the party, validates them (1-3 templates,
 * targets within allowed ranges), then inserts party_quests rows with
 * progress=0, status='active', is_help_quest=false, and the party's
 * current cycle boundaries.
 *
 * If no templates are configured, returns early without generating quests.
 *
 * Requirements: 5.1, 5.2, 5.7
 */
export async function generateWeeklyQuests(
  partyId: string
): Promise<{ data?: { questsCreated: number }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (!membership) return { error: "You are not a member of this party" };

  // Fetch party details (quest_templates, cycle boundaries)
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("quest_templates, cycle_start, cycle_end")
    .eq("id", partyId)
    .single();

  if (partyError || !party) return { error: "Party not found" };

  const templates = party.quest_templates as unknown[];

  // If no templates configured, skip generation
  if (!templates || !Array.isArray(templates) || templates.length === 0) {
    return { data: { questsCreated: 0 } };
  }

  // Validate templates
  const validation = validateTemplates(templates);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Create party_quests rows
  const questRows = validation.parsed.map((tmpl) => ({
    party_id: partyId,
    quest_type: tmpl.type,
    target: tmpl.target,
    progress: 0,
    status: "active",
    is_help_quest: false,
    cycle_start: party.cycle_start,
    cycle_end: party.cycle_end,
  }));

  const { error: insertError } = await supabase.from("party_quests").insert(questRows);

  if (insertError) {
    console.error("Failed to insert party quests:", insertError);
    return { error: "Something went wrong" };
  }

  return { data: { questsCreated: questRows.length } };
}

/**
 * archiveExpiredQuests — Marks active quests past their cycle_end as 'archived'.
 *
 * Finds all active quests for the given party where cycle_end < now(),
 * then updates their status to 'archived'.
 *
 * Requirements: 5.6
 */
export async function archiveExpiredQuests(
  partyId: string
): Promise<{ data?: { archivedCount: number }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (!membership) return { error: "You are not a member of this party" };

  const now = new Date().toISOString();

  // Find active quests that have expired (cycle_end < now)
  const { data: expiredQuests, error: selectError } = await supabase
    .from("party_quests")
    .select("id")
    .eq("party_id", partyId)
    .eq("status", "active")
    .lt("cycle_end", now);

  if (selectError) {
    console.error("Failed to find expired quests:", selectError);
    return { error: "Something went wrong" };
  }

  if (!expiredQuests || expiredQuests.length === 0) {
    return { data: { archivedCount: 0 } };
  }

  // Archive them
  const expiredIds = expiredQuests.map((q) => q.id);
  const { error: updateError } = await supabase
    .from("party_quests")
    .update({ status: "archived" })
    .in("id", expiredIds);

  if (updateError) {
    console.error("Failed to archive expired quests:", updateError);
    return { error: "Something went wrong" };
  }

  return { data: { archivedCount: expiredIds.length } };
}

/**
 * advanceWeeklyCycle — Computes new cycle boundaries, archives old quests,
 * generates new quests for the next cycle.
 *
 * Steps:
 * 1. Compute next Monday 00:00 to Sunday 23:59 in the party's timezone
 * 2. Update party with new cycle_start and cycle_end
 * 3. Archive expired quests from the previous cycle
 * 4. Generate new quests from templates
 *
 * Requirements: 5.1, 5.2, 5.6, 5.7
 */
export async function advanceWeeklyCycle(
  partyId: string
): Promise<{ data?: { newCycleStart: string }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (!membership) return { error: "You are not a member of this party" };

  // Fetch party timezone
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("timezone")
    .eq("id", partyId)
    .single();

  if (partyError || !party) return { error: "Party not found" };

  // Compute new cycle boundaries
  const { cycleStart, cycleEnd } = computeNextCycleBoundaries(party.timezone);

  // Update party with new cycle boundaries
  const { error: updateError } = await supabase
    .from("parties")
    .update({
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partyId);

  if (updateError) {
    console.error("Failed to update cycle boundaries:", updateError);
    return { error: "Something went wrong" };
  }

  // Archive expired quests
  const archiveResult = await archiveExpiredQuests(partyId);
  if (archiveResult.error) {
    console.error("Failed to archive quests during cycle advance:", archiveResult.error);
    // Continue anyway — quest generation is more important
  }

  // Generate new quests for the new cycle
  const generateResult = await generateWeeklyQuests(partyId);
  if (generateResult.error) {
    console.error("Failed to generate quests during cycle advance:", generateResult.error);
    return { error: generateResult.error };
  }

  return { data: { newCycleStart: cycleStart } };
}

/**
 * getActiveQuests — Fetches all active quests for a party, separated into
 * regular quests and help quests.
 *
 * For help quests, fetches the helped member's display_name from profiles
 * using the admin client to bypass RLS.
 *
 * Requirements: 9.2, 9.3
 */
export async function getActiveQuests(
  partyId: string
): Promise<{ data?: { quests: PartyQuestView[]; helpQuests: PartyQuestView[] }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (!membership) return { error: "You are not a member of this party" };

  // Fetch all active quests for this party
  const { data: questRows, error: questError } = await supabase
    .from("party_quests")
    .select("id, quest_type, target, progress, status, is_help_quest, helped_user_id, cycle_end")
    .eq("party_id", partyId)
    .eq("status", "active");

  if (questError) {
    console.error("Failed to fetch active quests:", questError);
    return { error: "Something went wrong" };
  }

  if (!questRows || questRows.length === 0) {
    return { data: { quests: [], helpQuests: [] } };
  }

  // Separate regular quests from help quests
  const regularRows = questRows.filter((q) => !q.is_help_quest);
  const helpRows = questRows.filter((q) => q.is_help_quest);

  // For help quests, fetch helped member display names via admin client
  let helpedProfileMap = new Map<string, string>();
  if (helpRows.length > 0) {
    const helpedUserIds = helpRows
      .filter((q) => q.helped_user_id)
      .map((q) => q.helped_user_id!);

    if (helpedUserIds.length > 0) {
      const admin = createAdminClient();
      const { data: helpedProfiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", helpedUserIds);

      helpedProfileMap = new Map(
        helpedProfiles?.map((p) => [p.id, p.display_name ?? "Unknown"]) ?? []
      );
    }
  }

  // Build regular quest views
  const quests: PartyQuestView[] = regularRows.map((q) => ({
    id: q.id,
    questType: q.quest_type as PartyQuestView["questType"],
    target: q.target,
    progress: q.progress,
    status: q.status as PartyQuestView["status"],
    isHelpQuest: false,
    cycleEnd: q.cycle_end,
  }));

  // Build help quest views with helped member names
  const helpQuests: PartyQuestView[] = helpRows.map((q) => ({
    id: q.id,
    questType: q.quest_type as PartyQuestView["questType"],
    target: q.target,
    progress: q.progress,
    status: q.status as PartyQuestView["status"],
    isHelpQuest: true,
    helpedMemberName: q.helped_user_id
      ? helpedProfileMap.get(q.helped_user_id) ?? "Unknown"
      : undefined,
    cycleEnd: q.cycle_end,
  }));

  return { data: { quests, helpQuests } };
}

/**
 * incrementQuestProgress — Increments progress on active party quests matching an action type.
 *
 * Called internally by other server actions (review, feynman, session) when a user
 * completes a study action. Does NOT perform its own auth check — receives userId directly.
 *
 * Flow:
 * 1. Find the user's party via party_members
 * 2. If user not in a party, return early (no-op)
 * 3. Find active quests for that party matching the actionType
 * 4. For each matching quest: atomic increment progress via RPC
 * 5. If progress reaches or exceeds target: RPC marks completed, award bonus to all party members
 *
 * Bonus: 50 XP + 25 coins per completed quest, awarded to all active party members.
 *
 * Requirements: 5.3, 5.4, 5.5
 */
export async function incrementQuestProgress(
  userId: string,
  actionType: "cards_reviewed" | "feynman_sessions" | "study_minutes",
  amount: number
): Promise<{ data?: { questsUpdated: number; questsCompleted: number }; error?: string }> {
  const supabase = await createClient();

  // 1. Find the user's party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", userId)
    .single();

  // If user is not in a party, return early (no-op)
  if (!membership) {
    return { data: { questsUpdated: 0, questsCompleted: 0 } };
  }

  const partyId = membership.party_id;

  // 2. Find active quests for that party matching the actionType
  const { data: activeQuests, error: questsError } = await supabase
    .from("party_quests")
    .select("id")
    .eq("party_id", partyId)
    .eq("quest_type", actionType)
    .eq("status", "active");

  if (questsError) {
    console.error("Failed to fetch active quests:", questsError);
    return { error: "Something went wrong" };
  }

  if (!activeQuests || activeQuests.length === 0) {
    return { data: { questsUpdated: 0, questsCompleted: 0 } };
  }

  let questsUpdated = 0;
  let questsCompleted = 0;

  // 3. For each matching quest, atomic increment progress via RPC
  for (const quest of activeQuests) {
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "increment_quest_progress",
      { p_quest_id: quest.id, p_amount: amount }
    );

    if (rpcError) {
      console.error("Failed to increment quest progress:", rpcError);
      continue;
    }

    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!row || (row.new_progress === 0 && row.target === 0)) continue;

    questsUpdated++;

    if (row.just_completed) {
      questsCompleted++;
      // Award bonus to all party members: 50 XP + 25 coins each
      await awardQuestCompletionBonus(supabase, partyId);
    }
  }

  return { data: { questsUpdated, questsCompleted } };
}

/**
 * Awards 50 XP + 25 coins to all members of a party when a quest is completed.
 * Uses the atomic increment_profile_rewards RPC to avoid race conditions.
 */
async function awardQuestCompletionBonus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partyId: string
): Promise<void> {
  const XP_BONUS = 50;
  const COINS_BONUS = 25;

  // Get all party members
  const { data: members, error: membersError } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId);

  if (membersError || !members || members.length === 0) {
    console.error("Failed to fetch party members for bonus:", membersError);
    return;
  }

  // Award bonus to each member via atomic RPC
  for (const member of members) {
    const { error: rpcError } = await supabase.rpc(
      "increment_profile_rewards",
      { p_user_id: member.user_id, p_xp: XP_BONUS, p_coins: COINS_BONUS }
    );

    if (rpcError) {
      console.error(`Failed to award bonus to member ${member.user_id}:`, rpcError);
    }
  }
}


// ─── Help Quest Generation ──────────────────────────────────────────

// NOTE: Help quest auto-generation gap
// ====================================
// checkAndGenerateHelpQuests() is fully implemented below but NOT called
// automatically anywhere (no daily cron, no on-login trigger). The function
// was designed to be triggered on party page load, but that integration was
// never connected. Until a proper trigger is added (e.g., on party page load
// or a scheduled job), the manual "Ask for Help" button in the party UI
// invokes this directly to allow users to request help quests on demand.

/** Throttle window for help quest checks: 1 hour in milliseconds */
const HELP_CHECK_THROTTLE_MS = 60 * 60 * 1000;

/** Maximum active help quests per party */
const MAX_ACTIVE_HELP_QUESTS = 2;

/** Days of history to use for average calculation */
const ACTIVE_DAYS_LOOKBACK = 14;

/** Help quests expire after 7 days */
const HELP_QUEST_EXPIRY_DAYS = 7;

/**
 * Gets the current date string (YYYY-MM-DD) in the given timezone.
 */
function getDateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Counts consecutive days with 0 study sessions ending at "today" in the given timezone.
 * Returns the number of consecutive missed days (0 if member studied today or yesterday).
 */
function countConsecutiveMissedDays(
  sessionDates: Set<string>,
  timezone: string
): number {
  const now = new Date();
  let missedDays = 0;

  // Check backwards from yesterday (today may still be in progress)
  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const checkDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = getDateInTimezone(checkDate, timezone);

    if (sessionDates.has(dateStr)) {
      break; // Found a day with activity, stop counting
    }
    missedDays++;
  }

  return missedDays;
}

/**
 * Computes the help quest target based on the member's study history.
 *
 * Target = ceil(average daily sessions over previous 14 active days) × missed days
 * Minimum target: 1
 *
 * "Active days" = days where the member had at least 1 session.
 * If fewer than 14 active days exist, use all available.
 */
function computeHelpQuestTarget(
  sessionDates: string[],
  missedDays: number
): number {
  if (sessionDates.length === 0 || missedDays === 0) return 1;

  // Count sessions per unique date (active days)
  const dateCountMap = new Map<string, number>();
  for (const date of sessionDates) {
    dateCountMap.set(date, (dateCountMap.get(date) ?? 0) + 1);
  }

  // Get up to 14 most recent active days
  const sortedDates = Array.from(dateCountMap.keys()).sort().reverse();
  const activeDaysToUse = sortedDates.slice(0, ACTIVE_DAYS_LOOKBACK);

  if (activeDaysToUse.length === 0) return 1;

  // Total sessions across those active days
  let totalSessions = 0;
  for (const date of activeDaysToUse) {
    totalSessions += dateCountMap.get(date) ?? 0;
  }

  // Average daily sessions on active days
  const avgDailySessions = totalSessions / activeDaysToUse.length;

  // Target = avg × missedDays, minimum 1
  const target = Math.max(1, Math.ceil(avgDailySessions * missedDays));

  return target;
}

/**
 * checkAndGenerateHelpQuests — Evaluates party members for missed study days
 * and generates help quests when eligible.
 *
 * Triggered on party page load. Throttled by `last_help_check_at` (1 hour minimum).
 *
 * Flow:
 * 1. Auth check + verify membership
 * 2. Throttle check: if last_help_check_at is within 1 hour, return early
 * 3. Update last_help_check_at to now()
 * 4. For each member: count consecutive missed calendar days (in party timezone)
 * 5. If member has 2+ missed days AND no active help quest AND party has < 2 active help quests:
 *    - Compute target from 14-day active history
 *    - Insert help quest with is_help_quest=true
 * 6. Archive help quests older than 7 days
 * 7. Return count of generated help quests
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */
export async function checkAndGenerateHelpQuests(
  partyId: string
): Promise<{ data?: { helpQuestsGenerated: number }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (!membership) return { error: "You are not a member of this party" };

  // Fetch party details for throttle check and timezone
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("last_help_check_at, timezone, cycle_start, cycle_end")
    .eq("id", partyId)
    .single();

  if (partyError || !party) return { error: "Party not found" };

  // Throttle check: skip if last check was within 1 hour
  if (party.last_help_check_at) {
    const lastCheck = new Date(party.last_help_check_at).getTime();
    const now = Date.now();
    if (now - lastCheck < HELP_CHECK_THROTTLE_MS) {
      return { data: { helpQuestsGenerated: 0 } };
    }
  }

  // Update last_help_check_at to now
  const { error: updateError } = await supabase
    .from("parties")
    .update({ last_help_check_at: new Date().toISOString() })
    .eq("id", partyId);

  if (updateError) {
    console.error("Failed to update last_help_check_at:", updateError);
    return { error: "Something went wrong" };
  }

  // Use admin client for cross-user queries (study_sessions of other members)
  const admin = createAdminClient();

  // Get all party members
  const { data: members, error: membersError } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId);

  if (membersError || !members || members.length === 0) {
    return { error: "Something went wrong" };
  }

  // Get current count of active help quests for this party
  const { data: activeHelpQuests, error: helpQuestsError } = await supabase
    .from("party_quests")
    .select("id, helped_user_id")
    .eq("party_id", partyId)
    .eq("status", "active")
    .eq("is_help_quest", true);

  if (helpQuestsError) {
    console.error("Failed to fetch active help quests:", helpQuestsError);
    return { error: "Something went wrong" };
  }

  let activeHelpQuestCount = activeHelpQuests?.length ?? 0;

  // Archive help quests older than 7 days
  const sevenDaysAgo = new Date(Date.now() - HELP_QUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiredHelpQuests } = await supabase
    .from("party_quests")
    .select("id")
    .eq("party_id", partyId)
    .eq("status", "active")
    .eq("is_help_quest", true)
    .lt("created_at", sevenDaysAgo);

  if (expiredHelpQuests && expiredHelpQuests.length > 0) {
    const expiredIds = expiredHelpQuests.map((q: { id: string }) => q.id);
    await supabase
      .from("party_quests")
      .update({ status: "archived" })
      .in("id", expiredIds);

    // Reduce active count by archived amount
    activeHelpQuestCount -= expiredIds.length;
    // Also remove them from the set of members with active help quests
    // (We'd need the helped_user_id, but since we archived them we just re-check below)
  }

  // Re-fetch active help quests after archiving to get accurate state
  const { data: currentActiveHelp } = await supabase
    .from("party_quests")
    .select("id, helped_user_id")
    .eq("party_id", partyId)
    .eq("status", "active")
    .eq("is_help_quest", true);

  activeHelpQuestCount = currentActiveHelp?.length ?? 0;
  const currentMembersWithHelp = new Set<string>(
    currentActiveHelp?.map((q: { helped_user_id: string | null }) => q.helped_user_id).filter((id): id is string => id !== null) ?? []
  );

  let helpQuestsGenerated = 0;

  // For each member, check for consecutive missed days
  for (const member of members) {
    // Skip if party already has max active help quests
    if (activeHelpQuestCount >= MAX_ACTIVE_HELP_QUESTS) break;

    // Skip if this member already has an active help quest
    if (currentMembersWithHelp.has(member.user_id)) continue;

    // Fetch this member's study sessions from the last 30 days (enough to detect missed days + compute avg)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sessions, error: sessionsError } = await admin
      .from("study_sessions")
      .select("started_at")
      .eq("user_id", member.user_id)
      .gte("started_at", thirtyDaysAgo)
      .order("started_at", { ascending: false });

    if (sessionsError) {
      console.error(`Failed to fetch sessions for ${member.user_id}:`, sessionsError);
      continue;
    }

    // Convert session timestamps to date strings in party timezone
    const sessionDateStrings = (sessions ?? []).map((s: { started_at: string }) =>
      getDateInTimezone(new Date(s.started_at), party.timezone)
    );

    const sessionDatesSet: Set<string> = new Set(sessionDateStrings);

    // Count consecutive missed days (starting from yesterday)
    const missedDays = countConsecutiveMissedDays(sessionDatesSet, party.timezone);

    // Need 2+ consecutive missed days to qualify
    if (missedDays < 2) continue;

    // Compute help quest target
    const target = computeHelpQuestTarget(sessionDateStrings, missedDays);

    // Insert help quest
    const { error: insertError } = await supabase
      .from("party_quests")
      .insert({
        party_id: partyId,
        quest_type: "study_minutes" as const, // Help quests track study sessions (minutes)
        target,
        progress: 0,
        status: "active",
        is_help_quest: true,
        helped_user_id: member.user_id,
        cycle_start: party.cycle_start,
        cycle_end: party.cycle_end,
      });

    if (insertError) {
      console.error(`Failed to insert help quest for ${member.user_id}:`, insertError);
      continue;
    }

    helpQuestsGenerated++;
    activeHelpQuestCount++;
    currentMembersWithHelp.add(member.user_id);
  }

  return { data: { helpQuestsGenerated } };
}
