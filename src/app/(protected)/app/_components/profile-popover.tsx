"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signout } from "@/app/(auth)/_actions/auth";
import { AvatarUpload } from "./avatar-upload";
import { playClick } from "@/lib/sfx";

interface ProfilePopoverProps {
  profile: {
    xp: number;
    coins: number;
    level: number;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function ProfilePopover({ profile }: ProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const name = profile?.display_name ?? "Student";
  const avatarUrl = profile?.avatar_url ?? null;

  // XP within current level
  const currentLevelXp = (level - 1) * (level - 1) * 50;
  const nextLevelXp = level * level * 50;
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpProgress = Math.min(xpInLevel / xpNeeded, 1);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* ─── Trigger ─── */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); playClick(); }}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
        style={{
          backgroundColor: open
            ? "color-mix(in srgb, var(--pixel-accent) 14%, transparent)"
            : "transparent",
          border: "none",
        }}
        onMouseEnter={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "color-mix(in srgb, var(--pixel-accent) 8%, transparent)";
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
        }}
      >
        {/* Avatar circle */}
        <div
          className="overflow-hidden rounded-full flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "2px solid var(--pixel-accent)",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              width={32}
              height={32}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <img
              src="/sprites/travel-book/icons/CatHead.png"
              alt={name}
              width={24}
              height={24}
              className="pixel-art m-auto mt-0.5"
              draggable={false}
            />
          )}
        </div>

        {/* Name */}
        <span
          className="hidden sm:block max-w-[120px] truncate"
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "12px",
            color: "var(--pixel-text-primary)",
            letterSpacing: "0.5px",
          }}
        >
          {name}
        </span>

        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 6"
          fill="none"
          className="hidden sm:block"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            color: "var(--pixel-text-muted)",
          }}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* ─── Popover Card ─── */}
      {open && (
        <div
          className="pixel-panel absolute right-0 top-full z-50 w-64"
          style={{
            marginTop: "8px",
            backgroundColor: "var(--pixel-bg-surface)",
          }}
        >
          <div className="p-4">
            {/* Header: avatar + name + level */}
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--pixel-border)]">
              <AvatarUpload currentUrl={avatarUrl} size={56} />
              <div className="min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "13px",
                    color: "var(--pixel-text-primary)",
                  }}
                >
                  {name}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "11px",
                    color: "var(--pixel-accent)",
                  }}
                >
                  Level {level}
                </p>
              </div>
            </div>

            {/* XP Progress */}
            <div className="py-3 border-b border-[var(--pixel-border)]">
              <div className="flex justify-between mb-1.5">
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "10px",
                    color: "var(--pixel-text-secondary)",
                  }}
                >
                  XP Progress
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-pixel)",
                    fontSize: "10px",
                    color: "var(--pixel-text-secondary)",
                  }}
                >
                  {xpInLevel} / {xpNeeded}
                </span>
              </div>
              <div
                className="w-full overflow-hidden"
                style={{
                  height: "10px",
                  background: "var(--pixel-bg-primary)",
                  border: "2px solid var(--pixel-border)",
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${xpProgress * 100}%`,
                    backgroundColor: "var(--pixel-success)",
                    // Same stepped vocabulary as .animate-pixel-fill (steps(10)),
                    // transition-based here because this value updates dynamically.
                    transition: "width 0.4s steps(8)",
                  }}
                />
              </div>
              <p
                className="mt-1 text-right"
                style={{ fontSize: "10px", color: "var(--pixel-text-muted)" }}
              >
                {Math.round(xpProgress * 100)}% to Level {level + 1}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 space-y-1">
              <Link
                href="/app/settings"
                onClick={() => { setOpen(false); playClick(); }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
                style={{
                  color: "var(--pixel-text-primary)",
                  fontFamily: "var(--font-pixel)",
                  fontSize: "12px",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "var(--pixel-bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <img
                  src="/sprites/travel-book/icons/Gear.png"
                  alt=""
                  width={16}
                  height={16}
                  className="pixel-art"
                />
                Settings
              </Link>

              <form action={signout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
                  style={{
                    color: "var(--pixel-error)",
                    fontFamily: "var(--font-pixel)",
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "color-mix(in srgb, var(--pixel-error) 10%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "transparent";
                  }}
                >
                  <img
                    src="/sprites/travel-book/icons/Exit.png"
                    alt=""
                    width={16}
                    height={16}
                    className="pixel-art"
                  />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
