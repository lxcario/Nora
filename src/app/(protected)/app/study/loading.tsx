import { LoadingSkeleton } from "@/components/pixel-ui";

export default function StudyLoading() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-36" />
      <LoadingSkeleton height={12} className="w-60" />

      {/* Study mix card */}
      <div className="pixel-panel p-6 space-y-4">
        <LoadingSkeleton height={16} className="w-48" />
        <LoadingSkeleton height={120} className="w-full" />
        <div className="flex gap-3">
          <LoadingSkeleton height={36} className="w-32" />
          <LoadingSkeleton height={36} className="w-32" />
        </div>
      </div>

      {/* Progress */}
      <div className="pixel-panel p-4">
        <LoadingSkeleton height={12} className="w-28 mb-2" />
        <LoadingSkeleton height={8} className="w-full" />
      </div>
    </div>
  );
}
