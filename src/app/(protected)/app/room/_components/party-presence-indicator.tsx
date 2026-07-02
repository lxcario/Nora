"use client";

import { type PartyPresenceMember } from "@/app/(protected)/app/_actions/party-presence";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function PartyPresenceIndicator({
  members,
}: {
  members: PartyPresenceMember[];
}) {
  if (members.length === 0) return null;

  return (
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)]/80 px-2 py-1.5 backdrop-blur-sm">
      <span className="font-pixel mr-1 text-[8px] text-[var(--pixel-text-muted)]">Party</span>
      {members.map((member) => (
        <div
          key={member.userId}
          className="relative"
          title={`${member.displayName} — studying`}
        >
          {/* 16x16 avatar circle with initials */}
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--pixel-accent)] text-[6px] font-bold text-[var(--pixel-bg-primary)]">
            {getInitials(member.displayName)}
          </div>
          {/* Green pulse indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--pixel-success)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--pixel-success)] opacity-75" />
          </span>
        </div>
      ))}
    </div>
  );
}
