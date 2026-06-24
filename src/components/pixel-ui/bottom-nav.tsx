"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  FlaskConical,
  BookOpen,
  DoorOpen,
  Grid3X3,
  X,
  FileText,
  Monitor,
  Calendar,
  Trophy,
  Users,
  Settings,
  GraduationCap,
} from "lucide-react";
import { IconSprite } from "./icon-sprite";

// ---------------------------------------------------------------------------
// Primary tabs (always visible in bottom bar)
// ---------------------------------------------------------------------------

const primaryItems = [
  { href: "/app", label: "Home", icon: "home", fallback: LayoutDashboard },
  { href: "/app/review", label: "Review", icon: "book", fallback: BookOpen },
  { href: "/app/feynman", label: "Feynman", icon: "pen", fallback: PenLine },
  { href: "/app/research", label: "Research", icon: "flask", fallback: FlaskConical },
];

// ---------------------------------------------------------------------------
// All features (shown in the "More" drawer)
// ---------------------------------------------------------------------------

const allFeatures = [
  { href: "/app/exam", label: "Practice Exam", Icon: FileText },
  { href: "/app/study-room", label: "Study Room", Icon: Monitor },
  { href: "/app/planner", label: "Planner", Icon: Calendar },
  { href: "/app/room", label: "Pixel Room", Icon: DoorOpen },
  { href: "/app/analytics", label: "Analytics", Icon: Trophy },
  { href: "/app/party", label: "Friends", Icon: Users },
  { href: "/app/academic", label: "University", Icon: GraduationCap },
  { href: "/app/settings", label: "Settings", Icon: Settings },
];

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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            style={{ transition: "opacity 200ms ease" }}
          />

          {/* Drawer */}
          <div
            className="absolute inset-x-0 bottom-0 pb-[60px]"
            style={{
              backgroundColor: "var(--pixel-bg-surface)",
              borderTop: "2px solid var(--pixel-border)",
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px",
              animation: "slide-up 200ms ease-out",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
                ALL FEATURES
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1"
                style={{ color: "var(--pixel-text-secondary)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid of features */}
            <div className="grid grid-cols-4 gap-1 px-3 pb-4">
              {allFeatures.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg py-3 px-1 transition-colors"
                    style={{
                      backgroundColor: active
                        ? "color-mix(in srgb, var(--pixel-accent) 15%, var(--pixel-bg-surface))"
                        : undefined,
                      color: active ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
                    }}
                  >
                    <item.Icon className="h-5 w-5" />
                    <span className="font-pixel text-[8px] text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
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
              <span className="font-pixel text-[9px] leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-opacity"
          style={{
            color: moreIsActive ? "var(--pixel-accent)" : "var(--pixel-text-muted)",
          }}
        >
          <Grid3X3 className="h-5 w-5" />
          <span className="font-pixel text-[9px] leading-tight">More</span>
        </button>
      </nav>
    </>
  );
}
