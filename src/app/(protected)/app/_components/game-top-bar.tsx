"use client";

import { useEffect, useState } from "react";
import { PixelCounter } from "@/components/pixel-ui/pixel-counter";
import { ProfilePopover } from "./profile-popover";

interface GameTopBarProps {
  profile: {
    xp: number;
    coins: number;
    level: number;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

function PixelIcon({ src, alt, size = 16 }: { src: string; alt: string; size?: number }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="pixel-art"
      draggable={false}
    />
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getTimeIcon(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return "☀️";
  return "🌙";
}

export function GameTopBar({ profile }: GameTopBarProps) {
  const [greeting, setGreeting] = useState("Good evening");
  const [timeIcon, setTimeIcon] = useState("🌙");

  useEffect(() => {
    setGreeting(getGreeting());
    setTimeIcon(getTimeIcon());
  }, []);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const coins = profile?.coins ?? 0;

  // XP progress within current level
  const currentLevelXp = (level - 1) * (level - 1) * 50;
  const nextLevelXp = level * level * 50;
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpProgress = Math.min(xpInLevel / xpNeeded, 1);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[var(--pixel-bg-surface)] border-b border-[var(--pixel-border)]">
      {/* Left: Greeting */}
      <div className="flex items-center gap-2">
        <span className="font-pixel text-sm text-[var(--pixel-text-primary)]">
          {greeting}, {profile?.display_name ?? "Student"}! {timeIcon}
        </span>
      </div>

      {/* Right: Coins + compact XP bar + Profile popover */}
      <div className="flex items-center gap-4">
        {/* Coins */}
        <div
          className="flex items-center gap-1.5"
          title="Earn coins from daily quests. Spend them on cursors, themes, and decorations in the Collection."
        >
          <PixelIcon src="/sprites/travel-book/icons/Coin.png" alt="Coins" size={16} />
          <PixelCounter
            value={coins}
            className="font-pixel text-xs text-[var(--pixel-text-primary)]"
          />
        </div>

        {/* Compact XP bar + level */}
        <div
          className="hidden sm:flex items-center gap-2"
          title="Earn XP by studying. Level up to unlock new pets, themes, and decorations!"
        >
          <span className="font-pixel text-[10px] text-[var(--pixel-accent)]">
            Lv.{level}
          </span>
          <div
            className="overflow-hidden"
            style={{
              width: "80px",
              height: "8px",
              background: "var(--pixel-bg-primary)",
              border: "2px solid var(--pixel-border)",
            }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${xpProgress * 100}%`,
                backgroundColor: "var(--pixel-success)",
              }}
            />
          </div>
        </div>

        {/* Profile popover trigger */}
        <ProfilePopover profile={profile} />
      </div>
    </header>
  );
}
