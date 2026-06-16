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
import { MusicPlayer } from "./music-player";
import { SfxToggle } from "./sfx-toggle";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/room", label: "Pixel Room", icon: Gamepad2 },
  { href: "/app/feynman", label: "Feynman Mode", icon: PenLine },
  { href: "/app/review", label: "Review", icon: Layers },
  { href: "/app/study", label: "Study Mix", icon: Shuffle },
  { href: "/app/research", label: "Research", icon: FlaskConical },
  { href: "/app/study-room", label: "Study Room", icon: MonitorPlay },
  { href: "/app/planner", label: "Planner", icon: CalendarDays },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/history", label: "History", icon: History },
  { href: "/app/party", label: "Party", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Logo / Brand */}
      <div className="flex items-center justify-center border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <img src="/nora-logo.png" alt="Nora" className="h-8" style={{ imageRendering: "pixelated" }} />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Music Player */}
      <MusicPlayer />

      {/* SFX Mute Toggle */}
      <SfxToggle />

      {/* Sign out */}
      <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
        <form action={signout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
