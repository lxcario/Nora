"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  discoverParties,
  joinPartyByCode,
  joinPartyPublic,
  type DiscoverableParty,
} from "../../_actions/party";
import { CreatePartyForm } from "./create-party-form";
import {
  DialogFrame,
  PixelButton,
  PixelInput,
  LoadingSkeleton,
  EmptyState,
} from "@/components/pixel-ui";

interface PartyDiscoveryProps {
  currentParty?: { name: string; memberCount: number } | null;
}

export function PartyDiscovery({ currentParty: propCurrentParty }: PartyDiscoveryProps = {}) {
  const [parties, setParties] = useState<DiscoverableParty[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentParty, setCurrentParty] = useState(propCurrentParty ?? null);
  const [loading, setLoading] = useState(true);

  // Create party form toggle
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Invite code state
  const [inviteCode, setInviteCode] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);

  // Join public party state
  const [joiningPartyId, setJoiningPartyId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    loadParties(page);
  }, [page]);

  async function loadParties(p: number) {
    setLoading(true);
    const result = await discoverParties(p);
    if (result.data) {
      setParties(result.data.parties);
      setTotalPages(result.data.totalPages);
      if (result.data.currentParty) {
        setCurrentParty(result.data.currentParty);
      }
    }
    setLoading(false);
  }

  async function handleJoinByCode() {
    if (!inviteCode.trim()) return;
    setJoinCodeError("");
    setJoinCodeLoading(true);
    const result = await joinPartyByCode(inviteCode.trim());
    if (result.error) {
      setJoinCodeError(result.error);
    }
    setJoinCodeLoading(false);
  }

  async function handleJoinPublic(partyId: string) {
    setJoinError("");
    setJoiningPartyId(partyId);
    const result = await joinPartyPublic(partyId);
    if (result.error) {
      setJoinError(result.error);
    }
    setJoiningPartyId(null);
  }

  function formatQuestType(type: string): string {
    switch (type) {
      case "cards_reviewed":
        return "Cards";
      case "feynman_sessions":
        return "Feynman";
      case "study_minutes":
        return "Minutes";
      default:
        return type;
    }
  }

  return (
    <div className="space-y-6">
      {/* Current party info banner */}
      {currentParty && (
        <div
          className="pixel-panel flex items-center justify-between gap-3 p-3"
          style={{ backgroundColor: "color-mix(in srgb, var(--pixel-accent) 12%, var(--pixel-bg-surface))" }}
        >
          <div className="flex items-center gap-2">
            <img src="/sprites/travel-book/icons/Team.png" alt="" width={16} height={16} className="pixel-art" />
            <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
              {currentParty.name}
            </span>
            <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
              ({currentParty.memberCount} members)
            </span>
          </div>
          <Link
            href="/app/party"
            className="font-pixel text-[10px]"
            style={{ color: "var(--pixel-accent)" }}
          >
            View Group →
          </Link>
        </div>
      )}

      {/* Create Party section */}
      <DialogFrame title="CREATE A GROUP">
        <PixelButton
          variant="primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? "Cancel" : "Create Group"}
        </PixelButton>

        {showCreateForm && (
          <div className="mt-4">
            <CreatePartyForm />
          </div>
        )}
      </DialogFrame>

      {/* Join with invite code */}
      <DialogFrame title="JOIN WITH INVITE CODE">
        <div className="flex gap-2">
          <div className="flex-1">
            <PixelInput
              type="search"
              placeholder="Enter invite code..."
              value={inviteCode}
              onChange={(v) => setInviteCode(v as string)}
            />
          </div>
          <PixelButton
            variant="primary"
            size="small"
            onClick={handleJoinByCode}
            disabled={joinCodeLoading || !inviteCode.trim() || !!currentParty}
            loading={joinCodeLoading}
          >
            Join
          </PixelButton>
        </div>
        {joinCodeError && (
          <p className="mt-2 font-pixel text-[10px]" style={{ color: "var(--pixel-error)" }}>
            {joinCodeError}
          </p>
        )}
      </DialogFrame>

      {/* Discoverable public parties */}
      <DialogFrame title="PUBLIC GROUPS">
        {loading ? (
          <LoadingSkeleton lines={4} />
        ) : parties.length === 0 ? (
          <EmptyState
            icon="team"
            message="No groups available yet. Create one and invite friends!"
          />
        ) : (
          <>
            {joinError && (
              <p className="mb-3 font-pixel text-[10px]" style={{ color: "var(--pixel-error)" }}>
                {joinError}
              </p>
            )}

            <div className="space-y-2">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="pixel-panel pixel-panel-inset flex items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--pixel-text-primary)" }}>
                        {party.name}
                      </span>
                      <span
                        className="font-pixel text-[9px] px-1.5 py-0.5"
                        style={{
                          color: "var(--pixel-text-secondary)",
                          border: "1px solid var(--pixel-border)",
                        }}
                      >
                        {party.memberCount}/5
                      </span>
                    </div>
                    {party.questSummary.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {party.questSummary.map((quest, i) => (
                          <span
                            key={i}
                            className="text-xs"
                            style={{ color: "var(--pixel-text-muted)" }}
                          >
                            {formatQuestType(quest.type)}: {quest.progress}/{quest.target}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <PixelButton
                    variant="primary"
                    size="small"
                    onClick={() => handleJoinPublic(party.id)}
                    disabled={!!currentParty || joiningPartyId === party.id}
                    loading={joiningPartyId === party.id}
                  >
                    Join
                  </PixelButton>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <PixelButton
                  variant="secondary"
                  size="small"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </PixelButton>
                <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
                  Page {page} of {totalPages}
                </span>
                <PixelButton
                  variant="secondary"
                  size="small"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </PixelButton>
              </div>
            )}
          </>
        )}
      </DialogFrame>
    </div>
  );
}
