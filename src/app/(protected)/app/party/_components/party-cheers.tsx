"use client";

import { useState, useTransition } from "react";
import type { PartyMemberView } from "../../_actions/party";
import { sendCheer } from "../../_actions/party-social";
import { PixelButton } from "@/components/pixel-ui";

// ─── Constants ────────────────────────────────────────────────────────

const CHEER_EMOJIS = [
  { key: "fire",     emoji: "🔥", label: "Fire"     },
  { key: "star",     emoji: "⭐", label: "Star"     },
  { key: "clap",     emoji: "👏", label: "Clap"     },
  { key: "heart",    emoji: "💜", label: "Heart"    },
  { key: "rocket",   emoji: "🚀", label: "Rocket"   },
  { key: "sparkles", emoji: "✨", label: "Sparkles" },
];

// ─── Component ────────────────────────────────────────────────────────

interface PartyCheersProps {
  members: PartyMemberView[];
  cheerTotals: Record<string, number>;
  currentUserId: string;
}

export function PartyCheers({ members, cheerTotals, currentUserId }: PartyCheersProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>("fire");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          `${emojiData?.emoji ?? "✨"} Sent to ${targetMember?.displayName ?? "member"}!`
        );
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Send Cheer Section */}
      <div className="space-y-3">
        <p className="font-pixel text-[11px] uppercase" style={{ color: "var(--pixel-text-secondary)" }}>
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
              className="pixel-panel px-3 py-2 text-lg transition-all"
              style={{
                backgroundColor:
                  selectedEmoji === item.key
                    ? "color-mix(in srgb, var(--pixel-accent) 20%, var(--pixel-bg-surface))"
                    : "var(--pixel-bg-primary)",
                borderColor:
                  selectedEmoji === item.key ? "var(--pixel-accent)" : "var(--pixel-border)",
                transform: selectedEmoji === item.key ? "translateY(-1px)" : undefined,
              }}
            >
              {item.emoji}
            </button>
          ))}
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="pixel-input flex-1 text-sm"
            style={{
              backgroundColor: "var(--pixel-bg-primary)",
              color: "var(--pixel-text-primary)",
              border: "2px solid var(--pixel-border)",
              padding: "8px 12px",
            }}
          >
            <option value="">Select a member…</option>
            {cheerableMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>

          <PixelButton
            variant="primary"
            onClick={handleSendCheer}
            disabled={isPending || !selectedTarget}
            loading={isPending}
          >
            Send ✨
          </PixelButton>
        </div>

        {/* Feedback */}
        {error && (
          <p className="font-pixel text-[10px]" style={{ color: "var(--pixel-error)" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="font-pixel text-[10px]" style={{ color: "var(--pixel-success)" }}>
            {success}
          </p>
        )}
      </div>

      {/* Weekly Cheer Totals */}
      <div style={{ borderTop: "2px solid var(--pixel-border)", paddingTop: "12px" }}>
        <p className="font-pixel text-[11px] uppercase mb-2" style={{ color: "var(--pixel-text-secondary)" }}>
          Weekly Cheers
        </p>

        {members.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--pixel-text-muted)" }}>No members yet.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between px-2 py-1"
                style={{ borderBottom: "1px solid var(--pixel-border)" }}
              >
                <span className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>
                  {member.displayName}
                  {member.userId === currentUserId && (
                    <span className="ml-1 font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
                      (you)
                    </span>
                  )}
                </span>
                <span className="font-pixel text-sm flex items-center gap-1" style={{ color: "var(--pixel-accent)" }}>
                  {cheerTotals[member.userId] ?? 0} ✨
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
