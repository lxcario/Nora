"use client";

import { useState } from "react";
import { useStudySession, type ActivityType } from "./study-session-context";

// ---------------------------------------------------------------------------
// Floating Study Session Widget
// ---------------------------------------------------------------------------
// A small, persistent floating panel (bottom-right) that shows the running
// timer and current activity. Collapsible to a tiny pill. Start button when
// no session is active.
// ---------------------------------------------------------------------------

function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  review: "📚",
  feynman: "💡",
  research: "🔬",
  "study-room": "🎬",
  "study-mix": "🔀",
  planner: "📅",
  exam: "📝",
  focus: "⏱️",
  other: "📌",
};

export function StudySessionWidget() {
  const session = useStudySession();
  const [collapsed, setCollapsed] = useState(false);

  // Not active and no receipt → show start button as a pill
  if (!session.isActive && !session.completedSession) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
        <button
          type="button"
          onClick={session.startSession}
          className="pixel-panel flex items-center gap-2 px-3 py-2 transition-all hover:brightness-110 cursor-pointer"
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-accent) 15%, var(--pixel-bg-surface))",
            border: "2px solid var(--pixel-accent)",
          }}
        >
          <span className="text-sm">▶</span>
          <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-accent)" }}>
            Start studying
          </span>
        </button>
      </div>
    );
  }

  // Session active
  if (session.isActive) {
    const currentActivity = session.activities[session.activities.length - 1];
    const emoji = currentActivity ? ACTIVITY_EMOJI[currentActivity.type] : "📌";
    const label = currentActivity?.label ?? "Studying";

    // Collapsed: just a tiny time pill
    if (collapsed) {
      return (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="pixel-panel flex items-center gap-2 px-3 py-2 cursor-pointer"
            style={{ border: "2px solid var(--pixel-accent)" }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: session.isPaused ? "var(--pixel-warning)" : "var(--pixel-success)",
                animation: session.isPaused ? undefined : "pulse 2s ease-in-out infinite",
              }}
            />
            <span className="font-pixel text-[11px] tabular-nums" style={{ color: "var(--pixel-text-primary)" }}>
              {formatElapsed(session.totalElapsedMs)}
            </span>
          </button>
        </div>
      );
    }

    // Expanded
    return (
      <div
        className="fixed bottom-20 md:bottom-6 right-4 z-50 pixel-panel w-64"
        style={{ padding: "12px 14px" }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: session.isPaused ? "var(--pixel-warning)" : "var(--pixel-success)",
                animation: session.isPaused ? undefined : "pulse 2s ease-in-out infinite",
              }}
            />
            <span className="font-pixel text-[10px] uppercase" style={{ color: session.isPaused ? "var(--pixel-warning)" : "var(--pixel-success)" }}>
              {session.isPaused ? "Paused" : "Studying"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-[var(--pixel-text-muted)] hover:text-[var(--pixel-text-primary)] font-pixel text-xs px-1"
            title="Minimize"
          >
            ─
          </button>
        </div>

        {/* Timer */}
        <div className="text-center mb-3">
          <span className="font-pixel text-2xl tabular-nums" style={{ color: "var(--pixel-text-primary)" }}>
            {formatElapsed(session.totalElapsedMs)}
          </span>
        </div>

        {/* Current activity */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 mb-3"
          style={{ backgroundColor: "var(--pixel-bg-elevated)", border: "1px solid var(--pixel-border)" }}
        >
          <span className="text-sm">{emoji}</span>
          <span className="font-pixel text-[9px] truncate" style={{ color: "var(--pixel-text-secondary)" }}>
            {label}
          </span>
        </div>

        {/* Activity count */}
        <p className="text-[9px] mb-3" style={{ color: "var(--pixel-text-muted)" }}>
          {session.activities.length} {session.activities.length === 1 ? "activity" : "activities"} this session
        </p>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!session.isPaused ? (
            <button type="button" onClick={session.pauseSession} className="pixel-btn pixel-btn-secondary pixel-btn-sm flex-1">
              Pause
            </button>
          ) : (
            <button type="button" onClick={session.resumeSession} className="pixel-btn pixel-btn-primary pixel-btn-sm flex-1">
              Resume
            </button>
          )}
          <button type="button" onClick={session.endSession} className="pixel-btn pixel-btn-secondary pixel-btn-sm flex-1">
            End
          </button>
        </div>
      </div>
    );
  }

  // Completed session receipt is handled by the receipt component
  return null;
}
