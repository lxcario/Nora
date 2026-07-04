import type { CSSProperties } from "react";

export interface PixelSpinnerProps {
  /** Size of each square dot in px. Default 4. */
  size?: number;
  /** Extra classes — e.g. "text-[var(--pixel-accent)]" to set the dot color (dots use currentColor). */
  className?: string;
  /** Accessible label announced to screen readers. Default "Loading". */
  label?: string;
}

/**
 * The single loading indicator for the whole app.
 *
 * Three square pixels that blink in sequence — a retro "thinking…" cadence
 * using steps() so they snap between states instead of smoothly fading. This
 * replaces the lucide <Loader2 /> smooth 360° spinner, which read as generic
 * Material/React and broke the pixel aesthetic (see COMPONENT_CONSISTENCY P1-3).
 *
 * Dots inherit `currentColor`, so color it from the parent
 * (e.g. className="text-[var(--pixel-accent)]"). Motion is disabled
 * automatically for prefers-reduced-motion and the [data-animations="off"]
 * setting (globals.css zeroes all animations).
 */
export function PixelSpinner({ size = 4, className, label = "Loading" }: PixelSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-center gap-1${className ? ` ${className}` : ""}`}
    >
      {[0, 1, 2].map((i) => {
        const dotStyle: CSSProperties = {
          width: size,
          height: size,
          backgroundColor: "currentColor",
          imageRendering: "pixelated",
          animation: "pixel-dot-blink 0.9s steps(3) infinite",
          animationDelay: `${i * 0.15}s`,
        };
        return <span key={i} aria-hidden="true" style={dotStyle} />;
      })}
    </span>
  );
}
