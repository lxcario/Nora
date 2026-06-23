"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  FlaskConical,
  BookOpen,
  DoorOpen,
} from "lucide-react";
import { IconSprite } from "./icon-sprite";

// ---------------------------------------------------------------------------
// Primary navigation items for mobile bottom nav
// Limited to 5 most important sections for thumb accessibility
// ---------------------------------------------------------------------------

const bottomNavItems = [
  { href: "/app", label: "Home", icon: "home", fallback: LayoutDashboard },
  { href: "/app/review", label: "Review", icon: "book", fallback: BookOpen },
  { href: "/app/feynman", label: "Feynman", icon: "pen", fallback: PenLine },
  { href: "/app/research", label: "Research", icon: "flask", fallback: FlaskConical },
  { href: "/app/room", label: "Room", icon: "door", fallback: DoorOpen },
];

// ---------------------------------------------------------------------------
// BottomNav Component
// ---------------------------------------------------------------------------

/**
 * Mobile-optimized bottom navigation bar.
 * Fixed to the bottom of the screen on viewports < 768px (md breakpoint).
 * Hidden on desktop (md and up).
 *
 * Each tab maintains a minimum 44×44 CSS pixel touch target for accessibility.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around px-2 py-1 md:hidden"
      style={{
        borderTop: "2px solid var(--pixel-border)",
        backgroundColor: "var(--pixel-bg-surface)",
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {bottomNavItems.map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-opacity"
            style={{
              color: isActive
                ? "var(--pixel-accent)"
                : "var(--pixel-text-muted)",
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
    </nav>
  );
}
