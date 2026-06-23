import { LoadingSkeleton } from "@/components/pixel-ui";

export default function StudyRoomLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-40" />
      <LoadingSkeleton height={12} className="w-56" />

      {/* Video player area */}
      <div className="pixel-panel p-2">
        <LoadingSkeleton height={320} className="w-full" />
      </div>

      {/* Notes area */}
      <div className="pixel-panel p-4 space-y-3">
        <LoadingSkeleton height={14} className="w-24" />
        <LoadingSkeleton height={80} className="w-full" />
      </div>
    </div>
  );
}
