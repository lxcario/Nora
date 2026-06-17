"use client";

// ---------------------------------------------------------------------------
// PixelToggle — blocky pixel-art on/off switch (sage green on, grey off)
// ---------------------------------------------------------------------------

export interface PixelToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
}

export function PixelToggle({ checked, onChange, label, id }: PixelToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center"
      style={{
        width: 44,
        height: 24,
        padding: 2,
        backgroundColor: checked ? "var(--pixel-success)" : "var(--pixel-disabled)",
        border: "2px solid var(--pixel-border)",
        imageRendering: "pixelated",
        transition: "background-color 120ms steps(2)",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 16,
          height: 16,
          backgroundColor: "var(--pixel-text-primary)",
          border: "2px solid var(--pixel-border)",
          transition: "left 120ms steps(3)",
        }}
      />
    </button>
  );
}
