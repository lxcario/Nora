import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Tab bar */}
      <div
        className="flex flex-wrap gap-1 p-1.5 rounded-lg"
        style={{
          backgroundColor: "var(--pixel-bg-surface)",
          border: "2px solid var(--pixel-border)",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} height={30} className="w-24" />
        ))}
      </div>

      {/* Active tab content — Profile tab skeleton */}
      <div className="space-y-6">
        {/* Profile photo panel */}
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <LoadingSkeleton height={12} className="w-28 mb-4" />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
            {/* Avatar circle */}
            <LoadingSkeleton height={96} className="w-24 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton height={14} />
              <LoadingSkeleton height={12} className="w-3/4" />
            </div>
          </div>
        </div>

        {/* Display name & preferences panel */}
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <LoadingSkeleton height={12} className="w-48 mb-4" />
          <div className="space-y-4">
            {/* Name field */}
            <div className="space-y-1.5">
              <LoadingSkeleton height={10} className="w-24" />
              <LoadingSkeleton height={38} />
            </div>
            {/* Timezone field */}
            <div className="space-y-1.5">
              <LoadingSkeleton height={10} className="w-20" />
              <LoadingSkeleton height={38} />
            </div>
            {/* ADHD toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <LoadingSkeleton height={12} className="w-24" />
                <LoadingSkeleton height={10} className="w-48" />
              </div>
              <LoadingSkeleton height={24} className="w-11 shrink-0" />
            </div>
            {/* Save button */}
            <LoadingSkeleton height={38} className="w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
