"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BREAK_MAX,
  BREAK_MIN,
  FOCUS_MAX,
  FOCUS_MIN,
  type FocusRecommendation,
} from "@/lib/focus-adaptive";
import {
  getAudioContext,
  playBreakEndChime,
  playFocusEndChime,
  playSessionCompleteChime,
} from "@/lib/focus-audio";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Phase = "idle" | "focus" | "break" | "complete";

const LS_KEY = "nora_focus_timer";
const LS_MUTE_KEY = "nora_focus_muted";
const TICK_MS = 250;
const MIN_BLOCKS = 1;
const MAX_BLOCKS = 8;

interface PersistedState {
  phase: Phase;
  paused: boolean;
  remainingMs: number;
  blockIndex: number;
  totalBlocks: number;
  focusMinutes: number;
  breakMinutes: number;
  endAt: number | null;
}

function clampInt(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function formatTime(ms: number): { minutes: string; seconds: string } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    minutes: String(Math.floor(total / 60)).padStart(2, "0"),
    seconds: String(total % 60).padStart(2, "0"),
  };
}

// ---------------------------------------------------------------------------
// FocusTimer — v3: clean, centered, warm, usable
// ---------------------------------------------------------------------------

export function FocusTimer({
  recommendation,
  petSprite,
  petName,
}: {
  recommendation: FocusRecommendation;
  petSprite: string | null;
  petName: string;
}) {
  const [focusMinutes, setFocusMinutes] = useState(recommendation.focusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(recommendation.breakMinutes);
  const [totalBlocks, setTotalBlocks] = useState(4);

  const [phase, setPhase] = useState<Phase>("idle");
  const [paused, setPaused] = useState(false);
  const [blockIndex, setBlockIndex] = useState(1);
  const [remainingMs, setRemainingMs] = useState(recommendation.focusMinutes * 60_000);
  const [muted, setMuted] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const hydrated = useRef(false);

  const phaseDurationMs = phase === "break" ? breakMinutes * 60_000 : focusMinutes * 60_000;

  const chime = useCallback((kind: "focus" | "break" | "complete") => {
    if (muted) return;
    if (kind === "focus") playFocusEndChime();
    else if (kind === "break") playBreakEndChime();
    else playSessionCompleteChime();
  }, [muted]);

  // ── Hydrate from localStorage ─────────────────────────────────────────────
  useEffect(() => {
    hydrated.current = true;
    try {
      setMuted(localStorage.getItem(LS_MUTE_KEY) === "1");
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<PersistedState>;
      if (!s || (s.phase !== "focus" && s.phase !== "break" && s.phase !== "complete")) return;
      setFocusMinutes(clampInt(s.focusMinutes ?? recommendation.focusMinutes, FOCUS_MIN, FOCUS_MAX));
      setBreakMinutes(clampInt(s.breakMinutes ?? recommendation.breakMinutes, BREAK_MIN, BREAK_MAX));
      setTotalBlocks(clampInt(s.totalBlocks ?? 4, MIN_BLOCKS, MAX_BLOCKS));
      setBlockIndex(clampInt(s.blockIndex ?? 1, 1, MAX_BLOCKS));
      setPhase(s.phase);
      setPaused(Boolean(s.paused));
      if (s.phase !== "complete" && !s.paused && typeof s.endAt === "number") {
        const remain = s.endAt - Date.now();
        if (remain > 0) { endAtRef.current = s.endAt; setRemainingMs(remain); }
        else { setPhase("idle"); setPaused(false); }
      } else { setRemainingMs(clampInt(s.remainingMs ?? 0, 0, FOCUS_MAX * 60_000)); }
    } catch { /* corrupted */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (phase === "idle") { localStorage.removeItem(LS_KEY); return; }
      localStorage.setItem(LS_KEY, JSON.stringify({ phase, paused, remainingMs, blockIndex, totalBlocks, focusMinutes, breakMinutes, endAt: endAtRef.current } satisfies PersistedState));
    } catch { /* */ }
  }, [phase, paused, remainingMs, blockIndex, totalBlocks, focusMinutes, breakMinutes]);

  useEffect(() => { if (phase === "idle") setRemainingMs(focusMinutes * 60_000); }, [focusMinutes, phase]);
  useEffect(() => { try { localStorage.setItem(LS_MUTE_KEY, muted ? "1" : "0"); } catch { /* */ } }, [muted]);

  // ── Phase transitions ─────────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    if (phase === "focus") {
      if (blockIndex >= totalBlocks) { chime("complete"); endAtRef.current = null; setPhase("complete"); setRemainingMs(0); }
      else { chime("focus"); const ms = breakMinutes * 60_000; endAtRef.current = Date.now() + ms; setPhase("break"); setRemainingMs(ms); }
    } else if (phase === "break") {
      chime("break"); const ms = focusMinutes * 60_000; endAtRef.current = Date.now() + ms; setBlockIndex(i => i + 1); setPhase("focus"); setRemainingMs(ms);
    }
  }, [phase, blockIndex, totalBlocks, breakMinutes, focusMinutes, chime]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if ((phase !== "focus" && phase !== "break") || paused) return;
    const id = setInterval(() => {
      const endAt = endAtRef.current;
      if (endAt == null) return;
      const remain = endAt - Date.now();
      if (remain <= 0) advancePhase(); else setRemainingMs(remain);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, paused, advancePhase]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const start = useCallback(() => { getAudioContext(); const ms = focusMinutes * 60_000; endAtRef.current = Date.now() + ms; setBlockIndex(1); setRemainingMs(ms); setPaused(false); setPhase("focus"); }, [focusMinutes]);
  const pause = useCallback(() => { if (endAtRef.current != null) setRemainingMs(Math.max(0, endAtRef.current - Date.now())); endAtRef.current = null; setPaused(true); }, []);
  const resume = useCallback(() => { endAtRef.current = Date.now() + remainingMs; setPaused(false); }, [remainingMs]);
  const reset = useCallback(() => { endAtRef.current = null; setPhase("idle"); setPaused(false); setBlockIndex(1); setRemainingMs(focusMinutes * 60_000); }, [focusMinutes]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isFocus = phase === "focus";
  const isBreak = phase === "break";
  const isActive = (isFocus || isBreak);
  const fraction = phase === "idle" ? 1 : remainingMs / phaseDurationMs;
  const time = formatTime(remainingMs);

  const phaseColor = isBreak ? "var(--pixel-success)" : "var(--pixel-accent)";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">

      {/* ═══ Main timer card ═══ */}
      <div
        className="pixel-panel w-full flex flex-col items-center gap-5 relative overflow-hidden"
        style={{ padding: "40px 24px 32px" }}
      >
        {/* Subtle warm glow behind the time when active */}
        {isActive && !paused && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${phaseColor}, transparent 70%)` }}
          />
        )}

        {/* Phase indicator pill */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: phase === "idle" ? "var(--pixel-text-muted)" : phaseColor,
              animation: isActive && !paused ? "pulse 2s ease-in-out infinite" : undefined,
            }}
          />
          <span className="font-pixel text-[11px] uppercase tracking-widest" style={{ color: phase === "idle" ? "var(--pixel-text-secondary)" : phaseColor }}>
            {phase === "complete" ? "Complete" : isBreak ? "Break" : isFocus ? "Focus" : "Ready"}
          </span>
          {paused && isActive && (
            <span className="font-pixel text-[9px] px-1.5 py-0.5" style={{ color: "var(--pixel-warning)", border: "1px solid var(--pixel-warning)" }}>
              PAUSED
            </span>
          )}
        </div>

        {/* ═══ THE TIME — the hero of this page ═══ */}
        <div className="flex items-baseline gap-1 select-none" aria-live="polite">
          <span className="font-pixel text-6xl sm:text-7xl tabular-nums leading-none" style={{ color: "var(--pixel-text-primary)" }}>
            {time.minutes}
          </span>
          <span className="font-pixel text-4xl sm:text-5xl tabular-nums leading-none" style={{ color: "var(--pixel-text-muted)", animation: isActive && !paused ? "blink 1s steps(1) infinite" : undefined }}>
            :
          </span>
          <span className="font-pixel text-6xl sm:text-7xl tabular-nums leading-none" style={{ color: "var(--pixel-text-primary)" }}>
            {time.seconds}
          </span>
        </div>

        {/* Progress bar — thin, warm, not clinical */}
        <div className="w-full max-w-xs">
          <div
            className="h-2 w-full overflow-hidden"
            style={{ backgroundColor: "var(--pixel-bg-primary)", border: "2px solid var(--pixel-border)" }}
          >
            <div
              className="h-full transition-all duration-300 ease-linear"
              style={{ width: `${fraction * 100}%`, backgroundColor: phaseColor }}
            />
          </div>
        </div>

        {/* Block dots — visual progress without numbers feeling heavy */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalBlocks }, (_, i) => {
            const blockNum = i + 1;
            const isDone = blockNum < blockIndex;
            const isCurrent = blockNum === blockIndex && isActive;
            return (
              <div
                key={i}
                className="transition-all duration-200"
                style={{
                  width: isCurrent ? 14 : 10,
                  height: isCurrent ? 14 : 10,
                  borderRadius: "2px",
                  backgroundColor: isDone
                    ? phaseColor
                    : isCurrent
                      ? `color-mix(in srgb, ${phaseColor} 50%, var(--pixel-bg-surface))`
                      : "var(--pixel-bg-elevated)",
                  border: isCurrent ? `2px solid ${phaseColor}` : "2px solid var(--pixel-border)",
                }}
                title={`Block ${blockNum}${isDone ? " ✓" : isCurrent ? " (current)" : ""}`}
              />
            );
          })}
        </div>

        {/* Pet companion — small, subtle, alive */}
        {petSprite && isActive && (
          <div className="flex items-center gap-2 mt-1">
            <img
              src={petSprite}
              alt={petName}
              width={28}
              height={28}
              className={`pixel-art ${isBreak ? "animate-pixel-float" : ""}`}
              draggable={false}
            />
            <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
              {isBreak ? `${petName} says rest up` : `${petName} is studying with you`}
            </span>
          </div>
        )}
      </div>

      {/* ═══ Controls ═══ */}
      <div className="flex items-center gap-3">
        {phase === "idle" && (
          <button type="button" onClick={start} className="pixel-btn pixel-btn-primary">
            Start session
          </button>
        )}
        {isActive && !paused && (
          <button type="button" onClick={pause} className="pixel-btn pixel-btn-secondary">
            Pause
          </button>
        )}
        {isActive && paused && (
          <button type="button" onClick={resume} className="pixel-btn pixel-btn-primary">
            Resume
          </button>
        )}
        {isActive && (
          <button type="button" onClick={reset} className="pixel-btn pixel-btn-secondary">
            Stop
          </button>
        )}
        {phase === "complete" && (
          <button type="button" onClick={reset} className="pixel-btn pixel-btn-primary">
            New session
          </button>
        )}
        <button
          type="button"
          onClick={() => setMuted(m => !m)}
          className="pixel-btn pixel-btn-secondary pixel-btn-sm"
          aria-pressed={muted}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* ═══ Complete message ═══ */}
      {phase === "complete" && (
        <div
          className="pixel-panel w-full text-center py-5"
          style={{ borderColor: "var(--pixel-success)", backgroundColor: "color-mix(in srgb, var(--pixel-success) 8%, var(--pixel-bg-surface))" }}
        >
          {petSprite && (
            <img src={petSprite} alt={petName} width={40} height={40} className="pixel-art mx-auto mb-2 animate-pixel-wiggle" draggable={false} />
          )}
          <p className="font-pixel text-sm" style={{ color: "var(--pixel-success)" }}>
            All {totalBlocks} blocks done!
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--pixel-text-secondary)" }}>
            {petName} is proud of you. Take a proper break — you earned it.
          </p>
        </div>
      )}

      {/* ═══ Settings — only when idle, compact ═══ */}
      {phase === "idle" && (
        <div className="pixel-panel w-full" style={{ padding: "var(--pixel-panel-compact)" }}>
          <p className="text-xs mb-3" style={{ color: "var(--pixel-text-secondary)" }}>
            {recommendation.reason}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>Focus</span>
              <input type="number" min={FOCUS_MIN} max={FOCUS_MAX} value={focusMinutes} onChange={e => setFocusMinutes(clampInt(Number(e.target.value), FOCUS_MIN, FOCUS_MAX))} className="pixel-input w-full px-2 py-1.5 text-center text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>Break</span>
              <input type="number" min={BREAK_MIN} max={BREAK_MAX} value={breakMinutes} onChange={e => setBreakMinutes(clampInt(Number(e.target.value), BREAK_MIN, BREAK_MAX))} className="pixel-input w-full px-2 py-1.5 text-center text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>Blocks</span>
              <input type="number" min={MIN_BLOCKS} max={MAX_BLOCKS} value={totalBlocks} onChange={e => setTotalBlocks(clampInt(Number(e.target.value), MIN_BLOCKS, MAX_BLOCKS))} className="pixel-input w-full px-2 py-1.5 text-center text-sm" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
