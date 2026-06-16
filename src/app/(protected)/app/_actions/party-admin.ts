"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Utilities ──────────────────────────────────────────────────────

const PARTY_NAME_REGEX = /^[a-zA-Z0-9 \-_]{3,30}$/;

/**
 * Validates party name: 3-30 chars, alphanumeric + space/hyphen/underscore.
 */
function validatePartyName(name: string): string | null {
  if (!name || name.length < 3) {
    return "Party name must be at least 3 characters";
  }
  if (name.length > 30) {
    return "Party name must be at most 30 characters";
  }
  if (!PARTY_NAME_REGEX.test(name)) {
    return "Party name can only contain letters, numbers, spaces, hyphens, and underscores";
  }
  return null; // valid
}

/**
 * Generates a random 8-character alphanumeric invite code.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Admin Actions ──────────────────────────────────────────────────

/**
 * updatePartySettings — allows the party owner to update name and/or visibility.
 *
 * Requirements: 12.1, 12.4
 */
export async function updatePartySettings(input: {
  name?: string;
  visibility?: "public" | "private";
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify caller is the party owner
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();

  if (!membership) {
    return { error: "Insufficient permissions" };
  }

  // Validate name if provided
  if (input.name !== undefined) {
    const nameError = validatePartyName(input.name);
    if (nameError) return { error: nameError };
  }

  // Build update payload
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    updates.name = input.name;
  }
  if (input.visibility !== undefined) {
    updates.visibility = input.visibility;
  }

  const { error: updateError } = await supabase
    .from("parties")
    .update(updates)
    .eq("id", membership.party_id);

  if (updateError) return { error: "Something went wrong" };

  revalidatePath("/app/party");
  return { success: true };
}

/**
 * removeMember — allows the party owner to remove a member from the party.
 *
 * Cannot remove yourself (use leaveParty instead).
 * Contributions to active quests are retained.
 *
 * Requirements: 12.2, 12.4
 */
export async function removeMember(
  memberId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify caller is the party owner
  const { data: ownership } = await supabase
    .from("party_members")
    .select("party_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();

  if (!ownership) {
    return { error: "Insufficient permissions" };
  }

  // Verify the target member belongs to the same party
  const { data: targetMember } = await supabase
    .from("party_members")
    .select("id, user_id, party_id")
    .eq("id", memberId)
    .single();

  if (!targetMember || targetMember.party_id !== ownership.party_id) {
    return { error: "Member not found in your party" };
  }

  // Cannot remove yourself
  if (targetMember.user_id === user.id) {
    return { error: "Cannot remove yourself. Use leave party instead." };
  }

  // Delete the member's party_members row
  // Contributions to active quests are retained (no quest progress modification)
  const { error: deleteError } = await supabase
    .from("party_members")
    .delete()
    .eq("id", memberId);

  if (deleteError) return { error: "Something went wrong" };

  revalidatePath("/app/party");
  return { success: true };
}

/**
 * regenerateInviteCode — generates a new invite code for the party.
 *
 * Invalidates the previous code and sets a fresh 7-day expiry.
 *
 * Requirements: 12.3, 12.4
 */
export async function regenerateInviteCode(): Promise<{
  data?: { inviteCode: string };
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify caller is the party owner
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();

  if (!membership) {
    return { error: "Insufficient permissions" };
  }

  // Generate new code with 7-day expiry
  const newCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("parties")
    .update({
      invite_code: newCode,
      invite_code_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.party_id);

  if (updateError) return { error: "Something went wrong" };

  revalidatePath("/app/party");
  return { data: { inviteCode: newCode } };
}

/**
 * disbandParty — soft-deletes the party and removes all members.
 *
 * Only the party owner can disband. All party_members rows are deleted
 * and the party record is soft-deleted (deleted_at = now).
 *
 * Requirements: 12.4, 12.5
 */
export async function disbandParty(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify caller is the party owner
  const { data: membership } = await supabase
    .from("party_members")
    .select("party_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();

  if (!membership) {
    return { error: "Insufficient permissions" };
  }

  const partyId = membership.party_id;

  // Use admin client to bypass RLS for cleanup operations
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Delete related data first (cheers, messages, quests)
  await admin.from("party_cheers").delete().eq("party_id", partyId);
  await admin.from("party_messages").delete().eq("party_id", partyId);
  await admin.from("party_quests").delete().eq("party_id", partyId);

  // Delete all party_members rows for this party
  const { error: deleteMembersError } = await admin
    .from("party_members")
    .delete()
    .eq("party_id", partyId);

  if (deleteMembersError) return { error: "Failed to remove members: " + deleteMembersError.message };

  // Soft-delete the party record
  const { error: updateError } = await admin
    .from("parties")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", partyId);

  if (updateError) return { error: "Failed to disband: " + updateError.message };

  revalidatePath("/app/party");
  return { success: true };
}
