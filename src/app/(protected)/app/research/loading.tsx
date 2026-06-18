import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function ResearchLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Mode toggle */}
      <div className="flex gap-2">
        <LoadingSkeleton height={34} className="w-28" />
        <LoadingSkeleton height={34} className="w-28" />
      </div>

      {/* Research input panel */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={12} className="w-36 mb-3" />
        {/* Search row */}
        <div className="flex gap-2">
          <LoadingSkeleton height={38} className="flex-1" />
          <LoadingSkeleton height={38} className="w-28" />
        </div>
        {/* Topic selector */}
        <div className="flex items-center gap-2 mt-3">
          <LoadingSkeleton height={12} className="w-20" />
          <LoadingSkeleton height={30} className="w-40" />
        </div>
        {/* Disclaimer */}
        <LoadingSkeleton height={12} className="w-3/4 mt-3" />
      </div>
    </div>
  );
}
