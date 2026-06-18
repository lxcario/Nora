"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { playNavigate } from "@/lib/sfx";
import { MusicPlayer } from "./music-player";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PixelIcon({ src, alt, size = 18 }: { src: string; alt: string; size?: number }) {
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

/**
 * Precise route-active check.
 * Avoids false positives like /app/study matching /app/study-room.
 */
function isRouteActive(href: string, pathname: string): boolean {
  if (href === "/app") return pathname === "/app";
  return (
    pathname === href ||
    pathname.startsWith(href + "/") ||
    pathname.startsWith(href + "?")
  );
}

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

const STUDY_CHILDREN = [
  { href: "/app/review",     icon: "/sprites/travel-book/icons/Book.png",           label: "Review Cards"  },
  { href: "/app/study",      icon: "/sprites/travel-book/icons/Restart.png",         label: "Study Mix"     },
  { href: "/app/feynman",    icon: "/sprites/travel-book/icons/Lightbulb.png",       label: "Feynman Mode"  },
  { href: "/app/research",   icon: "/sprites/travel-book/icons/MagnifyingGlass.png", label: "Research Desk" },
  { href: "/app/study-room", icon: "/sprites/travel-book/icons/Monitor.png",         label: "Study Room"    },
  { href: "/app/planner",    icon: "/sprites/travel-book/icons/Document.png",        label: "Study Planner" },
  { href: "/app/academic",   icon: "/sprites/travel-book/icons/Backpack.png",        label: "My University" },
];

const ROOM_CHILDREN = [
  { href: "/app/room",       icon: "/sprites/travel-book/icons/Gamepad.png",         label: "Pixel Room"  },
  { href: "/app/collection", icon: "/sprites/travel-book/icons/ChestTreasure.png",   label: "Collection"  },
  { href: "/app/analytics",  icon: "/sprites/travel-book/icons/Trophy.png",          label: "Analytics"   },
  { href: "/app/history",    icon: "/sprites/travel-book/icons/FloppyDisk.png",      label: "History"     },
];

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const LS_KEY = "nora_sidebar_state";

interface SidebarState {
  study: boolean;
  myRoom: boolean;
}

function loadSidebarState(): SidebarState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { study: false, myRoom: false };
    const parsed = JSON.parse(raw) as Partial<SidebarState>;
    return {
      study: Boolean(parsed?.study),
      myRoom: Boolean(parsed?.myRoom),
    };
  } catch {
    return { study: false, myRoom: false };
  }
}

// ---------------------------------------------------------------------------
// NavLink — top-level direct link (unchanged style from original)
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
      <span className="shrink-0">
        <PixelIcon src={icon} alt={label} size={18} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SubNavLink — indented child link inside an accordion group
// ---------------------------------------------------------------------------

function SubNavLink({
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
      className="group flex items-center gap-2.5 rounded-md py-1.5 pl-8 pr-2 text-[11px] font-pixel transition-colors"
      style={{
        color: active ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
        backgroundColor: active
          ? "color-mix(in srgb, var(--pixel-accent) 10%, var(--pixel-bg-surface))"
          : undefined,
        borderLeft: active
          ? "2px solid var(--pixel-accent)"
          : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "var(--pixel-bg-elevated)";
          e.currentTarget.style.color = "var(--pixel-text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "";
          e.currentTarget.style.color = "var(--pixel-text-secondary)";
        }
      }}
    >
      <PixelIcon src={icon} alt={label} size={14} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// AccordionGroup — expandable section with keyboard support
// ---------------------------------------------------------------------------

function AccordionGroup({
  icon,
  label,
  open,
  anyChildActive,
  onToggle,
  children,
}: {
  icon: string;
  label: string;
  open: boolean;
  anyChildActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2.5 text-[13px] font-pixel transition-colors hover:bg-[var(--pixel-bg-elevated)]"
        style={{
          color: anyChildActive ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
          backgroundColor:
            anyChildActive && !open
              ? "color-mix(in srgb, var(--pixel-accent) 8%, var(--pixel-bg-surface))"
              : undefined,
        }}
      >
        <span className="shrink-0">
          <PixelIcon src={icon} alt={label} size={18} />
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        {/* Pixel chevron */}
        <span
          className="shrink-0 font-pixel text-[10px]"
          style={{
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            color: "var(--pixel-text-secondary)",
          }}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>

      {open && (
        <div className="mt-0.5 mb-1 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GameSidebar
// ---------------------------------------------------------------------------

export function GameSidebar({
  profile,
}: {
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
}) {
  const pathname = usePathname();

  const studyActive = STUDY_CHILDREN.some((c) => isRouteActive(c.href, pathname));
  const roomActive  = ROOM_CHILDREN.some((c)  => isRouteActive(c.href, pathname));

  // Initialise from localStorage; auto-open the group whose child is active
  const [openGroups, setOpenGroups] = useState<SidebarState>(() => {
    const saved = loadSidebarState();
    return {
      study: saved.study || studyActive,
      myRoom: saved.myRoom || roomActive,
    };
  });

  // Persist to localStorage whenever the state changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(openGroups));
    } catch {
      // storage unavailable — silent
    }
  }, [openGroups]);

  // Auto-expand when navigating to a child route (e.g., deep-link from outside)
  useEffect(() => {
    setOpenGroups((prev) => ({
      study:  prev.study  || studyActive,
      myRoom: prev.myRoom || roomActive,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleStudy  = useCallback(() => setOpenGroups((p) => ({ ...p, study:  !p.study  })), []);
  const toggleMyRoom = useCallback(() => setOpenGroups((p) => ({ ...p, myRoom: !p.myRoom })), []);

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
      <nav
        className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-hide"
        aria-label="Main navigation"
      >
        {/* 1. Home */}
        <NavLink
          href="/app"
          icon="/sprites/travel-book/icons/Home.png"
          label="Home"
          active={pathname === "/app"}
        />

        {/* 2. Study (accordion) */}
        <AccordionGroup
          icon="/sprites/travel-book/icons/Book.png"
          label="Study"
          open={openGroups.study}
          anyChildActive={studyActive}
          onToggle={toggleStudy}
        >
          {STUDY_CHILDREN.map((child) => (
            <SubNavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              active={isRouteActive(child.href, pathname)}
            />
          ))}
        </AccordionGroup>

        {/* 3. Friends (was "Party") */}
        <NavLink
          href="/app/party"
          icon="/sprites/travel-book/icons/Team.png"
          label="Friends"
          active={isRouteActive("/app/party", pathname)}
        />

        {/* 4. My Room (accordion) */}
        <AccordionGroup
          icon="/sprites/travel-book/icons/Gamepad.png"
          label="My Room"
          open={openGroups.myRoom}
          anyChildActive={roomActive}
          onToggle={toggleMyRoom}
        >
          {ROOM_CHILDREN.map((child) => (
            <SubNavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              active={isRouteActive(child.href, pathname)}
            />
          ))}
        </AccordionGroup>

        {/* 5. Settings */}
        <div className="pt-1">
          <NavLink
            href="/app/settings"
            icon="/sprites/travel-book/icons/Gear.png"
            label="Settings"
            active={isRouteActive("/app/settings", pathname)}
          />
        </div>
      </nav>

      {/* ─── Music Player (stays pinned at bottom) ─── */}
      <MusicPlayer />
    </aside>
  );
}
