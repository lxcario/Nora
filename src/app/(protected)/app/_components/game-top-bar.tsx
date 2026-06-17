"use client";

import { useEffect, useState } from "react";

interface GameTopBarProps {
  profile: { xp: number; coins: number; level: number; display_name?: string | null } | null;
}

function TBIcon({ src, alt, size = 16 }: { src: string; alt: string; size?: number }) {
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

function getMoonOrSun(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return "☀️";
  return "🌙";
}

export function GameTopBar({ profile }: GameTopBarProps) {
  const [greeting, setGreeting] = useState("Good evening");
  const [icon, setIcon] = useState("🌙");

  useEffect(() => {
    setGreeting(getGreeting());
    setIcon(getMoonOrSun());
  }, []);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const coins = profile?.coins ?? 0;

  // Calculate XP progress
  const currentLevelXp = (level - 1) * (level - 1) * 50;
  const nextLevelXp = level * level * 50;
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpProgress = Math.min(xpInLevel / xpNeeded, 1);

  return (
    <header
      className="flex items-center justify-between px-6 py-3"
      style={{
        backgroundColor: "#2a2018",
        borderBottom: "1px solid #3d2817",
      }}
    >
      {/* Left: Greeting */}
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: "#f0e6d2" }}>
          {greeting}, Student! {icon}
        </span>
      </div>

      {/* Right: Level + XP bar + Coins */}
      <div className="flex items-center gap-4">
        {/* Star + Level */}
        <div className="flex items-center gap-1.5">
          <TBIcon src="/sprites/travel-book/icons/Sun.png" alt="Level" size={16} />
          <span className="font-pixel text-xs" style={{ color: "#d4a526" }}>
            Lv. {level}
          </span>
        </div>

        {/* XP Progress bar */}
        <div className="flex items-center gap-2">
          <div
            className="w-24 h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: "#1a1410", border: "1px solid #3d2817" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${xpProgress * 100}%`,
                backgroundColor: "#7da856",
              }}
            />
          </div>
          <span className="text-[10px]" style={{ color: "#c4a882" }}>
            {xpInLevel} / {xpNeeded} XP
          </span>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1.5">
          <TBIcon src="/sprites/travel-book/icons/Coin.png" alt="Coins" size={16} />
          <span className="font-pixel text-xs" style={{ color: "#f0e6d2" }}>
            {coins}
          </span>
        </div>
      </div>
    </header>
  );
}
