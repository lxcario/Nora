"use client";

import { useEffect, useState } from "react";
import { PixelCounter } from "@/components/pixel-ui/pixel-counter";

interface GameTopBarProps {
  profile: { xp: number; coins: number; level: number; display_name?: string | null } | null;
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
          {greeting}, Student! {timeIcon}
        </span>
      </div>

      {/* Right: Level + XP bar + Coins */}
      <div className="flex items-center gap-5">
        {/* Star + Level badge */}
        <div className="flex items-center gap-1.5">
          <PixelIcon src="/sprites/travel-book/icons/Sun.png" alt="Level" size={16} />
          <span className="font-pixel text-xs text-[var(--pixel-accent)]">
            Lv. {level}
          </span>
        </div>

        {/* XP Progress bar */}
        <div className="flex items-center gap-2">
          <div className="w-28 h-3 overflow-hidden bg-[var(--pixel-bg-primary)] border-2 border-[var(--pixel-border)]">
            <div
              className="h-full transition-all bg-[var(--pixel-success)]"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--pixel-text-secondary)]">
            {xpInLevel} / {xpNeeded} XP
          </span>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1.5">
          <PixelIcon src="/sprites/travel-book/icons/Coin.png" alt="Coins" size={16} />
          <PixelCounter
            value={coins}
            className="font-pixel text-xs text-[var(--pixel-text-primary)]"
          />
        </div>
      </div>
    </header>
  );
}
