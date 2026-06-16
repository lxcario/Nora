"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/(auth)/_actions/auth";
import {
  LayoutDashboard,
  Gamepad2,
  PenLine,
  Layers,
  Shuffle,
  FlaskConical,
  MonitorPlay,
  CalendarDays,
  BarChart3,
  History,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { NineSlice } from "./nine-slice";
import { IconSprite } from "./icon-sprite";
import { MusicPlayer } from "@/app/(protected)/app/_components/music-player";
import { SfxToggle } from "@/app/(protected)/app/_components/sfx-toggle";

// ---------------------------------------------------------------------------
// Navigation items with sprite icon names and Lucide fallbacks
// ---------------------------------------------------------------------------

const navItems = [
  { href: "/app", label: "Dashboard", spriteName: "icon-home", fallback: LayoutDashboard },
  { href: "/app/room", label: "Pixel Room", spriteName: "icon-trophy", fallback: Gamepad2 },
  { href: "/app/feynman", label: "Feynman Mode", spriteName: "icon-pen", fallback: PenLine },
  { href: "/app/review", label: "Review", spriteName: "icon-layers", fallback: Layers },
  { href: "/app/study", label: "Study Mix", spriteName: "icon-refresh", fallback: Shuffle },
  { href: "/app/research", label: "Research", spriteName: "icon-flask", fallback: FlaskConical },
  { href: "/app/study-room", label: "Study Room", spriteName: "icon-play", fallback: MonitorPlay },
  { href: "/app/planner", label: "Planner", spriteName: "icon-calendar", fallback: CalendarDays },
  { href: "/app/analytics", label: "Analytics", spriteName: "icon-chart", fallback: BarChart3 },
  { href: "/app/history", label: "History", spriteName: "icon-clock", fallback: History },
  { href: "/app/party", label: "Party", spriteName: "icon-users", fallback: Users },
  { href: "/app/settings", label: "Settings", spriteName: "icon-settings", fallback: Settings },
];

// ---------------------------------------------------------------------------
// PixelSidebar Component
// ---------------------------------------------------------------------------

/**
 * Pixel-art themed sidebar navigation.
 *
 * - Client Component (uses `usePathname` for active-item detection)
 * - Outer container uses NineSlice "standard" variant as background panel
 * - "NORA" brand in pixel font, amber/gold color, centered at top
 * - Nav items with IconSprite icons (Lucide fallback), pixel font labels
 * - Active item: brighter amber/gold background tint
 * - Hover: subtle accent tint
 * - Preserves MusicPlayer, SfxToggle, and sign-out functionality
 */
export function PixelSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col" style={{ minHeight: "100vh" }}>
      <NineSlice variant="standard" scale={2} className="flex flex-1 flex-col overflow-hidden">
        {/* Brand */}
        <div
          className="flex items-center justify-center px-5 py-4"
          style={{ borderBottom: "2px solid var(--pixel-border-light)" }}
        >
          <h2
            className="font-pixel text-xl tracking-wide"
            style={{ color: "var(--pixel-accent)" }}
          >
            NORA
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                data-state={isActive ? "selected" : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-pixel)",
                  letterSpacing: "0.5px",
                  color: isActive
                    ? "var(--pixel-accent)"
                    : "var(--pixel-text-primary)",
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--pixel-accent) 18%, transparent)"
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      "color-mix(in srgb, var(--pixel-accent) 10%, transparent)";
                    e.currentTarget.style.color = "var(--pixel-accent-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "";
                    e.currentTarget.style.color = "var(--pixel-text-primary)";
                  }
                }}
              >
                <IconSprite
                  name={item.spriteName}
                  size={1}
                  fallback={item.fallback}
                  aria-label={item.label}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Music Player */}
        <MusicPlayer />

        {/* SFX Toggle */}
        <SfxToggle />

        {/* Sign out */}
        <div
          className="px-3 py-4"
          style={{ borderTop: "2px solid var(--pixel-border-light)" }}
        >
          <form action={signout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                fontFamily: "var(--font-pixel)",
                letterSpacing: "0.5px",
                color: "var(--pixel-text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "color-mix(in srgb, var(--pixel-accent) 10%, transparent)";
                e.currentTarget.style.color = "var(--pixel-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
                e.currentTarget.style.color = "var(--pixel-text-secondary)";
              }}
            >
              <IconSprite
                name="icon-close"
                size={1}
                fallback={LogOut}
                aria-label="Sign out"
              />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </NineSlice>
    </aside>
  );
}
