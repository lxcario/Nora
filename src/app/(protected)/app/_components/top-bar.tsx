"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/(auth)/_actions/auth";
import { IconSprite } from "@/components/pixel-ui/icon-sprite";
import { PixelProgressBar } from "@/components/pixel-ui/pixel-progress-bar";
import { xpForNextLevel } from "@/lib/gamification";
import {
  LayoutDashboard, Gamepad2, PenLine, Layers, Shuffle,
  FlaskConical, MonitorPlay, CalendarDays, BarChart3,
  History, Users, Settings, LogOut, Flame,
} from "lucide-react";

const navItems = [
  { href: "/app", icon: "home", fallback: LayoutDashboard, label: "Home" },
  { href: "/app/room", icon: "trophy", fallback: Gamepad2, label: "Room" },
  { href: "/app/feynman", icon: "pen", fallback: PenLine, label: "Feynman" },
  { href: "/app/review", icon: "layers", fallback: Layers, label: "Review" },
  { href: "/app/study", icon: "refresh", fallback: Shuffle, label: "Mix" },
  { href: "/app/research", icon: "flask", fallback: FlaskConical, label: "Research" },
  { href: "/app/study-room", icon: "play", fallback: MonitorPlay, label: "Video" },
  { href: "/app/planner", icon: "calendar", fallback: CalendarDays, label: "Planner" },
  { href: "/app/analytics", icon: "chart", fallback: BarChart3, label: "Stats" },
  { href: "/app/history", icon: "clock", fallback: History, label: "History" },
  { href: "/app/party", icon: "users", fallback: Users, label: "Party" },
  { href: "/app/settings", icon: "settings", fallback: Settings, label: "Settings" },
];

interface TopBarProps {
  profile: { xp: number; coins: number; level: number } | null;
  pet: { pet_type: string; name: string; affinity: number } | null;
}

export function TopBar({ profile, pet }: TopBarProps) {
  const pathname = usePathname();
  const xpProgress = profile ? xpForNextLevel(profile.xp) : { progress: 0, current: 0, needed: 100 };

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-2 px-3 py-2"
      style={{
        backgroundColor: "var(--pixel-bg-surface)",
        borderBottom: "3px solid var(--pixel-border)",
        boxShadow: "0 2px 0 var(--pixel-border-light)",
      }}
    >
      {/* Brand */}
      <Link href="/app" className="font-pixel text-lg tracking-wide mr-3" style={{ color: "var(--pixel-accent)" }}>
        NORA
      </Link>

      {/* Navigation icons — scrollable on smaller screens */}
      <nav className="flex items-center gap-1 overflow-x-auto flex-1 px-1 py-1 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="flex-shrink-0 rounded p-1.5 transition-colors"
              style={{
                backgroundColor: isActive ? "color-mix(in srgb, var(--pixel-accent) 25%, transparent)" : undefined,
                border: isActive ? "2px solid var(--pixel-accent)" : "2px solid transparent",
              }}
            >
              <IconSprite name={item.icon} size={1} fallback={item.fallback} aria-label={item.label} />
            </Link>
          );
        })}
      </nav>

      {/* HUD — always visible stats */}
      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
        {/* Level + XP bar */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="font-pixel text-xs" style={{ color: "var(--pixel-accent)" }}>
            Lv.{profile?.level ?? 1}
          </span>
          <div className="w-16">
            <PixelProgressBar value={xpProgress.current} max={xpProgress.needed} variant="xp" />
          </div>
        </div>

        {/* Coins */}
        <span className="font-pixel text-xs flex items-center gap-1" style={{ color: "var(--pixel-text-primary)" }}>
          <IconSprite name="coin" size={1} fallback={Flame} />
          {profile?.coins ?? 0}
        </span>

        {/* Sign out */}
        <form action={signout}>
          <button
            type="submit"
            title="Sign out"
            className="rounded p-1.5 transition-colors hover:bg-[var(--pixel-bg-secondary)]"
          >
            <IconSprite name="close" size={1} fallback={LogOut} aria-label="Sign out" />
          </button>
        </form>
      </div>
    </header>
  );
}
