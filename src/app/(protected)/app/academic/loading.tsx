import { LoadingSkeleton } from "@/components/pixel-ui";

export default function AcademicLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* University header */}
      <div className="space-y-2">
        <LoadingSkeleton height={22} className="w-64" />
        <LoadingSkeleton height={14} className="w-48" />
        <LoadingSkeleton height={12} className="w-32" />
      </div>

      {/* Discovery progress bar */}
      <div className="pixel-panel" style={{ padding: "12px" }}>
        <div className="flex items-center justify-between mb-2">
          <LoadingSkeleton height={12} className="w-48" />
          <LoadingSkeleton height={12} className="w-10" />
        </div>
        <LoadingSkeleton height={8} />
      </div>

      {/* Review panel — events list */}
      <div className="pixel-panel" style={{ padding: "20px" }}>
        <LoadingSkeleton height={14} className="w-48 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pixel-panel pixel-panel-inset" style={{ padding: "10px" }}>
              <div className="flex justify-between">
                <LoadingSkeleton height={14} className="w-40" />
                <LoadingSkeleton height={14} className="w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <LoadingSkeleton height={36} className="w-36" />
        </div>
      </div>

      {/* Documents panel */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={14} className="w-48 mb-3" />
        <LoadingSkeleton height={38} className="mb-3" />
        <LoadingSkeleton height={30} className="w-40" />
      </div>
    </div>
  );
}
