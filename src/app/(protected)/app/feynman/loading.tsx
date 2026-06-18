import { PageHeaderSkeleton, PanelSkeleton } from "@/components/pixel-ui/skeleton-helpers";
import { LoadingSkeleton } from "@/components/pixel-ui";

export default function FeynmanLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeaderSkeleton />

      {/* Topic selector panel */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={12} className="w-24 mb-3" />
        <LoadingSkeleton height={38} />
      </div>

      {/* Explanation editor panel */}
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <LoadingSkeleton height={12} className="w-36 mb-3" />
        {/* Textarea area */}
        <LoadingSkeleton height={180} />
        {/* Status bar */}
        <div className="flex items-center justify-between mt-3">
          <LoadingSkeleton height={12} className="w-32" />
          <LoadingSkeleton height={36} className="w-40" />
        </div>
      </div>
    </div>
  );
}
