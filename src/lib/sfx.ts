"use client";

/**
 * 8-bit sound effects using Web Audio API oscillators.
 * All sounds are generated procedurally — no audio files needed.
 *
 * Mute state is persisted in localStorage.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user interaction first)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// --- Mute state ---

const MUTE_KEY = "pixel-study-os-sfx-muted";
let inMemoryMuted = false; // Fallback when storage is unavailable

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(MUTE_KEY);
    if (stored !== null) {
      inMemoryMuted = stored === "true";
    }
    return inMemoryMuted;
  } catch {
    return inMemoryMuted;
  }
}

export function setMuted(muted: boolean): void {
  inMemoryMuted = muted;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
  } catch {
    // Storage unavailable (sandboxed iframe, quota exceeded, etc.)
  }
}

export function toggleMute(): boolean {
  const newState = !isMuted();
  setMuted(newState);
  return newState;
}

// --- Sound primitives ---

function playNote(
  frequency: number,
  duration: number,
  startTime: number,
  type: OscillatorType = "triangle",
  volume = 0.15
) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// --- Sound suppression for overlapping events ---

let suppressUntil = 0;

/**
 * Temporarily suppress smaller sounds (used when a bigger sound like
 * session-complete is about to play, to avoid stacking XP chirp + save arpeggio
 * on top of the fanfare).
 */
function suppressSmallSounds(durationMs: number) {
  suppressUntil = Date.now() + durationMs;
}

function isSmallSoundSuppressed(): boolean {
  return Date.now() < suppressUntil;
}

// --- Public sound effects ---

/**
 * XP gained — ascending triangle-wave chirp (3 quick notes going up)
 */
export function playXpGained(): void {
  if (isMuted() || isSmallSoundSuppressed()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  playNote(523.25, 0.1, now, "triangle", 0.12); // C5
  playNote(659.25, 0.1, now + 0.08, "triangle", 0.12); // E5
  playNote(783.99, 0.15, now + 0.16, "triangle", 0.14); // G5
}

/**
 * Card saved — short arpeggio (4 notes, major chord feel)
 */
export function playCardSaved(): void {
  if (isMuted() || isSmallSoundSuppressed()) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  playNote(392.0, 0.08, now, "square", 0.08); // G4
  playNote(493.88, 0.08, now + 0.06, "square", 0.08); // B4
  playNote(587.33, 0.08, now + 0.12, "square", 0.08); // D5
  playNote(783.99, 0.12, now + 0.18, "square", 0.1); // G5
}

/**
 * Level up — longer fanfare (ascending scale with sustained final note)
 */
export function playLevelUp(): void {
  if (isMuted()) return;
  suppressSmallSounds(1200); // Suppress chirps during fanfare
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  playNote(261.63, 0.12, now, "triangle", 0.1); // C4
  playNote(329.63, 0.12, now + 0.1, "triangle", 0.1); // E4
  playNote(392.0, 0.12, now + 0.2, "triangle", 0.1); // G4
  playNote(523.25, 0.12, now + 0.3, "triangle", 0.12); // C5
  playNote(659.25, 0.12, now + 0.4, "triangle", 0.12); // E5
  playNote(783.99, 0.3, now + 0.5, "triangle", 0.15); // G5 (sustained)

  // Add a sparkle overtone
  playNote(1046.5, 0.4, now + 0.55, "sine", 0.06); // C6 soft
}

/**
 * Session complete — triumphant short melody
 * Suppresses smaller sounds to avoid stacking.
 */
export function playSessionComplete(): void {
  if (isMuted()) return;
  suppressSmallSounds(1000); // Suppress XP/save chirps during fanfare
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  playNote(523.25, 0.15, now, "triangle", 0.1); // C5
  playNote(587.33, 0.1, now + 0.12, "triangle", 0.1); // D5
  playNote(659.25, 0.15, now + 0.2, "triangle", 0.12); // E5
  playNote(783.99, 0.25, now + 0.35, "triangle", 0.14); // G5
  playNote(1046.5, 0.3, now + 0.55, "triangle", 0.12); // C6
}

// ---------------------------------------------------------------------------
// UI interaction sounds (frequency sweeps) — research-tuned retro recipes
// ---------------------------------------------------------------------------

/**
 * Play a frequency sweep (glide) — used for UI clicks, toggles, navigation.
 */
function playSweep(
  fromFreq: number,
  toFreq: number,
  duration: number,
  startTime: number,
  type: OscillatorType = "triangle",
  volume = 0.1
) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, startTime);
  osc.frequency.linearRampToValueAtTime(toFreq, startTime + duration);

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Standard UI click — short triangle blip (menu-select feel). */
export function playClick(): void {
  if (isMuted()) return;
  playSweep(140, 90, 0.05, getAudioContext().currentTime, "triangle", 0.09);
}

/** Subtle hover tick — very short + quiet (use sparingly). */
export function playHover(): void {
  if (isMuted()) return;
  playNote(440, 0.02, getAudioContext().currentTime, "triangle", 0.035);
}

/** Toggle switch — rising (on) or falling (off) square blip. */
export function playToggle(on: boolean): void {
  if (isMuted()) return;
  const now = getAudioContext().currentTime;
  if (on) playSweep(280, 560, 0.08, now, "square", 0.07);
  else playSweep(380, 180, 0.08, now, "square", 0.07);
}

/** Page navigation — soft rising sweep. */
export function playNavigate(): void {
  if (isMuted()) return;
  playSweep(480, 820, 0.1, getAudioContext().currentTime, "triangle", 0.05);
}

/** Error / rejection — descending sawtooth. */
export function playError(): void {
  if (isMuted()) return;
  playSweep(220, 110, 0.18, getAudioContext().currentTime, "sawtooth", 0.08);
}
