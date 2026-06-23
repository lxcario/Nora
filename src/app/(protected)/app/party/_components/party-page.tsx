"use client";

import { useState } from "react";
import type { PartyStateResult } from "../../_actions/party";
import { leaveParty } from "../../_actions/party";
import { PartyQuests } from "./party-quests";
import { PartyMembers } from "./party-members";
import { PartyCheers } from "./party-cheers";
import { PartyMessages } from "./party-messages";
import { PartyAdmin } from "./party-admin";
import { DialogFrame, PixelButton, PixelConfirmDialog } from "@/components/pixel-ui";

// ─── Props ────────────────────────────────────────────────────────────

interface PartyPageProps {
  state: NonNullable<PartyStateResult["data"]>;
  currentUserId: string;
}

/**
 * Main party view — rendered when the user is a member of a party.
 * Displays party header, members, quests, messages, cheers, admin (owner only),
 * and a leave button for all members.
 */
export function PartyPage({ state, currentUserId }: PartyPageProps) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const handleLeaveConfirm = async () => {
    setConfirmLeave(false);
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
      {/* Leave confirmation dialog */}
      <PixelConfirmDialog
        open={confirmLeave}
        title="Leave this group?"
        message="Are you sure you want to leave? You'll need a new invite to rejoin."
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={handleLeaveConfirm}
        onCancel={() => setConfirmLeave(false)}
      />

      {/* 1. Party Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-pixel text-lg" style={{ color: "var(--pixel-accent)" }}>
          {state.party?.name}
        </h2>
        <span
          className="pixel-panel pixel-panel-inset flex items-center gap-1 px-2 py-0.5 font-pixel text-[9px]"
          style={{ color: "var(--pixel-text-secondary)" }}
        >
          <img src="/sprites/travel-book/icons/Team.png" alt="" width={12} height={12} className="pixel-art" />
          {state.members.length}
        </span>
        <span
          className="pixel-panel pixel-panel-inset flex items-center gap-1 px-2 py-0.5 font-pixel text-[9px]"
          style={{ color: "var(--pixel-text-secondary)" }}
        >
          {state.party?.visibility === "public" ? "Public" : "Private"}
        </span>
        {state.isOwner && (
          <span
            className="pixel-panel pixel-panel-inset flex items-center gap-1 px-2 py-0.5 font-pixel text-[9px]"
            style={{ color: "var(--pixel-accent)" }}
          >
            <img src="/sprites/travel-book/icons/Trophy.png" alt="" width={10} height={10} className="pixel-art" />
            Owner
          </span>
        )}
      </div>

      {/* 2. Members Section */}
      <DialogFrame title="MEMBERS">
        <PartyMembers members={state.members} />
      </DialogFrame>

      {/* 3. Quests Section */}
      <DialogFrame title="QUESTS">
        <PartyQuests quests={state.quests} helpQuests={state.helpQuests} partyId={state.party?.id ?? ""} />
      </DialogFrame>

      {/* 4. Messages Section */}
      <DialogFrame title="MESSAGES">
        <PartyMessages messages={state.recentMessages} />
      </DialogFrame>

      {/* 5. Cheers Section */}
      <DialogFrame title="CHEERS">
        <PartyCheers members={state.members} cheerTotals={state.cheerTotals} currentUserId={currentUserId} />
      </DialogFrame>

      {/* 6. Admin Section (owner only) */}
      {state.isOwner && state.party && (
        <DialogFrame title="ADMINISTRATION">
          <PartyAdmin
            partyName={state.party.name}
            visibility={state.party.visibility}
            inviteCode={state.inviteCode}
            members={state.members
              .filter((m) => m.userId !== state.party!.owner_id)
              .map((m) => ({ userId: m.userId, displayName: m.displayName }))}
          />
        </DialogFrame>
      )}

      {/* 7. Leave Button */}
      <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
        {error && (
          <p className="mb-2 font-pixel text-[10px]" style={{ color: "var(--pixel-error)" }}>
            {error}
          </p>
        )}
        <PixelButton
          variant="danger"
          size="small"
          onClick={() => setConfirmLeave(true)}
          disabled={leaving}
          loading={leaving}
        >
          Leave Group
        </PixelButton>
      </div>
    </div>
  );
}
