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

/** Full-UI color palettes — changes all backgrounds, borders, text, accents */
export const PALETTE_PRESETS: { id: PaletteId; name: string; preview: string }[] = [
  { id: "ember", name: "Ember", preview: "#d4a526" },
  { id: "forest", name: "Forest", preview: "#6bc25e" },
  { id: "ocean", name: "Ocean", preview: "#4db8e8" },
  { id: "lavender", name: "Lavender", preview: "#a87ee0" },
  { id: "rose", name: "Rose", preview: "#e06888" },
];

/** Preset accent palette (empty string = theme default amber) */
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
  /** Accent color hex, or "" for theme default */
  accent: string;
  /** Full palette ID, or "" for default (ember) */
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
// Helpers
// ---------------------------------------------------------------------------

/** Lighten a hex color by mixing toward white (amount 0..1). */
function lighten(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

function applyAccent(hex: string) {
  const root = document.documentElement;
  if (hex) {
    root.style.setProperty("--pixel-accent", hex);
    root.style.setProperty("--pixel-accent-hover", lighten(hex, 0.18));
  } else {
    root.style.removeProperty("--pixel-accent");
    root.style.removeProperty("--pixel-accent-hover");
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

  // Hydrate from storage after mount
  useEffect(() => {
    setCursorPackState(readPref<CursorPack>(CURSOR_KEY, "travelbook") === "catpaw" ? "catpaw" : "travelbook");
    setAnimationsState(readPref<string>(ANIM_KEY, "on") !== "off");
    setSoundState(!isMuted());
    setThemeState(readPref<ThemeMode>(THEME_KEY, "dark") === "light" ? "light" : "dark");
    setAccentState(readPref<string>(ACCENT_KEY, ""));
    setPaletteState(readPref<PaletteId>(PALETTE_KEY, ""));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-cursor", cursorPack);
  }, [cursorPack]);

  useEffect(() => {
    document.documentElement.setAttribute("data-animations", animations ? "on" : "off");
  }, [animations]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (palette) {
      document.documentElement.setAttribute("data-palette", palette);
    } else {
      document.documentElement.removeAttribute("data-palette");
    }
  }, [palette]);

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
