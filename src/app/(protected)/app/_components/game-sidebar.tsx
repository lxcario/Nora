"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { playNavigate } from "@/lib/sfx";
import { MusicPlayer } from "./music-player";

// ---------------------------------------------------------------------------
// Navigation items — using travel-book icon sprites
// ---------------------------------------------------------------------------

const navItems = [
  { href: "/app", icon: "/sprites/travel-book/icons/Home.png", label: "Home" },
  { href: "/app/review", icon: "/sprites/travel-book/icons/Book.png", label: "Review Cards" },
  { href: "/app/study", icon: "/sprites/travel-book/icons/Restart.png", label: "Study Mix" },
  { href: "/app/feynman", icon: "/sprites/travel-book/icons/Lightbulb.png", label: "Feynman Mode" },
  { href: "/app/research", icon: "/sprites/travel-book/icons/MagnifyingGlass.png", label: "Research Desk" },
  { href: "/app/study-room", icon: "/sprites/travel-book/icons/Monitor.png", label: "Study Room" },
  { href: "/app/planner", icon: "/sprites/travel-book/icons/Document.png", label: "Study Planner" },
  { href: "/app/academic", icon: "/sprites/travel-book/icons/Backpack.png", label: "My University" },
  { href: "/app/analytics", icon: "/sprites/travel-book/icons/Trophy.png", label: "Analytics" },
  { href: "/app/history", icon: "/sprites/travel-book/icons/FloppyDisk.png", label: "History" },
  { href: "/app/room", icon: "/sprites/travel-book/icons/Gamepad.png", label: "Pixel Room" },
  { href: "/app/party", icon: "/sprites/travel-book/icons/Team.png", label: "Party" },
  { href: "/app/collection", icon: "/sprites/travel-book/icons/ChestTreasure.png", label: "Collection" },
];

// ---------------------------------------------------------------------------
// Pixel icon helper
// ---------------------------------------------------------------------------

function PixelIcon({ src, alt, size = 20 }: { src: string; alt: string; size?: number }) {
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

// ---------------------------------------------------------------------------
// Nav link with sprite-framed active state
// ---------------------------------------------------------------------------

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={() => playNavigate()}
      data-state={active ? "selected" : undefined}
      className={
        active
          ? "pixel-panel pixel-panel-selected group flex items-center gap-3 px-2.5 py-2 text-[13px] font-pixel"
          : "group flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2.5 text-[13px] font-pixel transition-colors hover:bg-[var(--pixel-bg-elevated)]"
      }
      style={
        active
          ? {
              backgroundColor: "color-mix(in srgb, var(--pixel-accent) 16%, var(--pixel-bg-surface))",
              color: "var(--pixel-accent)",
            }
          : { color: "var(--pixel-text-secondary)" }
      }
    >
      <span className="nav-ico shrink-0">
        <PixelIcon src={icon} alt={label} size={18} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// GameSidebar Component
// ---------------------------------------------------------------------------

export function GameSidebar({ profile }: { profile: { display_name?: string | null; avatar_url?: string | null } | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[240px] min-h-screen flex-shrink-0 bg-[var(--pixel-sidebar-bg)] border-r-2 border-[var(--pixel-border)]">
      {/* ─── Logo ─── */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-center gap-1.5">
        <span className="text-[var(--pixel-accent)] text-sm">✦</span>
        <h1 className="font-pixel text-xl tracking-wider text-[var(--pixel-accent)]">
          NORA
        </h1>
        <span className="text-[var(--pixel-accent)] text-sm">✦</span>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive}
            />
          );
        })}

        {/* Settings — separated */}
        <div className="pt-2">
          <NavLink
            href="/app/settings"
            icon="/sprites/travel-book/icons/Gear.png"
            label="Settings"
            active={pathname.startsWith("/app/settings")}
          />
        </div>
      </nav>

      {/* ─── Music Player ─── */}
      <MusicPlayer />
    </aside>
  );
}
