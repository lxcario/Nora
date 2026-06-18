"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Search } from "lucide-react";
import Link from "next/link";
import {
  discoverParties,
  joinPartyByCode,
  joinPartyPublic,
  type DiscoverableParty,
} from "../../_actions/party";
import { CreatePartyForm } from "./create-party-form";

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
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              {currentParty.name}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              ({currentParty.memberCount} members)
            </span>
          </div>
          <Link
            href="/app/party"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
          >
            View Group →
          </Link>
        </div>
      )}

      {/* Create Party section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Create Group
        </button>

        {showCreateForm && (
          <div className="mt-4">
            <CreatePartyForm />
          </div>
        )}
      </div>

      {/* Join with invite code */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Or join with invite code
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <button
            onClick={handleJoinByCode}
            disabled={joinCodeLoading || !inviteCode.trim() || !!currentParty}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Join
          </button>
        </div>
        {joinCodeError && (
          <p className="mt-2 text-xs text-red-500">{joinCodeError}</p>
        )}
      </div>

      {/* Discoverable public parties */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Users className="h-4 w-4" />
          Public Groups
        </h3>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading groups...</p>
        ) : parties.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              No groups available. Create one!
            </p>
          </div>
        ) : (
          <>
            {joinError && (
              <p className="mb-3 text-xs text-red-500">{joinError}</p>
            )}

            <div className="space-y-3">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {party.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {party.memberCount}/5
                      </span>
                    </div>
                    {party.questSummary.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {party.questSummary.map((quest, i) => (
                          <span
                            key={i}
                            className="text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            {formatQuestType(quest.type)}: {quest.progress}/{quest.target}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoinPublic(party.id)}
                    disabled={!!currentParty || joiningPartyId === party.id}
                    className="ml-3 shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {joiningPartyId === party.id ? "Joining..." : "Join"}
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
