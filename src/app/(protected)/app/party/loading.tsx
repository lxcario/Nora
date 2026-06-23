import { LoadingSkeleton } from "@/components/pixel-ui";

export default function PartyLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-40" />
      <LoadingSkeleton height={12} className="w-56" />

      {/* Party card */}
      <div className="pixel-panel p-4 space-y-3">
        <div className="flex items-center gap-3">
          <LoadingSkeleton height={40} className="w-10" />
          <div className="flex-1 space-y-1">
            <LoadingSkeleton height={16} className="w-48" />
            <LoadingSkeleton height={10} className="w-32" />
          </div>
        </div>
        <LoadingSkeleton height={8} className="w-full" />
      </div>

      {/* Members list */}
      <div className="pixel-panel p-4 space-y-2">
        <LoadingSkeleton height={14} className="w-28 mb-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <LoadingSkeleton height={24} className="w-6" />
            <LoadingSkeleton height={12} className="w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
