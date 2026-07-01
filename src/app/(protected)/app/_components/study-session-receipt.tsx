"use client";

import { useRef } from "react";
import { useStudySession, type ActivityType, type CompletedSession } from "./study-session-context";

// ---------------------------------------------------------------------------
// Study Session Receipt — "What you did" summary
// ---------------------------------------------------------------------------
// A4-style cozy pixel template that appears as a modal overlay when a session
// ends. Shows total time, activity breakdown, and can be downloaded as an image.
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG: Record<ActivityType, { emoji: string; label: string; color: string }> = {
  review:       { emoji: "📚", label: "Card reviews",       color: "var(--pixel-success)" },
  feynman:      { emoji: "💡", label: "Feynman explanations", color: "var(--pixel-accent)" },
  research:     { emoji: "🔬", label: "Research",           color: "#5b9bd5" },
  "study-room": { emoji: "🎬", label: "Video study",       color: "#e08a5b" },
  "study-mix":  { emoji: "🔀", label: "Study mix",         color: "#a98bd4" },
  planner:      { emoji: "📅", label: "Planning",           color: "var(--pixel-text-secondary)" },
  exam:         { emoji: "📝", label: "Practice exam",      color: "#d4708a" },
  focus:        { emoji: "⏱️", label: "Focus blocks",       color: "var(--pixel-accent)" },
  other:        { emoji: "📌", label: "Other",             color: "var(--pixel-text-muted)" },
};

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** Group activities by type and sum their durations */
function summarizeActivities(activities: CompletedSession["activities"]) {
  const map = new Map<ActivityType, number>();
  for (const a of activities) {
    const dur = (a.endedAt ?? Date.now()) - a.startedAt;
    map.set(a.type, (map.get(a.type) ?? 0) + dur);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, duration]) => ({ type, duration }));
}

function ReceiptContent({ session }: { session: CompletedSession }) {
  const summary = summarizeActivities(session.activities);
  const totalMs = session.endedAt - session.startedAt;

  return (
    <div
      className="bg-[var(--pixel-bg-surface)] border-2 border-[var(--pixel-border)] w-full max-w-md mx-auto"
      style={{ fontFamily: "var(--font-pixel, monospace)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 text-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--pixel-accent) 10%, var(--pixel-bg-surface))",
          borderBottom: "2px dashed var(--pixel-border)",
        }}
      >
        <img
          src="/noralogo.png"
          alt="Nora"
          className="pixel-art mx-auto mb-2"
          style={{ height: 28 }}
          draggable={false}
        />
        <p className="font-pixel text-[10px] tracking-widest uppercase" style={{ color: "var(--pixel-text-secondary)" }}>
          Study Session Complete
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--pixel-text-muted)" }}>
          {formatDate(session.startedAt)}
        </p>
      </div>

      {/* Big time */}
      <div className="px-6 py-5 text-center">
        <p className="font-pixel text-4xl" style={{ color: "var(--pixel-text-primary)" }}>
          {formatDuration(totalMs)}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--pixel-text-muted)" }}>
          {formatTime(session.startedAt)} — {formatTime(session.endedAt)}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-dashed" style={{ borderColor: "var(--pixel-border)" }} />

      {/* Activity breakdown */}
      <div className="px-6 py-4">
        <p className="font-pixel text-[9px] mb-3 uppercase tracking-wider" style={{ color: "var(--pixel-text-secondary)" }}>
          What you did
        </p>
        <div className="space-y-2">
          {summary.map(({ type, duration }) => {
            const config = ACTIVITY_CONFIG[type];
            const pct = Math.round((duration / totalMs) * 100);
            return (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm w-5 text-center">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[10px] truncate" style={{ color: "var(--pixel-text-primary)" }}>
                      {config.label}
                    </span>
                    <span className="font-pixel text-[9px] tabular-nums shrink-0 ml-2" style={{ color: "var(--pixel-text-secondary)" }}>
                      {formatDuration(duration)}
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div
                    className="h-1.5 mt-1 overflow-hidden"
                    style={{ backgroundColor: "var(--pixel-bg-primary)", border: "1px solid var(--pixel-border)" }}
                  >
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: config.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-dashed" style={{ borderColor: "var(--pixel-border)" }} />

      {/* Activity timeline */}
      <div className="px-6 py-4">
        <p className="font-pixel text-[9px] mb-2 uppercase tracking-wider" style={{ color: "var(--pixel-text-secondary)" }}>
          Timeline
        </p>
        <div className="space-y-1">
          {session.activities.slice(0, 12).map((a, i) => {
            const config = ACTIVITY_CONFIG[a.type];
            const dur = (a.endedAt ?? session.endedAt) - a.startedAt;
            return (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span style={{ color: "var(--pixel-text-muted)" }}>{formatTime(a.startedAt)}</span>
                <span>{config.emoji}</span>
                <span className="truncate" style={{ color: "var(--pixel-text-secondary)" }}>{a.label}</span>
                <span className="ml-auto tabular-nums" style={{ color: "var(--pixel-text-muted)" }}>
                  {formatDuration(dur)}
                </span>
              </div>
            );
          })}
          {session.activities.length > 12 && (
            <p className="text-[8px]" style={{ color: "var(--pixel-text-muted)" }}>
              +{session.activities.length - 12} more
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 text-center"
        style={{
          borderTop: "2px dashed var(--pixel-border)",
          backgroundColor: "color-mix(in srgb, var(--pixel-accent) 6%, var(--pixel-bg-surface))",
        }}
      >
        <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
          powered by nora — a softer way to study
        </p>
      </div>
    </div>
  );
}

export function StudySessionReceipt() {
  const { completedSession, dismissReceipt } = useStudySession();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!completedSession) return null;

  const handleDownload = async () => {
    // Use html2canvas if available, otherwise fall back to a simple approach
    const el = receiptRef.current;
    if (!el) return;
    try {
      // Dynamic import for lightweight bundle
      const { default: html2canvas } = await import("html2canvas" as string).catch(() => ({ default: null }));
      if (html2canvas) {
        const canvas = await (html2canvas as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>)(el, { scale: 2, backgroundColor: null });
        const link = document.createElement("a");
        link.download = `nora-session-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch {
      // Image export unavailable (e.g. html2canvas not installed). The receipt
      // is already on screen, so a screenshot works — fail quietly rather than
      // breaking immersion with a native browser alert().
      console.warn("Receipt image export unavailable; use a screenshot instead.");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Receipt card */}
        <div ref={receiptRef}>
          <ReceiptContent session={completedSession} />
        </div>

        {/* Actions below receipt */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button type="button" onClick={handleDownload} className="pixel-btn pixel-btn-secondary pixel-btn-sm">
            📥 Download
          </button>
          <button type="button" onClick={dismissReceipt} className="pixel-btn pixel-btn-primary pixel-btn-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
