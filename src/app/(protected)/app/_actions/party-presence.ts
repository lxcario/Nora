"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────────────────

export interface PartyPresenceMember {
  userId: string;
  displayName: string;
  avatarThumbnail: string | null;
  startedAt: string;
}

interface PartyPresenceResult {
  data?: {
    members: PartyPresenceMember[];
  };
  error?: string;
}

// ─── getPartyPresence ───────────────────────────────────────────────

/**
 * Returns up to 4 party members who are currently studying (have an active
 * study session: ended_at IS NULL, started_at within last 2 hours).
 *
 * Also updates the calling user's `last_seen_at` in party_members to now().
 *
 * If the user is not in a party, returns an empty members array.
 * If no members are studying, returns an empty array (UI hides presence area).
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export async function getPartyPresence(): Promise<PartyPresenceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find the user's party via party_members
  const { data: membership, error: membershipError } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return { data: { members: [] } };
  }

  const partyId = membership.party_id;
  const admin = createAdminClient();

  // Update calling user's last_seen_at to now()
  await admin
    .from("party_members")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("party_id", partyId)
    .eq("user_id", user.id);

  // Get all party member user IDs
  const { data: memberRows } = await admin
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId);

  if (!memberRows || memberRows.length === 0) {
    return { data: { members: [] } };
  }

  const memberUserIds = memberRows.map((m) => m.user_id);

  // Query study_sessions for active sessions:
  // ended_at IS NULL AND started_at > (now - 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: activeSessions } = await admin
    .from("study_sessions")
    .select("user_id, started_at")
    .in("user_id", memberUserIds)
    .is("ended_at", null)
    .gte("started_at", twoHoursAgo)
    .order("started_at", { ascending: false })
    .limit(4);

  if (!activeSessions || activeSessions.length === 0) {
    return { data: { members: [] } };
  }

  // Deduplicate by user_id (keep most recent session per user), limit to 4
  const seenUsers = new Set<string>();
  const uniqueSessions: { user_id: string; started_at: string }[] = [];
  for (const session of activeSessions) {
    if (!seenUsers.has(session.user_id)) {
      seenUsers.add(session.user_id);
      uniqueSessions.push(session);
    }
    if (uniqueSessions.length >= 4) break;
  }

  if (uniqueSessions.length === 0) {
    return { data: { members: [] } };
  }

  const studyingUserIds = uniqueSessions.map((s) => s.user_id);

  // Fetch profiles (display_name) for studying members
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", studyingUserIds);

  // Fetch avatars for studying members
  const { data: avatars } = await admin
    .from("avatars")
    .select("user_id, body")
    .in("user_id", studyingUserIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);
  const avatarMap = new Map(avatars?.map((a) => [a.user_id, a.body]) ?? []);

  // Build result ordered by started_at DESC (most recent first)
  const members: PartyPresenceMember[] = uniqueSessions.map((session) => ({
    userId: session.user_id,
    displayName: profileMap.get(session.user_id) ?? "Unknown",
    avatarThumbnail: avatarMap.get(session.user_id) ?? null,
    startedAt: session.started_at,
  }));

  return { data: { members } };
}
