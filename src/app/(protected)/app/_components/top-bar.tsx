"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/(auth)/_actions/auth";
import { PixelProgressBar } from "@/components/pixel-ui/pixel-progress-bar";
import { xpForNextLevel } from "@/lib/gamification";

const navItems = [
  { href: "/app", icon: "/sprites/travel-book/icons/Home.png", label: "Home" },
  { href: "/app/room", icon: "/sprites/travel-book/icons/Gamepad.png", label: "Room" },
  { href: "/app/feynman", icon: "/sprites/travel-book/icons/Lightbulb.png", label: "Feynman" },
  { href: "/app/review", icon: "/sprites/travel-book/icons/Book.png", label: "Review" },
  { href: "/app/study", icon: "/sprites/travel-book/icons/Restart.png", label: "Mix" },
  { href: "/app/research", icon: "/sprites/travel-book/icons/MagnifyingGlass.png", label: "Research" },
  { href: "/app/study-room", icon: "/sprites/travel-book/icons/Monitor.png", label: "Video" },
  { href: "/app/planner", icon: "/sprites/travel-book/icons/Document.png", label: "Planner" },
  { href: "/app/analytics", icon: "/sprites/travel-book/icons/Trophy.png", label: "Stats" },
  { href: "/app/history", icon: "/sprites/travel-book/icons/FloppyDisk.png", label: "History" },
  { href: "/app/party", icon: "/sprites/travel-book/icons/Team.png", label: "Party" },
  { href: "/app/settings", icon: "/sprites/travel-book/icons/Gear.png", label: "Settings" },
];

interface TopBarProps {
  profile: { xp: number; coins: number; level: number } | null;
  pet: { pet_type: string; name: string; affinity: number } | null;
}

/** Renders a Travel Book pixel icon as an img tag */
function TBIcon({ src, alt, size = 20 }: { src: string; alt: string; size?: number }) {
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

export function TopBar({ profile, pet }: TopBarProps) {
  const pathname = usePathname();
  const xpProgress = profile ? xpForNextLevel(profile.xp) : { progress: 0, current: 0, needed: 100 };

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-2 px-3 py-2"
      style={{
        backgroundColor: "#2a2018",
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
              className="flex-shrink-0 flex items-center justify-center rounded p-1.5 transition-colors"
              style={{
                backgroundImage: isActive
                  ? "url('/sprites/travel-book/UI_TravelBook_Slot01a.png')"
                  : undefined,
                backgroundSize: "100% 100%",
                imageRendering: "pixelated",
                border: isActive ? "none" : "2px solid transparent",
                minWidth: "32px",
                minHeight: "32px",
              }}
            >
              <TBIcon src={item.icon} alt={item.label} size={20} />
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
          <TBIcon src="/sprites/travel-book/icons/Coin.png" alt="Coins" size={16} />
          {profile?.coins ?? 0}
        </span>

        {/* Sign out */}
        <form action={signout}>
          <button
            type="submit"
            title="Sign out"
            className="rounded p-1.5 transition-colors hover:bg-[var(--pixel-bg-secondary)]"
          >
            <TBIcon src="/sprites/travel-book/icons/Exit.png" alt="Sign out" size={18} />
          </button>
        </form>
      </div>
    </header>
  );
}
