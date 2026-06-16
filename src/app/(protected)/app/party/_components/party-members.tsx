"use client";

import { Circle } from "lucide-react";
import type { PartyMemberView } from "../../_actions/party";

interface PartyMembersProps {
  members: PartyMemberView[];
}

/**
 * Displays party members in horizontal cards with avatars, presence indicators,
 * join dates, and contribution counts.
 *
 * Requirements: 9.1, 10.2
 */
export function PartyMembers({ members }: PartyMembersProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
        >
          {/* Avatar: 32×32 colored circle with initials if no avatar */}
          <div className="relative flex-shrink-0">
            {member.avatarThumbnail ? (
              <img
                src={member.avatarThumbnail}
                alt={member.displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-200 text-xs font-semibold text-violet-700 dark:bg-violet-800 dark:text-violet-200">
                {getInitials(member.displayName)}
              </div>
            )}

            {/* Presence dot */}
            {member.isStudying && (
              <Circle
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500"
                aria-label="Currently studying"
              />
            )}
          </div>

          {/* Display name */}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {member.displayName}
          </span>

          {/* Join date (relative) */}
          <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {formatRelativeJoinDate(member.joinedAt)}
          </span>

          {/* Contribution count badge */}
          <span className="flex-shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {member.contributionCount} contribution{member.contributionCount !== 1 ? "s" : ""}
          </span>
        </div>
      ))}

      {members.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No members yet.</p>
      )}
    </div>
  );
}

/** Extract initials from a display name (max 2 chars). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
}

/** Format a join date as a relative string, e.g. "joined 3 days ago". */
function formatRelativeJoinDate(isoDate: string): string {
  const joined = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - joined.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 1) {
    return "joined today";
  } else if (diffDays === 1) {
    return "joined yesterday";
  } else if (diffDays < 30) {
    return `joined ${diffDays} days ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `joined ${months} month${months !== 1 ? "s" : ""} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `joined ${years} year${years !== 1 ? "s" : ""} ago`;
  }
}
