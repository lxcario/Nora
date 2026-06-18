import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function CollectionLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Cursors panel */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={12} className="w-16 mb-3" />
        <LoadingSkeleton height={12} className="w-3/4 mb-4" />
        {/* Cursor grid — 4-5 cursor options */}
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="pixel-panel pixel-panel-inset flex flex-col items-center gap-2 p-3">
              <LoadingSkeleton height={32} className="w-8" />
              <LoadingSkeleton height={10} className="w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Themes + Decorations side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Themes panel */}
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <LoadingSkeleton height={12} className="w-16 mb-3" />
          <LoadingSkeleton height={12} className="w-4/5 mb-4" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} height={40} />
            ))}
          </div>
        </div>

        {/* Decorations panel */}
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <LoadingSkeleton height={12} className="w-24 mb-3" />
          <LoadingSkeleton height={12} className="w-4/5 mb-4" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} height={40} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
