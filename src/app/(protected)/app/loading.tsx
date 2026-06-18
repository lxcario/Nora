import { LoadingSkeleton } from "@/components/pixel-ui";

export default function AppLoading() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Section 1 — Daily Briefing subtitle line */}
      <LoadingSkeleton height={16} className="w-80 px-1" />

      {/* Section 2 — Primary CTA panel */}
      <div
        className="pixel-panel flex items-center justify-between gap-4 p-5"
        style={{ backgroundColor: "color-mix(in srgb, var(--pixel-accent) 10%, var(--pixel-bg-surface))" }}
      >
        <div className="flex items-center gap-4 flex-1">
          <LoadingSkeleton height={40} className="w-10 shrink-0" />
          <LoadingSkeleton height={18} className="w-56" />
        </div>
        <LoadingSkeleton height={24} className="w-6 shrink-0" />
      </div>

      {/* Section 3 — 4-stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pixel-panel flex items-center gap-3 p-3">
            <LoadingSkeleton
              height={i < 2 ? 36 : 28}
              className={`${i < 2 ? "w-9" : "w-7"} shrink-0`}
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <LoadingSkeleton height={i < 2 ? 22 : 18} className="w-16" />
              <LoadingSkeleton height={10} className="w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Section 4 — Today's Quests panel */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        {/* Panel title */}
        <LoadingSkeleton height={12} className="w-32 mb-4" />
        <div className="flex flex-col md:flex-row md:items-stretch gap-4">
          {/* 3 quest items */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="pixel-panel pixel-panel-inset p-2"
              >
                {/* Icon + label */}
                <div className="flex items-center gap-2 mb-2">
                  <LoadingSkeleton height={16} className="w-4 shrink-0" />
                  <LoadingSkeleton height={12} className="flex-1" />
                </div>
                {/* Progress bar */}
                <LoadingSkeleton height={8} />
                {/* Progress count */}
                <LoadingSkeleton height={10} className="w-10 ml-auto mt-1" />
              </div>
            ))}
          </div>
          {/* Reward column */}
          <div className="flex flex-row md:flex-col items-center justify-center gap-3 shrink-0 md:pl-4">
            <LoadingSkeleton height={10} className="w-16" />
            <LoadingSkeleton height={14} className="w-16" />
            <LoadingSkeleton height={14} className="w-14" />
          </div>
        </div>
      </div>

      {/* Section 5 — Study Circle */}
      <div>
        {/* Section label */}
        <LoadingSkeleton height={12} className="w-40 mb-2 px-1" />
        <div className="pixel-panel p-0 overflow-hidden">
          {/* 4 activity rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                borderBottom: i < 3 ? "1px solid var(--pixel-border)" : "none",
                backgroundColor: "var(--pixel-bg-surface)",
              }}
            >
              <LoadingSkeleton height={16} className="w-4 shrink-0" />
              <LoadingSkeleton height={14} className={i % 2 === 0 ? "flex-1" : "w-4/5"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
