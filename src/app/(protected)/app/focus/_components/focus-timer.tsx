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
// Cozy desk scene sub-components
// ---------------------------------------------------------------------------

/** Pixel-art candle that flickers during focus, dims during break, off when idle */
function PixelCandle({ phase, paused }: { phase: Phase; paused: boolean }) {
  const isLit = (phase === "focus" || phase === "break") && !paused;
  const isBreak = phase === "break";

  return (
    <div className="relative flex flex-col items-center">
      {/* Flame */}
      {isLit && (
        <div
          className={`absolute -top-3 w-3 h-4 rounded-full ${isBreak ? "animate-pulse" : "animate-pixel-float"}`}
          style={{
            background: isBreak
              ? "radial-gradient(ellipse, #7da856 0%, transparent 70%)"
              : "radial-gradient(ellipse, #d4a526 0%, #ff8c00 60%, transparent 80%)",
            opacity: 0.9,
            filter: "blur(1px)",
          }}
        />
      )}
      {/* Glow halo */}
      {isLit && (
        <div
          className="absolute -top-6 w-10 h-10 rounded-full opacity-20"
          style={{
            background: isBreak
              ? "radial-gradient(circle, #7da856, transparent 70%)"
              : "radial-gradient(circle, #d4a526, transparent 70%)",
          }}
        />
      )}
      {/* Candle body */}
      <img
        src="/sprites/travel-book/icons/PotionRed.png"
        alt="Desk candle"
        width={24}
        height={24}
        className="pixel-art"
        draggable={false}
        style={{ opacity: isLit ? 1 : 0.5 }}
      />
    </div>
  );
}

/** The hourglass-style progress visualization — pixel art, not an SVG ring */
function PixelHourglass({ fraction, phase }: { fraction: number; phase: Phase }) {
  const fillColor = phase === "break" ? "var(--pixel-success)" : "var(--pixel-accent)";
  const height = 80;
  const fillHeight = Math.round(height * Math.max(0, Math.min(1, fraction)));

  return (
    <div
      className="relative overflow-hidden pixel-panel pixel-panel-inset"
      style={{ width: 28, height, backgroundColor: "var(--pixel-bg-primary)" }}
    >
      {/* Sand fill from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-500"
        style={{ height: fillHeight, backgroundColor: fillColor, opacity: 0.7 }}
      />
      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.15) 2px 3px)",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FocusTimer (redesigned as a cozy desk scene)
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
          setPhase("idle");
          setPaused(false);
        }
      } else {
        setRemainingMs(clampInt(s.remainingMs ?? 0, 0, FOCUS_MAX * 60_000));
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (phase === "idle") { localStorage.removeItem(LS_KEY); return; }
      const payload: PersistedState = { phase, paused, remainingMs, blockIndex, totalBlocks, focusMinutes, breakMinutes, endAt: endAtRef.current };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch { /* storage unavailable */ }
  }, [phase, paused, remainingMs, blockIndex, totalBlocks, focusMinutes, breakMinutes]);

  useEffect(() => {
    if (phase === "idle") setRemainingMs(focusMinutes * 60_000);
  }, [focusMinutes, phase]);

  useEffect(() => {
    try { localStorage.setItem(LS_MUTE_KEY, muted ? "1" : "0"); } catch { /* */ }
  }, [muted]);

  // ── Phase transition ──────────────────────────────────────────────────────
  const advancePhase = useCallback(() => {
    if (phase === "focus") {
      if (blockIndex >= totalBlocks) {
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
      if (remain <= 0) advancePhase();
      else setRemainingMs(remain);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, paused, advancePhase]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    getAudioContext();
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const isFocus = phase === "focus";
  const isBreak = phase === "break";
  const isRunning = (isFocus || isBreak) && !paused;
  const fraction = phase === "idle" ? 1 : remainingMs / phaseDurationMs;

  // Pet mood based on timer state
  const petMood = phase === "complete"
    ? "celebrating"
    : isBreak
      ? "resting"
      : isFocus && !paused
        ? "focused"
        : "waiting";

  return (
    <div className="space-y-4">
      {/* ═══ Cozy desk scene ═══ */}
      <div className="pixel-panel pixel-panel-lg relative overflow-hidden p-0">
        <div className="relative h-[320px] w-full overflow-hidden">

          {/* ── Wall ── */}
          <div
            className="absolute inset-x-0 top-0 h-[45%]"
            style={{
              backgroundColor: "var(--pixel-room-wall, #3a2a1c)",
              backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 18px)",
              imageRendering: "pixelated",
            }}
          >
            {/* Window */}
            <div
              className="pixel-panel absolute left-[6%] top-[16%] h-[64%] w-[16%] overflow-hidden p-0"
              style={{ backgroundImage: "linear-gradient(180deg, #1a1a3a 0%, #2d2d5a 60%, #3a3a6a 100%)" }}
            >
              <img src="/sprites/travel-book/icons/Cloud.png" alt="" width={16} height={16} className="pixel-art absolute left-1 top-2 opacity-60" />
              <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-yellow-200 opacity-70" />
              <div className="absolute right-4 top-4 w-1 h-1 rounded-full bg-yellow-100 opacity-50" />
            </div>

            {/* Wall clock showing block progress */}
            <div className="pixel-panel absolute right-[8%] top-[14%] flex flex-col items-center px-2 py-1.5">
              <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-secondary)" }}>
                BLOCK
              </span>
              <span className="font-pixel text-base" style={{ color: "var(--pixel-accent)" }}>
                {Math.min(blockIndex, totalBlocks)}/{totalBlocks}
              </span>
            </div>

            {/* Motivational note on wall */}
            <div
              className="absolute left-[30%] top-[20%] font-pixel text-[8px] px-2 py-1 rotate-[-2deg]"
              style={{
                backgroundColor: "color-mix(in srgb, var(--pixel-accent) 20%, #f5e6c4)",
                color: "#5a3d2e",
                border: "1px solid #c4a882",
              }}
            >
              {phase === "complete" ? "You did it!" : isBreak ? "Take it easy..." : isFocus ? "You got this ✦" : "Ready when you are"}
            </div>
          </div>

          {/* ── Desk surface ── */}
          <div
            className="absolute inset-x-0 bottom-0 h-[55%]"
            style={{
              backgroundColor: "var(--pixel-room-floor, #5a3d24)",
              backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0 2px, transparent 2px 48px)",
              imageRendering: "pixelated",
            }}
          >
            {/* Desk top edge */}
            <div
              className="absolute top-0 left-[5%] right-[5%] h-3"
              style={{ backgroundColor: "#6b4c30", borderTop: "2px solid #8b6340" }}
            />
          </div>

          {/* ── Warm ambient glow from candle ── */}
          {isRunning && (
            <div
              className="pointer-events-none absolute left-[18%] top-[42%] h-40 w-40 opacity-20"
              style={{ background: isBreak
                ? "radial-gradient(circle, #7da856, transparent 70%)"
                : "radial-gradient(circle, #d4a526, transparent 70%)"
              }}
            />
          )}

          {/* ── Candle (left side of desk) ── */}
          <div className="absolute left-[14%] top-[42%]">
            <PixelCandle phase={phase} paused={paused} />
          </div>

          {/* ── Timer display (center of desk) ── */}
          <div className="absolute left-1/2 top-[46%] -translate-x-1/2 flex items-center gap-4">
            <PixelHourglass fraction={fraction} phase={phase} />

            <div className="flex flex-col items-center gap-1">
              {/* Phase label */}
              <span
                className="font-pixel text-[10px] uppercase tracking-wider"
                style={{
                  color: phase === "complete"
                    ? "var(--pixel-success)"
                    : isBreak
                      ? "var(--pixel-success)"
                      : "var(--pixel-accent)",
                }}
              >
                {phase === "complete" ? "All done!" : isBreak ? "Break time" : isFocus ? "Deep focus" : "Ready"}
              </span>

              {/* Time */}
              <span
                className="font-pixel text-3xl tabular-nums"
                style={{ color: "var(--pixel-text-primary)" }}
                aria-live="polite"
              >
                {formatMMSS(remainingMs)}
              </span>

              {/* Paused indicator */}
              {paused && (isFocus || isBreak) && (
                <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-warning)" }}>
                  ⏸ paused
                </span>
              )}
            </div>

            <PixelHourglass fraction={fraction} phase={phase} />
          </div>

          {/* ── Pet companion (right side of desk) ── */}
          <div className="absolute right-[12%] bottom-[18%] flex flex-col items-center">
            <div className={
              petMood === "celebrating" ? "animate-pixel-wiggle" :
              petMood === "focused" ? "" :
              "animate-pixel-float"
            }>
              {petSprite ? (
                <img
                  src={petSprite}
                  alt={petName}
                  width={52}
                  height={52}
                  className="pixel-art"
                  draggable={false}
                />
              ) : (
                <img
                  src="/sprites/travel-book/icons/PetBowl.png"
                  alt="Pet"
                  width={36}
                  height={36}
                  className="pixel-art"
                  draggable={false}
                />
              )}
            </div>
            {/* Pet thought bubble */}
            <span
              className="font-pixel text-[8px] mt-0.5"
              style={{ color: "var(--pixel-text-secondary)" }}
            >
              {petMood === "celebrating" ? "🎉 Great job!"
                : petMood === "resting" ? "💤 Rest well..."
                : petMood === "focused" ? "📖 Studying..."
                : `${petName} is here`}
            </span>
          </div>

          {/* ── Books / stationery on desk ── */}
          <div className="absolute left-[6%] bottom-[10%]">
            <img src="/sprites/travel-book/icons/Book.png" alt="" width={20} height={20} className="pixel-art" draggable={false} />
          </div>
          <div className="absolute left-[10%] bottom-[14%]">
            <img src="/sprites/travel-book/icons/Pencil.png" alt="" width={16} height={16} className="pixel-art rotate-[-20deg]" draggable={false} />
          </div>
          <div className="absolute right-[30%] bottom-[10%]">
            <img src="/sprites/travel-book/icons/MusicNotes.png" alt="" width={14} height={14} className="pixel-art opacity-50" draggable={false} />
          </div>
        </div>
      </div>

      {/* ═══ Controls (below the scene, styled as cozy buttons) ═══ */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase === "idle" && (
          <button type="button" onClick={start} className="pixel-btn pixel-btn-primary">
            <img src="/sprites/travel-book/icons/Lightbulb.png" alt="" width={14} height={14} className="pixel-art inline mr-2" />
            Begin Focus Session
          </button>
        )}
        {(isFocus || isBreak) && !paused && (
          <button type="button" onClick={pause} className="pixel-btn pixel-btn-secondary">
            <img src="/sprites/travel-book/icons/Sleep.png" alt="" width={14} height={14} className="pixel-art inline mr-2" />
            Pause
          </button>
        )}
        {(isFocus || isBreak) && paused && (
          <button type="button" onClick={resume} className="pixel-btn pixel-btn-primary">
            <img src="/sprites/travel-book/icons/Play.png" alt="" width={14} height={14} className="pixel-art inline mr-2" />
            Resume
          </button>
        )}
        {(isFocus || isBreak) && (
          <button type="button" onClick={reset} className="pixel-btn pixel-btn-secondary">
            <img src="/sprites/travel-book/icons/Restart.png" alt="" width={14} height={14} className="pixel-art inline mr-2" />
            Stop
          </button>
        )}
        {phase === "complete" && (
          <button type="button" onClick={reset} className="pixel-btn pixel-btn-primary">
            <img src="/sprites/travel-book/icons/Flower.png" alt="" width={14} height={14} className="pixel-art inline mr-2" />
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
          <img
            src={`/sprites/travel-book/icons/${muted ? "SpeakerMute" : "SpeakerOn"}.png`}
            alt=""
            width={14}
            height={14}
            className="pixel-art"
          />
        </button>
      </div>

      {/* ═══ Session complete celebration ═══ */}
      {phase === "complete" && (
        <div
          className="pixel-panel text-center py-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-success) 12%, var(--pixel-bg-surface))",
            border: "2px solid var(--pixel-success)",
          }}
        >
          <p className="font-pixel text-sm" style={{ color: "var(--pixel-success)" }}>
            ✦ Session complete — all {totalBlocks} blocks done!
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--pixel-text-secondary)" }}>
            +{totalBlocks * 10} XP earned · {petName} is proud of you
          </p>
        </div>
      )}

      {/* ═══ Settings panel (only when idle — cozy, not clinical) ═══ */}
      {phase === "idle" && (
        <div className="pixel-panel" style={{ padding: "var(--pixel-panel-compact)" }}>
          <div className="flex items-center gap-2 mb-3">
            <img src="/sprites/travel-book/icons/Gear.png" alt="" width={14} height={14} className="pixel-art" />
            <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
              SESSION SETUP
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--pixel-text-secondary)" }}>
            <span style={{ color: "var(--pixel-accent)" }}>Suggested:</span>{" "}
            {recommendation.focusMinutes}min focus / {recommendation.breakMinutes}min break — {recommendation.reason}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Focus (min)" value={focusMinutes} min={FOCUS_MIN} max={FOCUS_MAX} onChange={(v) => setFocusMinutes(clampInt(v, FOCUS_MIN, FOCUS_MAX))} />
            <NumberField label="Break (min)" value={breakMinutes} min={BREAK_MIN} max={BREAK_MAX} onChange={(v) => setBreakMinutes(clampInt(v, BREAK_MIN, BREAK_MAX))} />
            <NumberField label="Blocks" value={totalBlocks} min={MIN_BLOCKS} max={MAX_BLOCKS} onChange={(v) => setTotalBlocks(clampInt(v, MIN_BLOCKS, MAX_BLOCKS))} />
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-secondary)" }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pixel-input w-full px-2 py-1 text-sm"
        style={{ backgroundColor: "var(--pixel-bg-primary)", border: "2px solid var(--pixel-border)", color: "var(--pixel-text-primary)" }}
      />
    </label>
  );
}
