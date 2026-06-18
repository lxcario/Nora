import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* 5-stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pixel-panel flex items-center gap-3 p-4">
            <LoadingSkeleton height={20} className="w-5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <LoadingSkeleton height={10} className="w-20" />
              <LoadingSkeleton height={22} className="w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <LoadingSkeleton height={14} className="w-48 mb-3" />
          {/* Bar chart shape — 30 bars */}
          <div className="flex h-32 items-end gap-[2px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: `${20 + Math.sin(i * 0.7) * 40 + 40}%`,
                  background: "var(--pixel-bg-secondary)",
                  backgroundImage:
                    "linear-gradient(90deg, var(--pixel-bg-secondary) 25%, var(--pixel-bg-surface) 50%, var(--pixel-bg-secondary) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "pixel-shimmer 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <LoadingSkeleton height={14} className="w-48 mb-3" />
          <div className="flex h-32 items-end gap-[2px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: `${15 + Math.cos(i * 0.5) * 30 + 35}%`,
                  background: "var(--pixel-bg-secondary)",
                  backgroundImage:
                    "linear-gradient(90deg, var(--pixel-bg-secondary) 25%, var(--pixel-bg-surface) 50%, var(--pixel-bg-secondary) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "pixel-shimmer 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.04}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Consistency heatmap */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={14} className="w-44 mb-3" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <LoadingSkeleton key={i} height={16} className="w-4" />
          ))}
        </div>
      </div>

      {/* Topic mastery bars */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={14} className="w-36 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <LoadingSkeleton height={14} className="w-28 shrink-0" />
              <LoadingSkeleton height={12} className="flex-1" />
              <LoadingSkeleton height={12} className="w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
