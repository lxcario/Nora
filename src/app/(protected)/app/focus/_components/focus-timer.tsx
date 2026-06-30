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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampInt(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Circular progress ring
// ---------------------------------------------------------------------------

function ProgressRing({
  fraction,
  color,
  label,
  timeText,
}: {
  fraction: number;
  color: string;
  label: string;
  timeText: string;
}) {
  const size = 220;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, fraction)));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="pixel-art -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--pixel-bg-elevated)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="font-pixel text-[11px] uppercase tracking-wide"
          style={{ color: "var(--pixel-text-secondary)" }}
        >
          {label}
        </span>
        <span
          className="font-pixel text-4xl tabular-nums"
          style={{ color: "var(--pixel-text-primary)" }}
          aria-live="polite"
        >
          {timeText}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FocusTimer
// ---------------------------------------------------------------------------

export function FocusTimer({ recommendation }: { recommendation: FocusRecommendation }) {
  const [focusMinutes, setFocusMinutes] = useState(recommendation.focusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(recommendation.breakMinutes);
  const [totalBlocks, setTotalBlocks] = useState(4);

  const [phase, setPhase] = useState<Phase>("idle");
  const [paused, setPaused] = useState(false);
  const [blockIndex, setBlockIndex] = useState(1); // 1-based
  const [remainingMs, setRemainingMs] = useState(recommendation.focusMinutes * 60_000);
  const [muted, setMuted] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const hydrated = useRef(false);

  const phaseDurationMs =
    phase === "break" ? breakMinutes * 60_000 : focusMinutes * 60_000;

  const chime = useCallback(
    (kind: "focus" | "break" | "complete") => {
      if (muted) return;
      if (kind === "focus") playFocusEndChime();
      else if (kind === "break") playBreakEndChime();
      else playSessionCompleteChime();
    },
    [muted],
  );

  // ── Restore persisted state on mount ──────────────────────────────────────
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
        if (remain > 0) {
          endAtRef.current = s.endAt;
          setRemainingMs(remain);
        } else {
          // Timer elapsed while away — reset to idle rather than guessing.
          setPhase("idle");
          setPaused(false);
        }
      } else {
        setRemainingMs(clampInt(s.remainingMs ?? 0, 0, FOCUS_MAX * 60_000));
      }
    } catch {
      // ignore corrupted state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (phase === "idle") {
        localStorage.removeItem(LS_KEY);
        return;
      }
      const payload: PersistedState = {
        phase,
        paused,
        remainingMs,
        blockIndex,
        totalBlocks,
        focusMinutes,
        breakMinutes,
        endAt: endAtRef.current,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      // storage unavailable
    }
  }, [phase, paused, remainingMs, blockIndex, totalBlocks, focusMinutes, breakMinutes]);

  // ── Keep idle countdown display in sync with config edits ─────────────────
  useEffect(() => {
    if (phase === "idle") setRemainingMs(focusMinutes * 60_000);
  }, [focusMinutes, phase]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  // ── Phase transition when a block elapses ─────────────────────────────────
  const advancePhase = useCallback(() => {
    if (phase === "focus") {
      const lastBlock = blockIndex >= totalBlocks;
      if (lastBlock) {
        chime("complete");
        endAtRef.current = null;
        setPhase("complete");
        setRemainingMs(0);
      } else {
        chime("focus");
        const ms = breakMinutes * 60_000;
        endAtRef.current = Date.now() + ms;
        setPhase("break");
        setRemainingMs(ms);
      }
    } else if (phase === "break") {
      chime("break");
      const ms = focusMinutes * 60_000;
      endAtRef.current = Date.now() + ms;
      setBlockIndex((i) => i + 1);
      setPhase("focus");
      setRemainingMs(ms);
    }
  }, [phase, blockIndex, totalBlocks, breakMinutes, focusMinutes, chime]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if ((phase !== "focus" && phase !== "break") || paused) return;
    const id = setInterval(() => {
      const endAt = endAtRef.current;
      if (endAt == null) return;
      const remain = endAt - Date.now();
      if (remain <= 0) {
        advancePhase();
      } else {
        setRemainingMs(remain);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, paused, advancePhase]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    getAudioContext(); // unlock audio on the starting gesture
    const ms = focusMinutes * 60_000;
    endAtRef.current = Date.now() + ms;
    setBlockIndex(1);
    setRemainingMs(ms);
    setPaused(false);
    setPhase("focus");
  }, [focusMinutes]);

  const pause = useCallback(() => {
    if (endAtRef.current != null) setRemainingMs(Math.max(0, endAtRef.current - Date.now()));
    endAtRef.current = null;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    endAtRef.current = Date.now() + remainingMs;
    setPaused(false);
  }, [remainingMs]);

  const reset = useCallback(() => {
    endAtRef.current = null;
    setPhase("idle");
    setPaused(false);
    setBlockIndex(1);
    setRemainingMs(focusMinutes * 60_000);
  }, [focusMinutes]);

  // ── Render ──────────────────────────────────────────────────────────────
  const isFocus = phase === "focus";
  const isBreak = phase === "break";
  const running = (isFocus || isBreak) && !paused;
  const ringColor = isBreak ? "var(--pixel-success)" : "var(--pixel-accent)";
  const phaseLabel =
    phase === "complete"
      ? "Session complete"
      : isBreak
        ? "Break"
        : isFocus
          ? "Focus"
          : "Ready";
  const fraction = phase === "idle" ? 1 : remainingMs / phaseDurationMs;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6">
      {/* Block counter + phase */}
      <div className="flex items-center gap-3">
        <span className="font-pixel text-sm" style={{ color: "var(--pixel-accent)" }}>
          Block {Math.min(blockIndex, totalBlocks)} / {totalBlocks}
        </span>
        {running && (
          <span
            className="font-pixel text-[10px] px-2 py-0.5"
            style={{
              color: "var(--pixel-text-secondary)",
              border: "1px solid var(--pixel-border)",
            }}
          >
            {isBreak ? "BREAK" : "FOCUS"}
          </span>
        )}
        {paused && (isFocus || isBreak) && (
          <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-warning)" }}>
            PAUSED
          </span>
        )}
      </div>

      <ProgressRing
        fraction={fraction}
        color={ringColor}
        label={phaseLabel}
        timeText={formatMMSS(remainingMs)}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase === "idle" && (
          <button type="button" onClick={start} className="pixel-btn pixel-btn-primary">
            Start Focus Session
          </button>
        )}
        {(isFocus || isBreak) && !paused && (
          <button type="button" onClick={pause} className="pixel-btn pixel-btn-secondary">
            Pause
          </button>
        )}
        {(isFocus || isBreak) && paused && (
          <button type="button" onClick={resume} className="pixel-btn pixel-btn-primary">
            Resume
          </button>
        )}
        {(isFocus || isBreak) && (
          <button type="button" onClick={reset} className="pixel-btn pixel-btn-secondary">
            Reset
          </button>
        )}
        {phase === "complete" && (
          <button type="button" onClick={reset} className="pixel-btn pixel-btn-primary">
            Start New Session
          </button>
        )}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="pixel-btn pixel-btn-secondary pixel-btn-sm"
          aria-pressed={muted}
          title={muted ? "Unmute chimes" : "Mute chimes"}
        >
          {muted ? "Sound: off" : "Sound: on"}
        </button>
      </div>

      {phase === "complete" && (
        <p className="text-center text-sm" style={{ color: "var(--pixel-success)" }}>
          Nice work — you finished all {totalBlocks} focus blocks!
        </p>
      )}

      {/* Adaptive recommendation + overrides (only while idle) */}
      {phase === "idle" && (
        <div className="pixel-panel w-full" style={{ padding: "var(--pixel-panel-compact)" }}>
          <p className="mb-3 text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
            <span className="font-pixel" style={{ color: "var(--pixel-accent)" }}>
              Suggested:
            </span>{" "}
            {recommendation.focusMinutes} min focus / {recommendation.breakMinutes} min break
            {" — "}
            {recommendation.reason}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="Focus (min)"
              value={focusMinutes}
              min={FOCUS_MIN}
              max={FOCUS_MAX}
              onChange={(v) => setFocusMinutes(clampInt(v, FOCUS_MIN, FOCUS_MAX))}
            />
            <NumberField
              label="Break (min)"
              value={breakMinutes}
              min={BREAK_MIN}
              max={BREAK_MAX}
              onChange={(v) => setBreakMinutes(clampInt(v, BREAK_MIN, BREAK_MAX))}
            />
            <NumberField
              label="Blocks"
              value={totalBlocks}
              min={MIN_BLOCKS}
              max={MAX_BLOCKS}
              onChange={(v) => setTotalBlocks(clampInt(v, MIN_BLOCKS, MAX_BLOCKS))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-secondary)" }}>
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pixel-input w-full px-2 py-1 text-sm"
        style={{
          backgroundColor: "var(--pixel-bg-primary)",
          border: "2px solid var(--pixel-border)",
          color: "var(--pixel-text-primary)",
        }}
      />
    </label>
  );
}
