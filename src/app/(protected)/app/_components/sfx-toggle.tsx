"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, toggleMute } from "@/lib/sfx";

export function SfxToggle() {
  // Initialize from localStorage (safe: this component is client-only)
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return isMuted();
  });

  function handleToggle() {
    const newMuted = toggleMute();
    setMuted(newMuted);
  }

  return (
    <div className="px-3 py-2">
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        title={muted ? "Unmute sound effects" : "Mute sound effects"}
      >
        {muted ? (
          <VolumeX className="h-4 w-4 text-zinc-400" />
        ) : (
          <Volume2 className="h-4 w-4 text-indigo-500" />
        )}
        {muted ? "SFX Off" : "SFX On"}
      </button>
    </div>
  );
}
