"use client";

import { useState, useTransition } from "react";
import type { PartyMemberView } from "../../_actions/party";
import { sendCheer } from "../../_actions/party-social";

// ─── Types ────────────────────────────────────────────────────────────

interface PartyCheersProps {
  members: PartyMemberView[];
  cheerTotals: Record<string, number>;
  currentUserId: string;
}

// ─── Constants ────────────────────────────────────────────────────────

import { Flame, Star, Heart, Rocket, Sparkles, ThumbsUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CHEER_EMOJIS: { key: string; label: string; icon: LucideIcon; color: string }[] = [
  { key: "fire", label: "Fire", icon: Flame, color: "text-orange-500" },
  { key: "star", label: "Star", icon: Star, color: "text-yellow-400" },
  { key: "clap", label: "Clap", icon: ThumbsUp, color: "text-blue-400" },
  { key: "heart", label: "Heart", icon: Heart, color: "text-red-500" },
  { key: "rocket", label: "Rocket", icon: Rocket, color: "text-purple-400" },
  { key: "sparkles", label: "Sparkles", icon: Sparkles, color: "text-emerald-400" },
];

// ─── Component ────────────────────────────────────────────────────────

/**
 * PartyCheers — Send emoji cheers to party members and view weekly totals.
 *
 * Features:
 * - 6 cheer emoji buttons
 * - Target selector (dropdown) excluding current user
 * - "Send Cheer" action calls sendCheer server action
 * - Weekly cheer totals per member
 * - Rate limit error display
 * - Self-cheer prevention (current user not selectable)
 *
 * Requirements: 7.1, 7.2, 7.5, 7.6
 */
export function PartyCheers({ members, cheerTotals, currentUserId }: PartyCheersProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>("fire");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Exclude current user from target list
  const cheerableMembers = members.filter((m) => m.userId !== currentUserId);

  const handleSendCheer = () => {
    if (!selectedTarget) {
      setError("Please select a member to cheer");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await sendCheer(selectedTarget, selectedEmoji);

      if (result.error) {
        setError(result.error);
      } else {
        const targetMember = cheerableMembers.find((m) => m.userId === selectedTarget);
        const emojiData = CHEER_EMOJIS.find((e) => e.key === selectedEmoji);
        setSuccess(
          `Cheer (${emojiData?.label ?? selectedEmoji}) sent to ${targetMember?.displayName ?? "member"}!`
        );
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      {/* Send Cheer Section */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Send a Cheer
        </p>

        {/* Emoji Selection */}
        <div className="flex flex-wrap gap-2">
          {CHEER_EMOJIS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedEmoji(item.key)}
              title={item.label}
              className={`rounded-md px-3 py-2 text-lg transition-colors ${
                selectedEmoji === item.key
                  ? "bg-indigo-100 ring-2 ring-indigo-400 dark:bg-indigo-900 dark:ring-indigo-500"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              }`}
            >
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </button>
          ))}
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Select a member…</option>
            {cheerableMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSendCheer}
            disabled={isPending || !selectedTarget}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isPending ? "Sending…" : "Send Cheer"}
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        )}
      </div>

      {/* Weekly Cheer Totals */}
      <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Weekly Cheers
        </p>

        {members.length === 0 ? (
          <p className="text-sm text-zinc-400">No members yet.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between rounded-md px-2 py-1 text-sm"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {member.displayName}
                  {member.userId === currentUserId && (
                    <span className="ml-1 text-xs text-zinc-400">(you)</span>
                  )}
                </span>
                <span className="flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {cheerTotals[member.userId] ?? 0}
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
