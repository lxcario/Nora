"use client";

import { usePreferences, ACCENT_PRESETS } from "./preferences-provider";
import { PixelToggle } from "./pixel-toggle";
import { playToggle, playClick } from "@/lib/sfx";

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-pixel text-sm text-[var(--pixel-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--pixel-text-secondary)]">{description}</p>
      </div>
      <PixelToggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PreferencesPanel — theme, accent, animation + sound master switches
// ---------------------------------------------------------------------------

export function PreferencesPanel() {
  const {
    animations,
    setAnimations,
    sound,
    setSound,
    theme,
    setTheme,
    accent,
    setAccent,
  } = usePreferences();

  return (
    <div className="divide-y divide-[var(--pixel-border)]">
      {/* Theme mode */}
      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="font-pixel text-sm text-[var(--pixel-text-primary)]">
            Theme
          </p>
          <p className="text-xs text-[var(--pixel-text-secondary)]">
            Switch between cozy dark and warm light parchment.
          </p>
        </div>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setTheme(mode);
                playClick();
              }}
              className={`pixel-btn ${theme === mode ? "pixel-btn-primary" : "pixel-btn-secondary"} pixel-btn-sm`}
            >
              {mode === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div className="py-3">
        <p className="font-pixel text-sm text-[var(--pixel-text-primary)]">
          Accent Color
        </p>
        <p className="mb-2 text-xs text-[var(--pixel-text-secondary)]">
          Recolor buttons, highlights, and progress across the whole UI.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const active = accent === preset.color;
            const swatch = preset.color || "var(--pixel-accent)";
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                onClick={() => {
                  setAccent(preset.color);
                  playToggle(true);
                }}
                className="pixel-panel"
                style={{
                  width: 36,
                  height: 36,
                  padding: 0,
                  backgroundColor: swatch,
                  outline: active ? "2px solid var(--pixel-text-primary)" : "none",
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Animations */}
      <ToggleRow
        label="Animations"
        description="Stepped pixel animations across the app. Turn off for a still UI."
        checked={animations}
        onChange={(v) => {
          setAnimations(v);
          if (v) playToggle(true);
          else playToggle(false);
        }}
      />

      {/* Sound */}
      <ToggleRow
        label="Sound Effects"
        description="8-bit blips for clicks, navigation, XP, and level-ups."
        checked={sound}
        onChange={(v) => {
          if (v) {
            setSound(true);
            playToggle(true);
          } else {
            playToggle(false);
            setSound(false);
          }
        }}
      />
    </div>
  );
}
