import { PageHeaderSkeleton, PanelSkeleton, StatTileSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function ReviewLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Stats bar */}
      <StatTileSkeleton />

      {/* Card panel */}
      <div className="pixel-panel" style={{ padding: "24px" }}>
        {/* Topic badge row */}
        <div className="pb-4 mb-4" style={{ borderBottom: "2px solid var(--pixel-border)" }}>
          <LoadingSkeleton height={14} className="w-48" />
        </div>

        {/* Question section */}
        <div className="py-4 space-y-2">
          <LoadingSkeleton height={10} className="w-20" />
          <LoadingSkeleton height={22} />
          <LoadingSkeleton height={22} className="w-4/5" />
        </div>

        {/* Reveal button placeholder */}
        <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
          <LoadingSkeleton height={44} />
        </div>
      </div>

      {/* Card meta row */}
      <div className="flex items-center justify-between">
        <LoadingSkeleton height={12} className="w-56" />
        <LoadingSkeleton height={12} className="w-28" />
      </div>
    </div>
  );
}
