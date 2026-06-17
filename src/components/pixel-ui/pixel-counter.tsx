"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelCounterProps {
  /** Target value to count up to */
  value: number;
  /** Starting value (default 0) */
  from?: number;
  /** Animation duration in ms (default 600) */
  durationMs?: number;
  /** Optional prefix/suffix (e.g. "+", " XP") */
  prefix?: string;
  suffix?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers — respect the global animation switch without a provider dependency
// ---------------------------------------------------------------------------

function animationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.getAttribute("data-animations") === "off") {
    return false;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------------------
// PixelCounter — RPG-style stepped number tick-up
// ---------------------------------------------------------------------------

/**
 * Counts up from `from` to `value` in discrete integer steps (like RPG damage
 * numbers). Honors the animation kill switch + prefers-reduced-motion by
 * snapping straight to the final value.
 */
export function PixelCounter({
  value,
  from = 0,
  durationMs = 600,
  prefix = "",
  suffix = "",
  className,
}: PixelCounterProps) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animationsEnabled()) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const delta = value - from;
    setDisplay(from);

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Quantize to integer steps for the discrete pixel feel
      const current = Math.round(from + delta * t);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, from, durationMs]);

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
