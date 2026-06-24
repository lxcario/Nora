"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  PenLine,
  FlaskConical,
  Monitor,
  Calendar,
  Trophy,
  Users,
  Settings,
  DoorOpen,
  GraduationCap,
  FileText,
  LayoutDashboard,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Command Palette (Cmd+K / Ctrl+K) — UX Audit #13
// ---------------------------------------------------------------------------

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  {
    id: "home",
    label: "Dashboard",
    description: "Go to home",
    href: "/app",
    icon: LayoutDashboard,
    keywords: ["home", "dashboard", "main"],
  },
  {
    id: "review",
    label: "Review Cards",
    description: "FSRS spaced repetition",
    href: "/app/review",
    icon: BookOpen,
    keywords: ["review", "cards", "flashcards", "spaced", "fsrs"],
  },
  {
    id: "feynman",
    label: "Feynman Mode",
    description: "Explain and get feedback",
    href: "/app/feynman",
    icon: PenLine,
    keywords: ["feynman", "explain", "teach", "evaluate"],
  },
  {
    id: "research",
    label: "Research Desk",
    description: "AI-powered academic search",
    href: "/app/research",
    icon: FlaskConical,
    keywords: ["research", "search", "academic", "papers", "sources"],
  },
  {
    id: "study-room",
    label: "Study Room",
    description: "Video notes and transcripts",
    href: "/app/study-room",
    icon: Monitor,
    keywords: ["video", "youtube", "study", "room", "notes", "transcript"],
  },
  {
    id: "planner",
    label: "Study Planner",
    description: "Spacing-aware schedule",
    href: "/app/planner",
    icon: Calendar,
    keywords: ["planner", "schedule", "calendar", "spacing", "exam"],
  },
  {
    id: "exam",
    label: "Practice Exam",
    description: "Test your knowledge",
    href: "/app/exam",
    icon: FileText,
    keywords: ["exam", "practice", "test", "quiz"],
  },
  {
    id: "room",
    label: "Pixel Room",
    description: "Your pet and avatar",
    href: "/app/room",
    icon: DoorOpen,
    keywords: ["room", "pet", "pixel", "avatar", "companion"],
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Progress and stats",
    href: "/app/analytics",
    icon: Trophy,
    keywords: ["analytics", "stats", "progress", "charts", "heatmap"],
  },
  {
    id: "party",
    label: "Study Circle",
    description: "Friends and quests",
    href: "/app/party",
    icon: Users,
    keywords: ["party", "friends", "social", "group", "circle", "quest"],
  },
  {
    id: "academic",
    label: "My University",
    description: "Academic profile and calendar",
    href: "/app/academic",
    icon: GraduationCap,
    keywords: ["university", "academic", "calendar", "semester"],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Preferences and themes",
    href: "/app/settings",
    icon: Settings,
    keywords: ["settings", "preferences", "theme", "palette", "cursor"],
  },
];

function filterCommands(query: string): CommandItem[] {
  if (!query.trim()) return COMMANDS;
  const q = query.toLowerCase().trim();
  return COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = filterCommands(query);

  // Open/close with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].href);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="absolute inset-x-4 top-[15vh] max-w-lg mx-auto">
        <div
          className="pixel-panel pixel-panel-lg overflow-hidden animate-pixel-pop"
          style={{ backgroundColor: "var(--pixel-bg-surface)" }}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "2px solid var(--pixel-border)" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--pixel-text-muted)" }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Where do you want to go?"
              className="flex-1 bg-transparent border-none outline-none text-sm font-pixel"
              style={{ color: "var(--pixel-text-primary)" }}
              aria-label="Search commands"
            />
            <kbd
              className="font-pixel text-[9px] px-1.5 py-0.5"
              style={{
                color: "var(--pixel-text-muted)",
                border: "1px solid var(--pixel-border)",
              }}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="font-pixel text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                  No matching pages
                </p>
              </div>
            ) : (
              filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                const isSelected = i === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd.href)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--pixel-accent) 12%, var(--pixel-bg-surface))"
                        : undefined,
                      color: isSelected ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
                    }}
                    aria-selected={isSelected}
                    role="option"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-pixel text-[11px] block">{cmd.label}</span>
                      {cmd.description && (
                        <span
                          className="text-[10px] block truncate"
                          style={{ color: "var(--pixel-text-muted)" }}
                        >
                          {cmd.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-accent)" }}>
                        Enter ↵
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{
              borderTop: "2px solid var(--pixel-border)",
              color: "var(--pixel-text-muted)",
            }}
          >
            <span className="font-pixel text-[8px]">↑↓ navigate · Enter select · Esc close</span>
            <span className="font-pixel text-[8px]">Ctrl+K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
