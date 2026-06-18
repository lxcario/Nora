import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function RoomLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Room scene viewport — fixed aspect to match real 360px height */}
      <div
        className="pixel-panel overflow-hidden p-0"
        style={{ height: "360px", position: "relative" }}
      >
        {/* Wall shimmer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            top: 0,
            height: "48%",
            background: "var(--pixel-bg-secondary)",
            backgroundImage:
              "linear-gradient(90deg, var(--pixel-bg-secondary) 25%, var(--pixel-bg-surface) 50%, var(--pixel-bg-secondary) 75%)",
            backgroundSize: "200% 100%",
            animation: "pixel-shimmer 2s ease-in-out infinite",
          }}
        />
        {/* Floor shimmer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            top: "48%",
            background: "var(--pixel-bg-elevated)",
            backgroundImage:
              "linear-gradient(90deg, var(--pixel-bg-elevated) 25%, var(--pixel-bg-secondary) 50%, var(--pixel-bg-elevated) 75%)",
            backgroundSize: "200% 100%",
            animation: "pixel-shimmer 2s ease-in-out infinite",
            animationDelay: "0.3s",
          }}
        />
        {/* HUD bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "36px",
            background: "rgba(0,0,0,0.55)",
          }}
        />
        {/* Pet placeholder */}
        <div
          style={{
            position: "absolute",
            bottom: "14%",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <LoadingSkeleton height={72} className="w-16" />
          <LoadingSkeleton height={10} className="w-12" />
        </div>
      </div>

      {/* Pet status bar */}
      <div className="pixel-panel" style={{ padding: "12px" }}>
        <div className="flex items-center gap-3">
          <LoadingSkeleton height={24} className="w-6" />
          <LoadingSkeleton height={14} className="flex-1" />
        </div>
      </div>

      {/* Daily quote */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <div className="flex items-start gap-2">
          <LoadingSkeleton height={16} className="w-4 shrink-0" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton height={14} />
            <LoadingSkeleton height={14} className="w-4/5" />
            <LoadingSkeleton height={10} className="w-24" />
          </div>
        </div>
      </div>

      {/* Missions */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <div className="flex items-center justify-between mb-3">
          <LoadingSkeleton height={14} className="w-36" />
          <LoadingSkeleton height={12} className="w-8" />
        </div>
        <LoadingSkeleton height={8} className="mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <LoadingSkeleton height={16} className="w-4 shrink-0" />
              <LoadingSkeleton height={14} className="flex-1" />
              <LoadingSkeleton height={16} className="w-4 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
