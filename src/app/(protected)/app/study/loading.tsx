import { PageHeaderSkeleton, PanelSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function StudyMixLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Type badge row */}
      <div className="flex items-center gap-2">
        <LoadingSkeleton height={24} className="w-28" />
        <LoadingSkeleton height={14} className="w-40" />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <LoadingSkeleton height={12} className="w-24" />
          <LoadingSkeleton height={12} className="w-20" />
        </div>
        <LoadingSkeleton height={10} />
      </div>

      {/* Card panel */}
      <div className="pixel-panel" style={{ padding: "24px" }}>
        <div className="space-y-3 py-4">
          <LoadingSkeleton height={10} className="w-20" />
          <LoadingSkeleton height={22} />
          <LoadingSkeleton height={22} className="w-3/4" />
        </div>
        <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
          <LoadingSkeleton height={44} />
        </div>
      </div>

      {/* Skip link */}
      <div className="flex justify-end">
        <LoadingSkeleton height={12} className="w-12" />
      </div>
    </div>
  );
}
