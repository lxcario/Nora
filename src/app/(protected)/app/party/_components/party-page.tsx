"use client";

import { useState } from "react";
import { Crown, Globe, Lock, LogOut, Users } from "lucide-react";
import type { PartyStateResult } from "../../_actions/party";
import { leaveParty } from "../../_actions/party";
import { PartyQuests } from "./party-quests";
import { PartyMembers } from "./party-members";
import { PartyCheers } from "./party-cheers";

import { PartyMessages } from "./party-messages";
import { PartyAdmin } from "./party-admin";

// ─── Props ────────────────────────────────────────────────────────────

interface PartyPageProps {
  state: NonNullable<PartyStateResult["data"]>;
  currentUserId: string;
}

/**
 * Main party view — rendered when the user is a member of a party.
 * Displays party header, members, quests, messages, cheers, admin (owner only),
 * and a leave button for all members.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
export function PartyPage({ state, currentUserId }: PartyPageProps) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this party? This action cannot be undone."
    );
    if (!confirmed) return;

    setLeaving(true);
    setError(null);

    const result = await leaveParty();
    if (result.error) {
      setError(result.error);
      setLeaving(false);
    }
    // On success, the page will revalidate and show discovery view
  };

  return (
    <div className="space-y-6">
      {/* 1. Party Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{state.party?.name}</h2>
        <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <Users className="h-3 w-3" />
          {state.members.length}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {state.party?.visibility === "public" ? (
            <>
              <Globe className="h-3 w-3" />
              Public
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" />
              Private
            </>
          )}
        </span>
        {state.isOwner && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            <Crown className="h-3 w-3" />
            Owner
          </span>
        )}
      </div>

      {/* 2. Members Section */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Members</h3>
        <PartyMembers members={state.members} />
      </section>

      {/* 3. Quests Section */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Quests</h3>
        <PartyQuests quests={state.quests} helpQuests={state.helpQuests} />
      </section>

      {/* 4. Messages Section */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Messages</h3>
        <PartyMessages messages={state.recentMessages} />
      </section>

      {/* 5. Cheers Section */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Cheers</h3>
        <PartyCheers members={state.members} cheerTotals={state.cheerTotals} currentUserId={currentUserId} />
      </section>

      {/* 6. Admin Section (owner only) */}
      {state.isOwner && state.party && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Administration
          </h3>
          <PartyAdmin
            partyName={state.party.name}
            visibility={state.party.visibility}
            inviteCode={state.inviteCode}
            members={state.members
              .filter((m) => m.userId !== state.party!.owner_id)
              .map((m) => ({ userId: m.userId, displayName: m.displayName }))}
          />
        </section>
      )}

      {/* 7. Leave Button */}
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          <LogOut className="h-4 w-4" />
          {leaving ? "Leaving…" : "Leave Party"}
        </button>
      </div>
    </div>
  );
}
