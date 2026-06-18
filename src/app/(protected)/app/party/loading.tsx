import { PageHeaderSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function PartyLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Party header + badges */}
      <div className="flex items-center gap-3">
        <LoadingSkeleton height={26} className="w-40" />
        <LoadingSkeleton height={22} className="w-14" />
        <LoadingSkeleton height={22} className="w-16" />
      </div>

      {/* Members section */}
      <section className="space-y-2">
        <LoadingSkeleton height={14} className="w-20 mb-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pixel-panel pixel-panel-inset flex items-center gap-3 p-3">
            <LoadingSkeleton height={32} className="w-8 shrink-0 rounded-full" />
            <LoadingSkeleton height={14} className="flex-1" />
            <LoadingSkeleton height={20} className="w-16 shrink-0" />
          </div>
        ))}
      </section>

      {/* Quests section */}
      <section className="space-y-2">
        <LoadingSkeleton height={14} className="w-16 mb-2" />
        <div className="pixel-panel" style={{ padding: "16px" }}>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <LoadingSkeleton height={12} className="w-40" />
                  <LoadingSkeleton height={12} className="w-16" />
                </div>
                <LoadingSkeleton height={8} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Messages section */}
      <section>
        <LoadingSkeleton height={14} className="w-20 mb-2" />
        <div className="pixel-panel" style={{ padding: "12px" }}>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <LoadingSkeleton height={28} className="w-7 shrink-0" />
                <div className="flex-1 space-y-1">
                  <LoadingSkeleton height={10} className="w-20" />
                  <LoadingSkeleton height={14} className={i % 2 === 0 ? "w-full" : "w-3/4"} />
                </div>
              </div>
            ))}
          </div>
          {/* Message input */}
          <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "2px solid var(--pixel-border)" }}>
            <LoadingSkeleton height={36} className="flex-1" />
            <LoadingSkeleton height={36} className="w-20" />
          </div>
        </div>
      </section>
    </div>
  );
}
