"use client";

import type { PartyMemberView } from "../../_actions/party";

interface PartyMembersProps {
  members: PartyMemberView[];
}

/**
 * Displays party members in pixel-themed cards with presence indicators,
 * join dates, and contribution counts.
 */
export function PartyMembers({ members }: PartyMembersProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: "var(--pixel-text-muted)" }}>
        No members yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.userId}
          className="pixel-panel flex items-center gap-3"
          style={{ padding: "var(--pixel-panel-compact)" }}
        >
          {/* Avatar: colored pixel initials square */}
          <div className="relative flex-shrink-0">
            {member.avatarThumbnail ? (
              <img
                src={member.avatarThumbnail}
                alt={member.displayName}
                className="h-8 w-8 pixel-art"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center font-pixel text-[10px]"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--pixel-accent) 20%, var(--pixel-bg-surface))",
                  color: "var(--pixel-accent)",
                  border: "2px solid var(--pixel-accent)",
                }}
              >
                {getInitials(member.displayName)}
              </div>
            )}

            {/* Presence indicator */}
            {member.isStudying && (
              <div
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3"
                style={{
                  backgroundColor: "var(--pixel-success)",
                  border: "2px solid var(--pixel-bg-surface)",
                }}
                aria-label="Currently studying"
              />
            )}
          </div>

          {/* Display name */}
          <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--pixel-text-primary)" }}>
            {member.displayName}
          </span>

          {/* Join date */}
          <span className="flex-shrink-0 font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
            {formatRelativeJoinDate(member.joinedAt)}
          </span>

          {/* Contribution badge */}
          <span
            className="flex-shrink-0 pixel-panel pixel-panel-inset font-pixel text-[9px] px-2 py-0.5"
            style={{ color: "var(--pixel-text-secondary)" }}
          >
            {member.contributionCount}
          </span>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "?").toUpperCase();
}

function formatRelativeJoinDate(isoDate: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  if (diffDays < 1) return "joined today";
  if (diffDays === 1) return "joined yesterday";
  if (diffDays < 30) return `joined ${diffDays}d ago`;
  if (diffDays < 365) return `joined ${Math.floor(diffDays / 30)}mo ago`;
  return `joined ${Math.floor(diffDays / 365)}y ago`;
}
