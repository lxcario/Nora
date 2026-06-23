import { LoadingSkeleton } from "@/components/pixel-ui";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-32" />
      <LoadingSkeleton height={12} className="w-56" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pixel-panel p-3 space-y-2">
            <LoadingSkeleton height={10} className="w-16" />
            <LoadingSkeleton height={22} className="w-12" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="pixel-panel p-4">
        <LoadingSkeleton height={14} className="w-36 mb-3" />
        <LoadingSkeleton height={180} className="w-full" />
      </div>

      {/* Mastery list */}
      <div className="pixel-panel p-4 space-y-2">
        <LoadingSkeleton height={14} className="w-32 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} height={20} className="w-full" />
        ))}
      </div>
    </div>
  );
}
