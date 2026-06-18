import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function PlannerLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Week navigation bar */}
      <div className="pixel-panel" style={{ padding: "12px 16px" }}>
        <div className="flex items-center justify-between">
          <LoadingSkeleton height={30} className="w-20" />
          <LoadingSkeleton height={14} className="w-40" />
          <LoadingSkeleton height={30} className="w-20" />
        </div>
      </div>

      {/* 7-column calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            {/* Day header */}
            <div className="space-y-1 mb-1">
              <LoadingSkeleton height={10} />
              <LoadingSkeleton height={24} className="w-6 mx-auto" />
            </div>
            {/* Day cell */}
            <div className="pixel-panel" style={{ minHeight: "120px", padding: "6px" }}>
              <div className="space-y-1.5">
                <LoadingSkeleton height={20} />
                <LoadingSkeleton height={20} className="w-5/6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <LoadingSkeleton height={10} className="w-10" />
            <LoadingSkeleton height={10} className="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
