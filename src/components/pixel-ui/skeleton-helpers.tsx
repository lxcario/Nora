/**
 * Skeleton helper components for page-level loading states.
 * These are thin wrappers around LoadingSkeleton that match
 * specific recurring shapes in the app layout.
 */

import { LoadingSkeleton } from "./loading-skeleton";

// ---------------------------------------------------------------------------
// PageHeaderSkeleton
// Matches PageHeader — a wide title block + narrower description line
// ---------------------------------------------------------------------------
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2 w-full max-w-sm">
        <LoadingSkeleton height={28} />
        <LoadingSkeleton height={16} className="max-w-xs" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelSkeleton
// Matches a DialogFrame / pixel-panel with some lines of content
// ---------------------------------------------------------------------------
export function PanelSkeleton({ lines = 3, height }: { lines?: number; height?: number }) {
  return (
    <div
      className="pixel-panel"
      style={{ padding: "16px" }}
    >
      {height ? (
        <LoadingSkeleton height={height} />
      ) : (
        <LoadingSkeleton lines={lines} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatTileSkeleton
// Matches a pixel-panel stat tile (icon + value + label)
// ---------------------------------------------------------------------------
export function StatTileSkeleton() {
  return (
    <div className="pixel-panel flex items-center gap-3 p-3">
      <LoadingSkeleton height={36} className="w-9 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <LoadingSkeleton height={22} className="w-16" />
        <LoadingSkeleton height={12} className="w-24" />
      </div>
    </div>
  );
}
