"use client";

import { useState } from "react";
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
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium font-pixel text-[var(--pixel-text-secondary)] transition-colors hover:bg-[var(--pixel-bg-secondary)] hover:text-[var(--pixel-text-primary)]"
        title={muted ? "Unmute sound effects" : "Mute sound effects"}
      >
        <img
          src={`/sprites/travel-book/icons/${muted ? "SpeakerMute" : "SpeakerOn"}.png`}
          alt=""
          width={16}
          height={16}
          className="pixel-art"
          style={{ opacity: muted ? 0.6 : 1 }}
          draggable={false}
        />
        {muted ? "SFX Off" : "SFX On"}
      </button>
    </div>
  );
}
