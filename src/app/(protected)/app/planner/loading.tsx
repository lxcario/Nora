import { LoadingSkeleton } from "@/components/pixel-ui";

export default function PlannerLoading() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-32" />
      <LoadingSkeleton height={12} className="w-52" />

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <LoadingSkeleton height={32} className="w-8" />
        <LoadingSkeleton height={16} className="w-48" />
        <LoadingSkeleton height={32} className="w-8" />
      </div>

      {/* Calendar grid */}
      <div className="pixel-panel p-3">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <LoadingSkeleton height={12} className="w-full" />
              <LoadingSkeleton height={80} className="w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
