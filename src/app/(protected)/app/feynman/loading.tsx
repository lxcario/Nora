import { LoadingSkeleton } from "@/components/pixel-ui";

export default function FeynmanLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-48" />
      <LoadingSkeleton height={12} className="w-72" />

      {/* Topic selector */}
      <div className="pixel-panel p-4">
        <LoadingSkeleton height={14} className="w-24 mb-3" />
        <LoadingSkeleton height={36} className="w-full" />
      </div>

      {/* Editor area */}
      <div className="pixel-panel p-4">
        <LoadingSkeleton height={14} className="w-32 mb-3" />
        <LoadingSkeleton height={200} className="w-full" />
      </div>

      {/* Action button */}
      <LoadingSkeleton height={40} className="w-48" />
    </div>
  );
}
