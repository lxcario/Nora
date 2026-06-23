// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingSkeletonProps {
  /** Number of text lines to simulate (default: 3) */
  lines?: number;
  /** Fixed height in px — renders a single block instead of lines */
  height?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Line width pattern — varies width to look natural
// ---------------------------------------------------------------------------

const LINE_WIDTHS = ["100%", "80%", "60%"] as const;

function getLineWidth(index: number): string {
  return LINE_WIDTHS[index % LINE_WIDTHS.length];
}

// ---------------------------------------------------------------------------
// Shared shimmer styles
// ---------------------------------------------------------------------------

const shimmerStyle: React.CSSProperties = {
  backgroundColor: "var(--pixel-bg-secondary)",
  backgroundImage:
    "linear-gradient(90deg, var(--pixel-bg-secondary) 25%, color-mix(in srgb, var(--pixel-bg-surface) 80%, var(--pixel-accent)) 50%, var(--pixel-bg-secondary) 75%)",
  backgroundSize: "200% 100%",
  animation: "pixel-shimmer 2s linear infinite",
};

// ---------------------------------------------------------------------------
// LoadingSkeleton Component
// ---------------------------------------------------------------------------

/**
 * Renders placeholder rectangles/lines with a pixel shimmer animation.
 * Uses the Color_Palette surface/muted tones to match the pixel theme.
 * Server Component — no interactivity needed.
 *
 * Usage:
 * ```tsx
 * <LoadingSkeleton />                    // 3 text lines (default)
 * <LoadingSkeleton lines={5} />          // 5 text lines
 * <LoadingSkeleton height={120} />       // single block, 120px tall
 * ```
 */
export function LoadingSkeleton({
  lines = 3,
  height,
  className,
}: LoadingSkeletonProps) {
  // If height prop is provided, render a single block skeleton
  if (height !== undefined) {
    return (
      <div
        className={`rounded-sm ${className ?? ""}`.trim()}
        style={{ ...shimmerStyle, height: `${height}px`, width: "100%" }}
        aria-hidden="true"
        role="presentation"
      />
    );
  }

  // Render multiple lines with varying widths
  return (
    <div
      className={`flex flex-col gap-[8px] ${className ?? ""}`.trim()}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            ...shimmerStyle,
            height: "12px",
            width: getLineWidth(i),
          }}
        />
      ))}
    </div>
  );
}
