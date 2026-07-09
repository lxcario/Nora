"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isMuted, setMuted } from "@/lib/sfx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CursorPack = "travelbook" | "catpaw";
export type ThemeMode = "dark" | "light";
export type PaletteId = "ember" | "forest" | "ocean" | "lavender" | "rose" | "";

// ---------------------------------------------------------------------------
// Palette definitions
// All values applied via root.style.setProperty() — bypasses CSS cascade entirely
// ---------------------------------------------------------------------------

interface PaletteVars {
  "--pixel-bg-primary": string;
  "--pixel-bg-secondary": string;
  "--pixel-bg-surface": string;
  "--pixel-bg-elevated": string;
  "--pixel-text-primary": string;
  "--pixel-text-secondary": string;
  "--pixel-text-muted": string;
  "--pixel-accent": string;
  "--pixel-accent-hover": string;
  "--pixel-success": string;
  "--pixel-warning": string;
  "--pixel-error": string;
  "--pixel-border": string;
  "--pixel-border-light": string;
  "--pixel-disabled": string;
  "--pixel-sidebar-bg": string;
  "--pixel-room-wall": string;
  "--pixel-room-floor": string;
  "--pixel-room-shelf": string;
  "--grid-bg-base": string;
  "--grid-bg-base-2": string;
  "--grid-line": string;
  "--grid-star": string;
  "--grid-glow": string;
  "--background": string;
  "--foreground": string;
}

const PALETTES: Record<Exclude<PaletteId, "">, PaletteVars> = {
  ember: {
    "--background": "#1a1410",
    "--foreground": "#f0e6d2",
    "--pixel-bg-primary": "#1a1410",
    "--pixel-bg-secondary": "#241c14",
    "--pixel-bg-surface": "#2a2018",
    "--pixel-bg-elevated": "#342a1e",
    "--pixel-text-primary": "#f0e6d2",
    "--pixel-text-secondary": "#c4a882",
    "--pixel-text-muted": "#ab9573",
    "--pixel-accent": "#d4a526",
    "--pixel-accent-hover": "#e6b832",
    "--pixel-success": "#7da856",
    "--pixel-warning": "#e6b832",
    "--pixel-error": "#c45a58",
    "--pixel-border": "#3d2817",
    "--pixel-border-light": "#5a3d2e",
    "--pixel-disabled": "#4a3d30",
    "--pixel-sidebar-bg": "#1e1814",
    "--pixel-room-wall": "#3a2a1c",
    "--pixel-room-floor": "#5a3d24",
    "--pixel-room-shelf": "#5a3d2e",
    "--grid-bg-base": "#160f0a",
    "--grid-bg-base-2": "#1f1610",
    "--grid-line": "rgba(120, 88, 50, 0.12)",
    "--grid-star": "rgba(120, 88, 50, 0.15)",
    "--grid-glow": "rgba(212, 165, 38, 0.14)",
  },
  forest: {
    "--background": "#0d1a12",
    "--foreground": "#d4e8d0",
    "--pixel-bg-primary": "#0d1a12",
    "--pixel-bg-secondary": "#142218",
    "--pixel-bg-surface": "#1a2b1e",
    "--pixel-bg-elevated": "#233824",
    "--pixel-text-primary": "#d4e8d0",
    "--pixel-text-secondary": "#8fb88a",
    "--pixel-text-muted": "#7fa877",
    "--pixel-accent": "#6bc25e",
    "--pixel-accent-hover": "#82d875",
    "--pixel-success": "#7dd87d",
    "--pixel-warning": "#d4b84e",
    "--pixel-error": "#c45a58",
    "--pixel-border": "#2a4a2a",
    "--pixel-border-light": "#3d6a3d",
    "--pixel-disabled": "#2a3d2a",
    "--pixel-sidebar-bg": "#0f1e14",
    "--pixel-room-wall": "#1a3320",
    "--pixel-room-floor": "#2a4a2a",
    "--pixel-room-shelf": "#3d6a3d",
    "--grid-bg-base": "#0d1a12",
    "--grid-bg-base-2": "#142218",
    "--grid-line": "rgba(80, 160, 80, 0.12)",
    "--grid-star": "rgba(80, 160, 80, 0.18)",
    "--grid-glow": "rgba(107, 194, 94, 0.12)",
  },
  ocean: {
    "--background": "#0a1420",
    "--foreground": "#cee4f0",
    "--pixel-bg-primary": "#0a1420",
    "--pixel-bg-secondary": "#101e2e",
    "--pixel-bg-surface": "#162838",
    "--pixel-bg-elevated": "#1e3448",
    "--pixel-text-primary": "#cee4f0",
    "--pixel-text-secondary": "#7ab4d4",
    "--pixel-text-muted": "#68a6c6",
    "--pixel-accent": "#4db8e8",
    "--pixel-accent-hover": "#6dc8f0",
    "--pixel-success": "#5cc8a0",
    "--pixel-warning": "#e6c04e",
    "--pixel-error": "#d45a68",
    "--pixel-border": "#1e3a54",
    "--pixel-border-light": "#2e5a78",
    "--pixel-disabled": "#1e3040",
    "--pixel-sidebar-bg": "#0c1824",
    "--pixel-room-wall": "#1a3050",
    "--pixel-room-floor": "#1e3a5a",
    "--pixel-room-shelf": "#2e4a6a",
    "--grid-bg-base": "#0a1420",
    "--grid-bg-base-2": "#101e2e",
    "--grid-line": "rgba(77, 184, 232, 0.10)",
    "--grid-star": "rgba(77, 184, 232, 0.18)",
    "--grid-glow": "rgba(77, 184, 232, 0.12)",
  },
  lavender: {
    "--background": "#14101e",
    "--foreground": "#e4d8f0",
    "--pixel-bg-primary": "#14101e",
    "--pixel-bg-secondary": "#1e1828",
    "--pixel-bg-surface": "#261e34",
    "--pixel-bg-elevated": "#302840",
    "--pixel-text-primary": "#e4d8f0",
    "--pixel-text-secondary": "#aa8ed4",
    "--pixel-text-muted": "#a88ccc",
    "--pixel-accent": "#a87ee0",
    "--pixel-accent-hover": "#be9af0",
    "--pixel-success": "#7da856",
    "--pixel-warning": "#e0b050",
    "--pixel-error": "#d45a68",
    "--pixel-border": "#3a2850",
    "--pixel-border-light": "#5a4070",
    "--pixel-disabled": "#2e2040",
    "--pixel-sidebar-bg": "#120e1a",
    "--pixel-room-wall": "#2e1e44",
    "--pixel-room-floor": "#3a2850",
    "--pixel-room-shelf": "#4a3868",
    "--grid-bg-base": "#14101e",
    "--grid-bg-base-2": "#1e1828",
    "--grid-line": "rgba(168, 126, 224, 0.10)",
    "--grid-star": "rgba(168, 126, 224, 0.18)",
    "--grid-glow": "rgba(168, 126, 224, 0.12)",
  },
  rose: {
    "--background": "#1a0f14",
    "--foreground": "#f0dce4",
    "--pixel-bg-primary": "#1a0f14",
    "--pixel-bg-secondary": "#24151c",
    "--pixel-bg-surface": "#2e1c24",
    "--pixel-bg-elevated": "#3a242e",
    "--pixel-text-primary": "#f0dce4",
    "--pixel-text-secondary": "#d4909a",
    "--pixel-text-muted": "#c98b98",
    "--pixel-accent": "#e06888",
    "--pixel-accent-hover": "#f07898",
    "--pixel-success": "#7da856",
    "--pixel-warning": "#e6b832",
    "--pixel-error": "#e04858",
    "--pixel-border": "#4a2030",
    "--pixel-border-light": "#6a3848",
    "--pixel-disabled": "#3a1e28",
    "--pixel-sidebar-bg": "#160d12",
    "--pixel-room-wall": "#3a1e2a",
    "--pixel-room-floor": "#4a2838",
    "--pixel-room-shelf": "#5a3848",
    "--grid-bg-base": "#1a0f14",
    "--grid-bg-base-2": "#24151c",
    "--grid-line": "rgba(224, 104, 136, 0.10)",
    "--grid-star": "rgba(224, 104, 136, 0.18)",
    "--grid-glow": "rgba(224, 104, 136, 0.12)",
  },
};

const PALETTE_VARS = Object.keys(PALETTES.ember) as (keyof PaletteVars)[];

/** Full-UI color palettes — changes all backgrounds, borders, text, accents */
export const PALETTE_PRESETS: { id: PaletteId; name: string; preview: string }[] = [
  { id: "ember", name: "Ember", preview: "#d4a526" },
  { id: "forest", name: "Forest", preview: "#6bc25e" },
  { id: "ocean", name: "Ocean", preview: "#4db8e8" },
  { id: "lavender", name: "Lavender", preview: "#a87ee0" },
  { id: "rose", name: "Rose", preview: "#e06888" },
];

/** Preset accent overrides (applied on top of any palette) */
export const ACCENT_PRESETS: { id: string; name: string; color: string }[] = [
  { id: "amber", name: "Amber", color: "" },
  { id: "rose", name: "Rose", color: "#d4708a" },
  { id: "sage", name: "Sage", color: "#7da856" },
  { id: "sky", name: "Sky", color: "#5b9bd5" },
  { id: "lavender", name: "Lavender", color: "#a98bd4" },
  { id: "coral", name: "Coral", color: "#e08a5b" },
];

export interface Preferences {
  cursorPack: CursorPack;
  animations: boolean;
  sound: boolean;
  theme: ThemeMode;
  accent: string;
  palette: PaletteId;
}

interface PreferencesContextValue extends Preferences {
  setCursorPack: (pack: CursorPack) => void;
  setAnimations: (on: boolean) => void;
  setSound: (on: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (hex: string) => void;
  setPalette: (palette: PaletteId) => void;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const CURSOR_KEY = "pixel-cursor-pack";
const ANIM_KEY = "pixel-animations";
const THEME_KEY = "pixel-theme";
const ACCENT_KEY = "pixel-accent-color";
const PALETTE_KEY = "pixel-palette";

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ---------------------------------------------------------------------------
// DOM helpers — apply values directly via style properties (no CSS cascade)
// ---------------------------------------------------------------------------

function lighten(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Apply a full palette by setting CSS custom properties directly on <html>.
 * Inline styles have the highest specificity — nothing in a stylesheet can override them.
 */
function applyPalette(paletteId: PaletteId) {
  const root = document.documentElement;
  if (paletteId && paletteId in PALETTES) {
    const vars = PALETTES[paletteId as Exclude<PaletteId, "">];
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    // Remove data-palette attr — not needed since we're setting inline
    root.removeAttribute("data-palette");
    // Force dark mode so light theme CSS block doesn't interfere
    root.setAttribute("data-theme", "dark");
  } else {
    // Clear all palette-overridden vars so CSS theme classes take over
    for (const key of PALETTE_VARS) {
      root.style.removeProperty(key);
    }
    root.removeAttribute("data-palette");
  }
}

function applyAccent(hex: string) {
  const root = document.documentElement;
  if (hex) {
    root.style.setProperty("--pixel-accent", hex);
    root.style.setProperty("--pixel-accent-hover", lighten(hex, 0.18));
  } else {
    // Only remove accent override if no palette is active (palette set its own accent)
    const hasPalette = !!readPref<PaletteId>(PALETTE_KEY, "");
    if (!hasPalette) {
      root.style.removeProperty("--pixel-accent");
      root.style.removeProperty("--pixel-accent-hover");
    }
  }
}

function readPref<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [cursorPack, setCursorPackState] = useState<CursorPack>("travelbook");
  const [animations, setAnimationsState] = useState(true);
  const [sound, setSoundState] = useState(true);
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState("");
  const [palette, setPaletteState] = useState<PaletteId>("");

  // Hydrate from storage on mount — apply all saved preferences
  useEffect(() => {
    const savedCursor = readPref<CursorPack>(CURSOR_KEY, "catpaw") === "travelbook" ? "travelbook" : "catpaw";
    const savedAnim = readPref<string>(ANIM_KEY, "on") !== "off";
    const savedTheme = readPref<ThemeMode>(THEME_KEY, "dark") === "light" ? "light" : "dark";
    const savedAccent = readPref<string>(ACCENT_KEY, "");
    const savedPalette = readPref<PaletteId>(PALETTE_KEY, "");

    setCursorPackState(savedCursor);
    setAnimationsState(savedAnim);
    setSoundState(!isMuted());
    setThemeState(savedTheme);
    setAccentState(savedAccent);
    setPaletteState(savedPalette);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-cursor", cursorPack);
  }, [cursorPack]);

  useEffect(() => {
    document.documentElement.setAttribute("data-animations", animations ? "on" : "off");
  }, [animations]);

  // Theme: only applies when no palette is active
  useEffect(() => {
    if (!palette) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, palette]);

  // Palette: sets vars directly via inline styles — highest specificity, always wins
  useEffect(() => {
    applyPalette(palette);
    if (!palette) {
      // Restore the selected theme mode
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [palette]); // eslint-disable-line react-hooks/exhaustive-deps

  // Accent override: applied on top of palette
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setCursorPack = useCallback((pack: CursorPack) => {
    setCursorPackState(pack);
    try { localStorage.setItem(CURSOR_KEY, pack); } catch {}
  }, []);

  const setAnimations = useCallback((on: boolean) => {
    setAnimationsState(on);
    try { localStorage.setItem(ANIM_KEY, on ? "on" : "off"); } catch {}
  }, []);

  const setSound = useCallback((on: boolean) => {
    setSoundState(on);
    setMuted(!on);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }, []);

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex);
    try { localStorage.setItem(ACCENT_KEY, hex); } catch {}
  }, []);

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next);
    try { localStorage.setItem(PALETTE_KEY, next); } catch {}
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        cursorPack,
        animations,
        sound,
        theme,
        accent,
        palette,
        setCursorPack,
        setAnimations,
        setSound,
        setTheme,
        setAccent,
        setPalette,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
