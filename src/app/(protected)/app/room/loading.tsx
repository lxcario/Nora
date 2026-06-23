import { LoadingSkeleton } from "@/components/pixel-ui";

export default function RoomLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-36" />
      <LoadingSkeleton height={12} className="w-48" />

      {/* Room scene */}
      <div className="pixel-panel p-2">
        <LoadingSkeleton height={280} className="w-full" />
      </div>

      {/* Pet/furniture controls */}
      <div className="grid grid-cols-2 gap-3">
        <div className="pixel-panel p-3 space-y-2">
          <LoadingSkeleton height={14} className="w-20" />
          <LoadingSkeleton height={48} className="w-full" />
        </div>
        <div className="pixel-panel p-3 space-y-2">
          <LoadingSkeleton height={14} className="w-24" />
          <LoadingSkeleton height={48} className="w-full" />
        </div>
      </div>
    </div>
  );
}
