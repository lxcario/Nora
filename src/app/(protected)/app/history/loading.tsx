import { LoadingSkeleton } from "@/components/pixel-ui";

export default function HistoryLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-32" />
      <LoadingSkeleton height={12} className="w-60" />

      {/* Filters */}
      <div className="flex gap-3">
        <LoadingSkeleton height={32} className="w-28" />
        <LoadingSkeleton height={32} className="w-28" />
        <LoadingSkeleton height={32} className="w-20" />
      </div>

      {/* History items */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pixel-panel p-3 flex items-center gap-3">
            <LoadingSkeleton height={24} className="w-6 shrink-0" />
            <div className="flex-1 space-y-1">
              <LoadingSkeleton height={14} className="w-3/4" />
              <LoadingSkeleton height={10} className="w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
