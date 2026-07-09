"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import { IconSprite } from "./icon-sprite";

// ---------------------------------------------------------------------------
// Primary tabs (always visible in bottom bar)
// These keep the IconSprite + lucide-fallback pattern already established.
// ---------------------------------------------------------------------------

const primaryItems = [
  { href: "/app", label: "Home", icon: "home", fallback: LayoutDashboard },
  { href: "/app/review", label: "Review", icon: "book", fallback: BookOpen },
  { href: "/app/feynman", label: "Feynman", icon: "pen", fallback: PenLine },
  { href: "/app/research", label: "Research", icon: "flask", fallback: FlaskConical },
];

// ---------------------------------------------------------------------------
// All remaining features (shown in the "More" drawer), grouped to match the
// desktop sidebar's Study / My Room structure and sharing its travel-book
// sprites so mobile and desktop speak one icon language. Every desktop
// destination that isn't a primary tab lives here, so nothing is unreachable
// on a phone.
// ---------------------------------------------------------------------------

const ICON_BASE = "/sprites/travel-book/icons";

const featureGroups: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    title: "STUDY",
    items: [
      { href: "/app/study", label: "Study Mix", icon: `${ICON_BASE}/Restart.png` },
      { href: "/app/error-spotter", label: "Error Spotter", icon: `${ICON_BASE}/Eye.png` },
      { href: "/app/exam", label: "Practice Exam", icon: `${ICON_BASE}/Document.png` },
      { href: "/app/listen", label: "Listen Mode", icon: `${ICON_BASE}/MusicNotes.png` },
      { href: "/app/study-room", label: "Study Room", icon: `${ICON_BASE}/Monitor.png` },
      { href: "/app/planner", label: "Planner", icon: `${ICON_BASE}/Pencil.png` },
      { href: "/app/academic", label: "University", icon: `${ICON_BASE}/Backpack.png` },
    ],
  },
  {
    title: "MY ROOM",
    items: [
      { href: "/app/room", label: "Pixel Room", icon: `${ICON_BASE}/Gamepad.png` },
      { href: "/app/memory-map", label: "Memory Garden", icon: `${ICON_BASE}/Flower.png` },
      { href: "/app/eureka", label: "Eureka", icon: `${ICON_BASE}/Lightbulb.png` },
      { href: "/app/card-market", label: "Card Market", icon: `${ICON_BASE}/ChestTreasure.png` },
      { href: "/app/collection", label: "Collection", icon: `${ICON_BASE}/Briefcase.png` },
      { href: "/app/analytics", label: "Analytics", icon: `${ICON_BASE}/Trophy.png` },
      { href: "/app/history", label: "History", icon: `${ICON_BASE}/FloppyDisk.png` },
    ],
  },
  {
    title: "GENERAL",
    items: [
      { href: "/app/party", label: "Friends", icon: `${ICON_BASE}/Team.png` },
      { href: "/app/settings", label: "Settings", icon: `${ICON_BASE}/Gear.png` },
    ],
  },
];

const allFeatures = featureGroups.flatMap((g) => g.items);

// ---------------------------------------------------------------------------
// BottomNav Component
// ---------------------------------------------------------------------------

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Check if a "more" feature is currently active (to highlight the More button)
  const moreIsActive = allFeatures.some((f) => isActive(f.href));

  return (
    <>
      {/* ─── "More" drawer (slides up from bottom) ─── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />

          {/* Drawer */}
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto pb-[60px] scrollbar-hide"
            style={{
              backgroundColor: "var(--pixel-bg-surface)",
              borderTop: "2px solid var(--pixel-border)",
              animation: "slide-up 200ms ease-out",
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-4 pt-3 pb-2"
              style={{ backgroundColor: "var(--pixel-bg-surface)" }}
            >
              <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
                ALL FEATURES
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="font-pixel flex h-8 w-8 items-center justify-center text-sm"
                style={{ color: "var(--pixel-text-secondary)" }}
              >
                ✕
              </button>
            </div>

            {/* Grouped grids of features */}
            {featureGroups.map((group) => (
              <div key={group.title} className="px-3 pb-3">
                <p
                  className="font-pixel text-[10px] px-1 pb-1"
                  style={{ color: "var(--pixel-text-muted)" }}
                >
                  {group.title}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className="pixel-hover-brighten flex min-h-[44px] flex-col items-center justify-center gap-1.5 py-3 px-1"
                        style={{
                          backgroundColor: active
                            ? "color-mix(in srgb, var(--pixel-accent) 15%, var(--pixel-bg-surface))"
                            : undefined,
                          color: active ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
                        }}
                      >
                        <img
                          src={item.icon}
                          alt=""
                          aria-hidden="true"
                          width={22}
                          height={22}
                          className="pixel-art"
                          draggable={false}
                        />
                        <span className="font-pixel text-[10px] text-center leading-tight">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom nav bar ─── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around px-2 py-1 md:hidden"
        style={{
          borderTop: "2px solid var(--pixel-border)",
          backgroundColor: "var(--pixel-bg-surface)",
        }}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {primaryItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-opacity"
              style={{
                color: active ? "var(--pixel-accent)" : "var(--pixel-text-muted)",
              }}
            >
              <IconSprite
                name={item.icon}
                size={1}
                fallback={item.fallback}
                aria-label={item.label}
              />
              <span className="font-pixel text-[10px] leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          aria-label="More features"
          aria-expanded={moreOpen}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-opacity"
          style={{
            color: moreIsActive ? "var(--pixel-accent)" : "var(--pixel-text-muted)",
          }}
        >
          <img
            src={`${ICON_BASE}/Option.png`}
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
            className="pixel-art"
            draggable={false}
          />
          <span className="font-pixel text-[10px] leading-tight">More</span>
        </button>
      </nav>
    </>
  );
}
