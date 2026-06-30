// ---------------------------------------------------------------------------
// Focus Timer — 8-bit chimes (Web Audio, no audio files)
// ---------------------------------------------------------------------------
// Synthesizes short square-wave chimes for focus/break transitions, matching
// Nora's procedural-audio aesthetic (see src/lib/sfx.ts). All functions are
// no-ops when Web Audio is unavailable so they are safe to call anywhere.
// ---------------------------------------------------------------------------

type WebAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;

/**
 * Lazily create (or resume) a shared AudioContext. Must be triggered from a
 * user gesture the first time, per browser autoplay policy. Returns null when
 * Web Audio is not supported.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

function playSequence(notes: number[], step: number, gainPeak: number): void {
  const audio = getAudioContext();
  if (!audio) return;
  const start = audio.currentTime;
  notes.forEach((freq, i) => {
    const osc = audio.createOscillator();
    osc.type = "square"; // 8-bit timbre
    osc.frequency.value = freq;
    const gain = audio.createGain();
    const at = start + i * step;
    gain.gain.setValueAtTime(gainPeak, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 0.95);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + step);
  });
}

/** Ascending arpeggio (C5-E5-G5) — a focus block finished. */
export function playFocusEndChime(): void {
  playSequence([523.25, 659.25, 783.99], 0.15, 0.3);
}

/** Descending two-note (G5-C5) — a break finished, back to work. */
export function playBreakEndChime(): void {
  playSequence([783.99, 523.25], 0.12, 0.25);
}

/** Bright four-note flourish — the whole session is complete. */
export function playSessionCompleteChime(): void {
  playSequence([523.25, 659.25, 783.99, 1046.5], 0.13, 0.3);
}
