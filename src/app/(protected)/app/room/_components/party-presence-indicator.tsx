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
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-black/70 px-2 py-1.5 backdrop-blur-sm">
      <span className="font-pixel mr-1 text-[8px] text-zinc-400">Party</span>
      {members.map((member) => (
        <div
          key={member.userId}
          className="relative"
          title={`${member.displayName} — studying`}
        >
          {/* 16×16 avatar circle with initials */}
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[6px] font-bold text-white">
            {getInitials(member.displayName)}
          </div>
          {/* Green pulse indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
          </span>
        </div>
      ))}
    </div>
  );
}
