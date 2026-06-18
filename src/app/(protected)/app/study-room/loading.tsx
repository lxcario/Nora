import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function StudyRoomLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Empty state — matches the "Start Studying" centered layout */}
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        {/* Center icon + heading + description */}
        <div className="flex flex-col items-center text-center gap-3">
          <LoadingSkeleton height={48} className="w-12" />
          <LoadingSkeleton height={20} className="w-40" />
          <LoadingSkeleton height={14} className="w-72" />
        </div>

        {/* Search panel */}
        <div className="pixel-panel" style={{ padding: "24px" }}>
          {/* Search input */}
          <LoadingSkeleton height={40} className="w-full" />

          {/* "or" divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--pixel-border)" }} />
            <LoadingSkeleton height={12} className="w-6" />
            <div className="h-px flex-1" style={{ background: "var(--pixel-border)" }} />
          </div>

          {/* URL input + Load button */}
          <div className="flex gap-2">
            <LoadingSkeleton height={40} className="flex-1" />
            <LoadingSkeleton height={40} className="w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
