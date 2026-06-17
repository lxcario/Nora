"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/(auth)/_actions/auth";

const navItems = [
  { href: "/app", icon: "/sprites/travel-book/icons/Home.png", label: "Home" },
  { href: "/app/review", icon: "/sprites/travel-book/icons/Book.png", label: "Review" },
  { href: "/app/feynman", icon: "/sprites/travel-book/icons/Lightbulb.png", label: "Feynman" },
  { href: "/app/research", icon: "/sprites/travel-book/icons/MagnifyingGlass.png", label: "Research" },
  { href: "/app/planner", icon: "/sprites/travel-book/icons/Document.png", label: "Planner" },
  { href: "/app/analytics", icon: "/sprites/travel-book/icons/Trophy.png", label: "Analytics" },
  { href: "/app/room", icon: "/sprites/travel-book/icons/Gamepad.png", label: "Pixel Room" },
  { href: "/app/collection", icon: "/sprites/travel-book/icons/ChestTreasure.png", label: "Collection" },
];

interface GameSidebarProps {
  profile: { xp: number; coins: number; level: number; display_name?: string | null } | null;
}

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

export function GameSidebar({ profile }: GameSidebarProps) {
  const pathname = usePathname();
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;

  // Calculate XP progress for current level
  const currentLevelXp = (level - 1) * (level - 1) * 50;
  const nextLevelXp = level * level * 50;
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpProgress = Math.min(xpInLevel / xpNeeded, 1);

  return (
    <aside
      className="hidden md:flex flex-col w-[180px] min-h-screen flex-shrink-0"
      style={{
        backgroundColor: "#1e1814",
        borderRight: "1px solid #3d2817",
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex flex-col items-center">
        <span
          className="font-pixel text-xl tracking-wider"
          style={{ color: "#d4a526" }}
        >
          ✦ NORA ✦
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm"
              style={{
                backgroundColor: isActive ? "#2d4a2d" : "transparent",
                color: isActive ? "#ffffff" : "#c4a882",
              }}
            >
              <TBIcon src={item.icon} alt={item.label} size={18} />
              <span className={isActive ? "font-medium" : ""}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Settings - separated */}
        <div className="pt-3">
          <Link
            href="/app/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm"
            style={{
              backgroundColor: pathname.startsWith("/app/settings")
                ? "#2d4a2d"
                : "transparent",
              color: pathname.startsWith("/app/settings")
                ? "#ffffff"
                : "#c4a882",
            }}
          >
            <TBIcon src="/sprites/travel-book/icons/Gear.png" alt="Settings" size={18} />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Avatar + Level section at bottom */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid #3d2817" }}>
        <div className="flex flex-col items-center gap-2">
          {/* Avatar circle */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "#2a2018",
              border: "2px solid #d4a526",
            }}
          >
            <TBIcon src="/sprites/travel-book/icons/CatHead.png" alt="Avatar" size={28} />
          </div>
          <div className="text-center">
            <p className="font-pixel text-xs" style={{ color: "#f0e6d2" }}>
              Student
            </p>
            <p className="text-[10px]" style={{ color: "#c4a882" }}>
              Level {level}
            </p>
          </div>
          {/* XP bar */}
          <div className="w-full">
            <div className="flex justify-between mb-1">
              <span className="text-[9px]" style={{ color: "#c4a882" }}>
                {xpInLevel} / {xpNeeded} XP
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "#1a1410" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${xpProgress * 100}%`,
                  backgroundColor: "#7da856",
                }}
              />
            </div>
          </div>
        </div>

        {/* Sign out */}
        <form action={signout} className="mt-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-1.5 w-full rounded text-xs transition-colors hover:opacity-80"
            style={{ color: "#c4a882" }}
          >
            <TBIcon src="/sprites/travel-book/icons/Exit.png" alt="Sign out" size={14} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
