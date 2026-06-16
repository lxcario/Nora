"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── View Interfaces ─────────────────────────────────────────────────

export interface PartyMemberView {
  userId: string;
  displayName: string;
  avatarThumbnail: string | null;
  joinedAt: string;
  contributionCount: number;
  isStudying: boolean;
}

export interface PartyQuestView {
  id: string;
  questType: "cards_reviewed" | "feynman_sessions" | "study_minutes";
  target: number;
  progress: number;
  status: "active" | "completed" | "archived";
  isHelpQuest: boolean;
  helpedMemberName?: string;
  cycleEnd: string;
}

export interface PartyMessageView {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface Party {
  id: string;
  owner_id: string;
  name: string;
  visibility: "public" | "private";
  invite_code: string | null;
  timezone: string;
  cycle_start: string;
  cycle_end: string;
  quest_templates: unknown[];
  created_at: string;
}

export interface PartyStateResult {
  data?: {
    party: Party | null;
    members: PartyMemberView[];
    quests: PartyQuestView[];
    helpQuests: PartyQuestView[];
    recentMessages: PartyMessageView[];
    cheerTotals: Record<string, number>;
    isOwner: boolean;
    inviteCode?: string;
  };
  error?: string;
}

/**
 * getPartyState — main data fetch for the party page.
 *
 * If user is not in a party, returns { data: { party: null } }.
 * If user IS in a party, fetches party details, members with profiles,
 * active quests (regular + help), recent messages, cheer totals,
 * ownership flag, and invite code (owner of private party only).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function getPartyState(): Promise<PartyStateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if user is in a party
  const { data: membership, error: membershipError } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return { data: { party: null, members: [], quests: [], helpQuests: [], recentMessages: [], cheerTotals: {}, isOwner: false } };
  }

  const partyId = membership.party_id;

  // Use admin client to bypass RLS for cross-user profile/avatar queries
  const admin = createAdminClient();

  // Fetch party details
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("id, owner_id, name, visibility, invite_code, timezone, cycle_start, cycle_end, quest_templates, created_at")
    .eq("id", partyId)
    .single();

  if (partyError || !party) {
    return { error: "Party not found" };
  }

  // Fetch all members ordered by joined_at ASC
  const { data: memberRows } = await supabase
    .from("party_members")
    .select("user_id, joined_at")
    .eq("party_id", partyId)
    .order("joined_at", { ascending: true });

  const members: PartyMemberView[] = [];
  if (memberRows && memberRows.length > 0) {
    const userIds = memberRows.map((m) => m.user_id);

    // Fetch profiles (display_name) via admin client to bypass RLS
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    // Fetch avatars via admin client
    const { data: avatars } = await admin
      .from("avatars")
      .select("user_id, body")
      .in("user_id", userIds);

    // Check for active study sessions (presence: ended_at IS NULL, started within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: activeSessions } = await admin
      .from("study_sessions")
      .select("user_id")
      .in("user_id", userIds)
      .is("ended_at", null)
      .gte("started_at", twoHoursAgo);

    const studyingUserIds = new Set(activeSessions?.map((s) => s.user_id) ?? []);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const avatarMap = new Map(avatars?.map((a) => [a.user_id, a]) ?? []);

    for (const m of memberRows) {
      const profile = profileMap.get(m.user_id);
      const avatar = avatarMap.get(m.user_id);
      members.push({
        userId: m.user_id,
        displayName: profile?.display_name ?? "Unknown",
        avatarThumbnail: avatar?.body ?? null,
        joinedAt: m.joined_at,
        contributionCount: 0, // computed below from quest activity
        isStudying: studyingUserIds.has(m.user_id),
      });
    }
  }

  // Fetch active party quests (regular + help)
  const { data: questRows } = await supabase
    .from("party_quests")
    .select("id, quest_type, target, progress, status, is_help_quest, helped_user_id, cycle_end")
    .eq("party_id", partyId)
    .eq("status", "active");

  const quests: PartyQuestView[] = [];
  const helpQuests: PartyQuestView[] = [];

  if (questRows && questRows.length > 0) {
    // For help quests, fetch the helped member's display_name
    const helpedUserIds = questRows
      .filter((q) => q.is_help_quest && q.helped_user_id)
      .map((q) => q.helped_user_id!);

    let helpedProfileMap = new Map<string, string>();
    if (helpedUserIds.length > 0) {
      const { data: helpedProfiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", helpedUserIds);

      helpedProfileMap = new Map(
        helpedProfiles?.map((p) => [p.id, p.display_name ?? "Unknown"]) ?? []
      );
    }

    for (const q of questRows) {
      const questView: PartyQuestView = {
        id: q.id,
        questType: q.quest_type as PartyQuestView["questType"],
        target: q.target,
        progress: q.progress,
        status: q.status as PartyQuestView["status"],
        isHelpQuest: q.is_help_quest ?? false,
        cycleEnd: q.cycle_end,
      };

      if (q.is_help_quest && q.helped_user_id) {
        questView.helpedMemberName = helpedProfileMap.get(q.helped_user_id) ?? "Unknown";
        helpQuests.push(questView);
      } else {
        quests.push(questView);
      }
    }
  }

  // Fetch 20 most recent party messages with sender display_name
  const { data: messageRows } = await supabase
    .from("party_messages")
    .select("id, sender_id, content, created_at")
    .eq("party_id", partyId)
    .order("created_at", { ascending: false })
    .limit(20);

  const recentMessages: PartyMessageView[] = [];
  if (messageRows && messageRows.length > 0) {
    // Gather unique sender IDs for display_name lookup
    const senderIds = [...new Set(messageRows.map((m) => m.sender_id))];
    const { data: senderProfiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", senderIds);

    const senderMap = new Map(
      senderProfiles?.map((p) => [p.id, p.display_name ?? "Unknown"]) ?? []
    );

    for (const msg of messageRows) {
      recentMessages.push({
        id: msg.id,
        senderName: senderMap.get(msg.sender_id) ?? "Unknown",
        content: msg.content,
        createdAt: msg.created_at,
      });
    }
  }

  // Compute cheer totals for current cycle: COUNT cheers per receiver_id
  // WHERE created_at between cycle_start and cycle_end
  const { data: cheerRows } = await supabase
    .from("party_cheers")
    .select("receiver_id")
    .eq("party_id", partyId)
    .gte("created_at", party.cycle_start)
    .lte("created_at", party.cycle_end);

  const cheerTotals: Record<string, number> = {};
  if (cheerRows) {
    for (const cheer of cheerRows) {
      cheerTotals[cheer.receiver_id] = (cheerTotals[cheer.receiver_id] ?? 0) + 1;
    }
  }

  // Determine ownership
  const isOwner = party.owner_id === user.id;

  // Include invite_code only if user is owner AND party is private
  const inviteCode =
    isOwner && party.visibility === "private" ? (party.invite_code ?? undefined) : undefined;

  return {
    data: {
      party: {
        id: party.id,
        owner_id: party.owner_id,
        name: party.name,
        visibility: party.visibility as "public" | "private",
        invite_code: party.invite_code,
        timezone: party.timezone,
        cycle_start: party.cycle_start,
        cycle_end: party.cycle_end,
        quest_templates: (party.quest_templates as unknown[]) ?? [],
        created_at: party.created_at,
      },
      members,
      quests,
      helpQuests,
      recentMessages,
      cheerTotals,
      isOwner,
      inviteCode,
    },
  };
}

/**
 * leaveParty — removes the current user from their party.
 *
 * Ownership transfer logic:
 * - If user is the last member: soft-delete the party (sets deleted_at).
 * - If user is the owner AND other members remain: transfer ownership to
 *   the member with the earliest joined_at. Tiebreak: alphanumerically-first user_id.
 * - Contributions toward active quests are retained as-is.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export async function leaveParty(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find the user's party_members row
  const { data: membership, error: membershipError } = await supabase
    .from("party_members")
    .select("id, party_id, role")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return { error: "You are not a member of any party" };
  }

  const { party_id, role } = membership;

  // Get all members of the party (excluding the leaving user)
  const { data: allMembers, error: membersError } = await supabase
    .from("party_members")
    .select("id, user_id, role, joined_at")
    .eq("party_id", party_id);

  if (membersError || !allMembers) {
    return { error: "Failed to retrieve party members" };
  }

  const remainingMembers = allMembers.filter((m) => m.user_id !== user.id);

  // Case 1: User is the last member — soft-delete the party
  if (remainingMembers.length === 0) {
    const { error: deletePartyError } = await supabase
      .from("parties")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", party_id);

    if (deletePartyError) {
      return { error: "Failed to delete party" };
    }

    // Delete the user's membership row
    const { error: deleteMemberError } = await supabase
      .from("party_members")
      .delete()
      .eq("id", membership.id);

    if (deleteMemberError) {
      return { error: "Failed to remove membership" };
    }

    revalidatePath("/app/party");
    return { success: true };
  }

  // Case 2: User is the owner AND other members remain — transfer ownership
  if (role === "owner") {
    // Find the member with earliest joined_at; tiebreak by alphanumeric user_id
    const newOwner = remainingMembers.sort((a, b) => {
      const joinedCompare = new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      if (joinedCompare !== 0) return joinedCompare;
      return a.user_id.localeCompare(b.user_id);
    })[0];

    // Transfer party ownership
    const { error: transferError } = await supabase
      .from("parties")
      .update({ owner_id: newOwner.user_id, updated_at: new Date().toISOString() })
      .eq("id", party_id);

    if (transferError) {
      return { error: "Failed to transfer ownership" };
    }

    // Update new owner's role in party_members
    const { error: roleError } = await supabase
      .from("party_members")
      .update({ role: "owner" })
      .eq("id", newOwner.id);

    if (roleError) {
      return { error: "Failed to update new owner role" };
    }
  }

  // Delete the user's membership row
  const { error: deleteMemberError } = await supabase
    .from("party_members")
    .delete()
    .eq("id", membership.id);

  if (deleteMemberError) {
    return { error: "Failed to remove membership" };
  }

  // Contributions toward active quests are NOT modified (retained as-is)

  revalidatePath("/app/party");
  return { success: true };
}

// ─── Types ──────────────────────────────────────────────────────────

export interface DiscoverableParty {
  id: string;
  name: string;
  memberCount: number;
  questSummary: { type: string; progress: number; target: number }[];
}

interface DiscoverPartiesResult {
  data?: {
    parties: DiscoverableParty[];
    page: number;
    totalPages: number;
    currentParty: { name: string; memberCount: number } | null;
  };
  error?: string;
}

// ─── Discovery ──────────────────────────────────────────────────────

const PARTIES_PER_PAGE = 20;

/**
 * Browse public parties that have available capacity (<5 members).
 * Returns paginated results with quest summaries, plus the user's
 * current party info (if any) for UI hints.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function discoverParties(page: number = 1): Promise<DiscoverPartiesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // ── Check if the current user is already in a party (for UI hint) ──
  let currentParty: { name: string; memberCount: number } | null = null;

  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .single();

  if (membership) {
    const { data: partyInfo } = await supabase
      .from("parties")
      .select("name")
      .eq("id", membership.party_id)
      .is("deleted_at", null)
      .single();

    if (partyInfo) {
      const { count: memberCount } = await supabase
        .from("party_members")
        .select("id", { count: "exact", head: true })
        .eq("party_id", membership.party_id);

      currentParty = {
        name: partyInfo.name,
        memberCount: memberCount ?? 0,
      };
    }
  }

  // ── Get all public non-deleted parties, ordered by created_at DESC ──
  const { data: allPublicParties, error: fetchError } = await supabase
    .from("parties")
    .select("id, name, created_at")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (fetchError) return { error: "Something went wrong" };
  if (!allPublicParties || allPublicParties.length === 0) {
    return {
      data: {
        parties: [],
        page: 1,
        totalPages: 0,
        currentParty,
      },
    };
  }

  // ── Get member counts for these parties ──
  const partyIds = allPublicParties.map((p) => p.id);
  const { data: memberRows } = await supabase
    .from("party_members")
    .select("party_id")
    .in("party_id", partyIds);

  // Build a map of party_id → member count
  const countMap: Record<string, number> = {};
  for (const row of memberRows ?? []) {
    countMap[row.party_id] = (countMap[row.party_id] ?? 0) + 1;
  }

  // ── Filter to parties with < 5 members ──
  const eligibleParties = allPublicParties.filter((p) => {
    const count = countMap[p.id] ?? 0;
    return count < 5;
  });

  const totalCount = eligibleParties.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PARTIES_PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const offset = (safePage - 1) * PARTIES_PER_PAGE;

  // ── Paginate ──
  const pageParties = eligibleParties.slice(offset, offset + PARTIES_PER_PAGE);

  if (pageParties.length === 0) {
    return {
      data: {
        parties: [],
        page: safePage,
        totalPages,
        currentParty,
      },
    };
  }

  // ── Get active quest summaries for the page parties (up to 3 per party) ──
  const pagePartyIds = pageParties.map((p) => p.id);
  const { data: quests } = await supabase
    .from("party_quests")
    .select("party_id, quest_type, progress, target")
    .in("party_id", pagePartyIds)
    .eq("status", "active");

  // Build quest summaries grouped by party (max 3 per party)
  const questMap: Record<string, { type: string; progress: number; target: number }[]> = {};
  for (const quest of quests ?? []) {
    if (!questMap[quest.party_id]) {
      questMap[quest.party_id] = [];
    }
    if (questMap[quest.party_id].length < 3) {
      questMap[quest.party_id].push({
        type: quest.quest_type,
        progress: quest.progress,
        target: quest.target,
      });
    }
  }

  // ── Assemble final results ──
  const parties: DiscoverableParty[] = pageParties.map((p) => ({
    id: p.id,
    name: p.name,
    memberCount: countMap[p.id] ?? 0,
    questSummary: questMap[p.id] ?? [],
  }));

  return {
    data: {
      parties,
      page: safePage,
      totalPages,
      currentParty,
    },
  };
}

// ─── Create Party ───────────────────────────────────────────────────

interface CreatePartyInput {
  name: string;
  visibility: "public" | "private";
}

/**
 * createParty — creates a new party with the current user as owner.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
export async function createParty(
  input: CreatePartyInput
): Promise<{ data?: { partyId: string; inviteCode?: string }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate party name: 3-30 chars, only alphanumeric + space/hyphen/underscore
  const nameRegex = /^[a-zA-Z0-9 _-]{3,30}$/;
  if (!nameRegex.test(input.name)) {
    return { error: "Party name must be 3-30 characters and contain only letters, numbers, spaces, hyphens, and underscores" };
  }

  // Check user not already in a party
  const { data: existing } = await supabase
    .from("party_members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { error: "You must leave your current party first" };
  }

  // Get user timezone from profile
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";

  // Compute cycle boundaries (Monday 00:00 to Sunday 23:59 in owner TZ)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const cycleStart = new Date(now);
  cycleStart.setDate(cycleStart.getDate() - daysUntilMonday);
  cycleStart.setHours(0, 0, 0, 0);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 6);
  cycleEnd.setHours(23, 59, 59, 999);

  // Generate invite code for private parties
  const inviteCode =
    input.visibility === "private" ? generateInviteCode() : null;
  const inviteCodeExpiresAt =
    input.visibility === "private"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  // Insert party
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .insert({
      owner_id: user.id,
      name: input.name,
      visibility: input.visibility,
      invite_code: inviteCode,
      invite_code_expires_at: inviteCodeExpiresAt,
      timezone,
      cycle_start: cycleStart.toISOString(),
      cycle_end: cycleEnd.toISOString(),
      quest_templates: [],
    })
    .select("id")
    .single();

  if (partyError || !party) {
    console.error("Create party error:", partyError);
    return { error: partyError?.message ?? "Failed to create party" };
  }

  // Insert owner as first member
  const { error: memberError } = await supabase.from("party_members").insert({
    party_id: party.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: "Failed to add owner as member" };
  }

  revalidatePath("/app/party");
  return {
    data: {
      partyId: party.id,
      inviteCode: inviteCode ?? undefined,
    },
  };
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Join Party ─────────────────────────────────────────────────────

/**
 * joinPartyByCode — join a private party using an invite code.
 *
 * Requirements: 2.1, 2.3, 2.4, 2.6
 */
export async function joinPartyByCode(
  code: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check user not already in a party
  const { data: existing } = await supabase
    .from("party_members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { error: "You must leave your current party first" };
  }

  // Find the party with this invite code
  const admin = createAdminClient();
  const { data: party } = await admin
    .from("parties")
    .select("id, invite_code_expires_at")
    .eq("invite_code", code.trim())
    .is("deleted_at", null)
    .single();

  if (!party) {
    return { error: "Invite code is invalid or expired" };
  }

  // Check expiry
  if (
    party.invite_code_expires_at &&
    new Date(party.invite_code_expires_at) < new Date()
  ) {
    return { error: "Invite code is invalid or expired" };
  }

  // Check party capacity
  const { count } = await admin
    .from("party_members")
    .select("id", { count: "exact", head: true })
    .eq("party_id", party.id);

  if ((count ?? 0) >= 5) {
    return { error: "This party is full" };
  }

  // Insert membership
  const { error: joinError } = await supabase.from("party_members").insert({
    party_id: party.id,
    user_id: user.id,
    role: "member",
  });

  if (joinError) {
    return { error: "Failed to join party" };
  }

  revalidatePath("/app/party");
  return { success: true };
}

/**
 * joinPartyPublic — join a public party by ID.
 *
 * Requirements: 2.2, 2.3, 2.4
 */
export async function joinPartyPublic(
  partyId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check user not already in a party
  const { data: existing } = await supabase
    .from("party_members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { error: "You must leave your current party first" };
  }

  // Validate party is public and not deleted
  const admin = createAdminClient();
  const { data: party } = await admin
    .from("parties")
    .select("id, visibility")
    .eq("id", partyId)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .single();

  if (!party) {
    return { error: "Party not found" };
  }

  // Check party capacity
  const { count } = await admin
    .from("party_members")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId);

  if ((count ?? 0) >= 5) {
    return { error: "This party is full" };
  }

  // Insert membership
  const { error: joinError } = await supabase.from("party_members").insert({
    party_id: partyId,
    user_id: user.id,
    role: "member",
  });

  if (joinError) {
    return { error: "Failed to join party" };
  }

  revalidatePath("/app/party");
  return { success: true };
}
