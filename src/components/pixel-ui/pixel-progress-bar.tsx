// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelProgressBarProps {
  /** Current progress value */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Optional label rendered above the bar in pixel font */
  label?: string;
  /** Color variant: xp = amber/gold, hp = sage green, mp = sky blue */
  variant?: "xp" | "hp" | "mp";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed number of segments for a clean pixel aesthetic */
const TOTAL_SEGMENTS = 10;

/** Variant color mapping using CSS custom properties */
const VARIANT_COLORS: Record<"xp" | "hp" | "mp", string> = {
  xp: "var(--pixel-accent)",     // amber/gold
  hp: "var(--pixel-success)",    // sage green
  mp: "#5b9bd5",                 // sky blue
};

// ---------------------------------------------------------------------------
// PixelProgressBar Component (Server Component)
// ---------------------------------------------------------------------------

/**
 * HP/MP-style segmented progress bar with pixel-art styling.
 * Renders a fixed 10-segment bar with 1px gaps between segments.
 * Filled segments are proportional to value/max.
 *
 * Usage:
 * ```tsx
 * <PixelProgressBar value={75} max={100} variant="hp" label="HP" />
 * ```
 */
export function PixelProgressBar({
  value,
  max = 100,
  label,
  variant = "xp",
}: PixelProgressBarProps) {
  // Clamp value between 0 and max
  const clampedValue = Math.max(0, Math.min(value, max));
  // Calculate filled segments proportional to value/max
  const filledSegments = Math.round((clampedValue / max) * TOTAL_SEGMENTS);
  const fillColor = VARIANT_COLORS[variant];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {/* Optional label */}
      {label && (
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "11px",
            letterSpacing: "1px",
            color: "var(--pixel-text-primary)",
          }}
        >
          {label}
        </span>
      )}

      {/* Progress bar container */}
      <div
        style={{
          display: "flex",
          gap: "1px",
          padding: "3px",
          border: "2px solid var(--pixel-border)",
          borderRadius: "2px",
          backgroundColor: "var(--pixel-bg-secondary)",
          imageRendering: "pixelated",
        }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? `Progress: ${clampedValue}/${max}`}
      >
        {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "8px",
              backgroundColor:
                i < filledSegments ? fillColor : "var(--pixel-bg-surface)",
              borderRadius: "1px",
            }}
          />
        ))}
      </div>
    </div>
  );
}
