import { DialogFrame } from "./dialog-frame";
import { IconSprite } from "./icon-sprite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelStatCardProps {
  /** The stat label (e.g. "Level", "Cards Due") */
  label: string;
  /** The stat value (e.g. "12", "47 XP") */
  value: string;
  /** Optional sprite icon name to display next to the value */
  icon?: string;
}

// ---------------------------------------------------------------------------
// PixelStatCard Component (Server Component)
// ---------------------------------------------------------------------------

/**
 * A compact stat card for analytics dashboards. Renders a value in the
 * SproutLands pixel font with an optional icon, and a label in Geist
 * sans-serif beneath. Suitable for a 4-column grid layout.
 *
 * Usage:
 * ```tsx
 * <PixelStatCard label="Level" value="12" icon="star" />
 * ```
 */
export function PixelStatCard({ label, value, icon }: PixelStatCardProps) {
  return (
    <DialogFrame variant="standard" className="h-full">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Value row with optional icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {icon && <IconSprite name={icon} size={2} aria-hidden={true} />}
          <span
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "24px",
              letterSpacing: "1px",
              color: "var(--pixel-text-primary)",
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        </div>

        {/* Label in sans-serif */}
        <span
          style={{
            fontFamily: "var(--font-geist-sans, sans-serif)",
            fontSize: "12px",
            color: "var(--pixel-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
      </div>
    </DialogFrame>
  );
}
