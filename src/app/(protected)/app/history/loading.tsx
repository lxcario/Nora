import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Filters row — type chips + select + day chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Type chips */}
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} height={30} className="w-20" />
          ))}
        </div>
        {/* Topic select */}
        <LoadingSkeleton height={30} className="w-32" />
        {/* Day chips */}
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} height={30} className="w-14" />
          ))}
        </div>
      </div>

      {/* Date group 1 */}
      <section>
        <LoadingSkeleton height={12} className="w-32 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="pixel-panel" style={{ padding: "16px" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  {/* Badge + topic + time row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <LoadingSkeleton height={20} className="w-20" />
                    <LoadingSkeleton height={12} className="w-28" />
                    <LoadingSkeleton height={12} className="w-16" />
                  </div>
                  {/* Preview text */}
                  <LoadingSkeleton height={14} className={i === 0 ? "w-full" : "w-5/6"} />
                </div>
                {/* Expand toggle */}
                <LoadingSkeleton height={20} className="w-6 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Date group 2 */}
      <section>
        <LoadingSkeleton height={12} className="w-28 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="pixel-panel" style={{ padding: "16px" }}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <LoadingSkeleton height={20} className="w-20" />
                  <LoadingSkeleton height={12} className="w-24" />
                </div>
                <LoadingSkeleton height={14} className="w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
