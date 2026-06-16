"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────

export interface PartyMessageView {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
}

// ─── Blocklist ──────────────────────────────────────────────────────

const BLOCKED_WORDS = ["spam", "scam", "hate", "kill", "porn", "xxx"];

const BLOCKLIST_REGEX = new RegExp(`\\b(${BLOCKED_WORDS.join("|")})\\b`, "i");

// ─── Constants ──────────────────────────────────────────────────────

const ALLOWED_EMOJIS = ['fire', 'star', 'clap', 'heart', 'rocket', 'sparkles'] as const;
const MAX_CHEERS_PER_DAY = 10;
const MAX_MESSAGE_LENGTH = 200;
const MAX_MESSAGES_PER_DAY = 20;
const MAX_MESSAGES_FETCH = 20;

// ─── Cheer Actions ──────────────────────────────────────────────────

/**
 * sendCheer — delivers a cheer emoji from the current user to another party member.
 *
 * Validates:
 * - Auth check
 * - Emoji is in the allowed set
 * - Sender !== receiver (no self-cheer)
 * - Sender is in a party
 * - Receiver is in the same party
 * - Daily rate limit (max 10 cheers per sender per calendar day in party timezone)
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.7
 */
export async function sendCheer(
  receiverId: string,
  emoji: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate emoji
  if (!ALLOWED_EMOJIS.includes(emoji as typeof ALLOWED_EMOJIS[number])) {
    return { error: "Invalid cheer emoji" };
  }

  // Reject self-cheer
  if (user.id === receiverId) {
    return { error: "Cannot cheer yourself" };
  }

  // Find sender's party membership and party timezone
  const { data: senderMembership, error: senderError } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .single();

  if (senderError || !senderMembership) {
    return { error: "You are not a member of any party" };
  }

  const partyId = senderMembership.party_id;

  // Get party timezone
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("timezone")
    .eq("id", partyId)
    .is("deleted_at", null)
    .single();

  if (partyError || !party) {
    return { error: "Party not found" };
  }

  // Verify receiver is in the same party
  const { data: receiverMembership, error: receiverError } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", receiverId)
    .eq("party_id", partyId)
    .single();

  if (receiverError || !receiverMembership) {
    return { error: "Receiver is not in your party" };
  }

  // Check daily rate limit: count cheers from this sender today (party timezone)
  const todayBounds = getTodayBoundsInTimezone(party.timezone);

  const { count, error: countError } = await supabase
    .from("party_cheers")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .gte("created_at", todayBounds.start)
    .lt("created_at", todayBounds.end);

  if (countError) {
    return { error: "Something went wrong" };
  }

  if ((count ?? 0) >= MAX_CHEERS_PER_DAY) {
    return { error: "Daily cheer limit reached" };
  }

  // Insert the cheer
  const { error: insertError } = await supabase
    .from("party_cheers")
    .insert({
      party_id: partyId,
      sender_id: user.id,
      receiver_id: receiverId,
      emoji,
    });

  if (insertError) {
    return { error: "Something went wrong" };
  }

  revalidatePath("/app/party");
  return { success: true };
}

/**
 * getCheers — returns weekly cheer totals per member for the current cycle.
 *
 * Returns a map of receiver_id → cheer count within the party's
 * current cycle_start/cycle_end window.
 *
 * Requirements: 7.6
 */
export async function getCheers(
  partyId: string
): Promise<{ data?: Record<string, number>; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership, error: membershipError } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (membershipError || !membership) {
    return { error: "You are not a member of this party" };
  }

  // Get the party's current cycle boundaries
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("cycle_start, cycle_end")
    .eq("id", partyId)
    .is("deleted_at", null)
    .single();

  if (partyError || !party) {
    return { error: "Party not found" };
  }

  // Count cheers per receiver_id within the cycle window
  const { data: cheerRows, error: cheerError } = await supabase
    .from("party_cheers")
    .select("receiver_id")
    .eq("party_id", partyId)
    .gte("created_at", party.cycle_start)
    .lte("created_at", party.cycle_end);

  if (cheerError) {
    return { error: "Something went wrong" };
  }

  const cheerTotals: Record<string, number> = {};
  if (cheerRows) {
    for (const cheer of cheerRows) {
      cheerTotals[cheer.receiver_id] = (cheerTotals[cheer.receiver_id] ?? 0) + 1;
    }
  }

  return { data: cheerTotals };
}

// ─── Message Actions ────────────────────────────────────────────────

/**
 * sendMessage — Send a message to the user's party.
 *
 * Validates content (1-200 chars, at least 1 non-whitespace),
 * checks blocklist, enforces 20 messages/day rate limit (party timezone),
 * then inserts the message.
 *
 * Requirements: 8.1, 8.2, 8.5, 8.6, 8.7
 */
export async function sendMessage(
  content: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate message length
  if (!content || content.length === 0) {
    return { error: "Message must be 1-200 characters" };
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { error: "Message must be 1-200 characters" };
  }

  // Validate at least 1 non-whitespace character
  if (!content.trim()) {
    return { error: "Message must be 1-200 characters" };
  }

  // Check blocklist
  if (BLOCKLIST_REGEX.test(content)) {
    return { error: "Message not posted due to content restrictions" };
  }

  // Find user's party membership and party timezone
  const { data: membership, error: memberError } = await supabase
    .from("party_members")
    .select("party_id, parties(timezone)")
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return { error: "You are not in a party" };
  }

  const partyId = membership.party_id;
  const partyData = membership.parties as unknown as { timezone: string } | null;
  const timezone = partyData?.timezone ?? "UTC";

  // Check daily rate limit (20 messages per day in party timezone)
  const todayBounds = getTodayBoundsInTimezone(timezone);

  const { count, error: countError } = await supabase
    .from("party_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .eq("party_id", partyId)
    .gte("created_at", todayBounds.start)
    .lt("created_at", todayBounds.end);

  if (countError) {
    return { error: "Something went wrong" };
  }

  if ((count ?? 0) >= MAX_MESSAGES_PER_DAY) {
    return { error: "Daily message limit reached" };
  }

  // Insert message
  const { error: insertError } = await supabase
    .from("party_messages")
    .insert({
      party_id: partyId,
      sender_id: user.id,
      content,
    });

  if (insertError) {
    return { error: "Something went wrong" };
  }

  revalidatePath("/app/party");
  return { success: true };
}

/**
 * getMessages — Fetch 20 most recent messages for a party.
 *
 * Verifies user is a member of the specified party, then returns
 * messages with sender display names, ordered newest first.
 *
 * Requirements: 8.3, 8.4
 */
export async function getMessages(
  partyId: string
): Promise<{ data?: PartyMessageView[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify user is a member of this party
  const { data: membership, error: memberError } = await supabase
    .from("party_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("party_id", partyId)
    .single();

  if (memberError || !membership) {
    return { error: "You are not a member of this party" };
  }

  // Fetch 20 most recent messages
  const { data: messages, error: msgError } = await supabase
    .from("party_messages")
    .select("id, sender_id, content, created_at")
    .eq("party_id", partyId)
    .order("created_at", { ascending: false })
    .limit(MAX_MESSAGES_FETCH);

  if (msgError) {
    return { error: "Something went wrong" };
  }

  if (!messages || messages.length === 0) {
    return { data: [] };
  }

  // Fetch sender display names from profiles
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", senderIds);

  const nameMap: Record<string, string> = {};
  if (profiles) {
    for (const p of profiles) {
      nameMap[p.id] = p.display_name ?? "Unknown";
    }
  }

  // Build response
  const data: PartyMessageView[] = messages.map((m) => ({
    id: m.id,
    senderName: nameMap[m.sender_id] ?? "Unknown",
    content: m.content,
    createdAt: m.created_at,
  }));

  return { data };
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Computes the start and end of "today" in a given IANA timezone as UTC ISO strings.
 * Used for daily rate limiting in the party owner's timezone.
 *
 * Returns { start: midnight today in TZ (as UTC ISO), end: midnight tomorrow in TZ (as UTC ISO) }
 */
function getTodayBoundsInTimezone(timezone: string): { start: string; end: string } {
  const now = new Date();

  // Format current date in the target timezone using en-CA for YYYY-MM-DD format
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dateStr = formatter.format(now); // e.g., "2025-01-15"

  // Find what UTC time corresponds to midnight in the target timezone
  const midnightInTz = getUtcForMidnight(dateStr, timezone);
  const nextMidnightInTz = new Date(midnightInTz.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: midnightInTz.toISOString(),
    end: nextMidnightInTz.toISOString(),
  };
}

/**
 * Given a date string (YYYY-MM-DD) and an IANA timezone, returns the
 * UTC Date object that corresponds to midnight (00:00:00) of that date
 * in the given timezone.
 */
function getUtcForMidnight(dateStr: string, timezone: string): Date {
  // Use noon UTC as a reference point to compute the timezone offset.
  // This avoids DST edge cases that can occur exactly at midnight.
  const noonUtc = new Date(`${dateStr}T12:00:00Z`);
  const tzParts = getDatePartsInTimezone(noonUtc, timezone);

  // Offset in hours: if timezone shows 17:00 when UTC is 12:00, offset is +5h
  const tzHour = tzParts.hour + tzParts.minute / 60;
  const offsetHours = tzHour - 12;

  // Midnight in timezone = midnight UTC minus the offset
  const midnightUtc = new Date(`${dateStr}T00:00:00Z`);
  const offsetMs = offsetHours * 60 * 60 * 1000;
  return new Date(midnightUtc.getTime() - offsetMs);
}

/**
 * Extract date/time parts for a given Date in a specific timezone.
 */
function getDatePartsInTimezone(
  date: Date,
  timezone: string
): { year: string; month: string; day: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
  };
}
