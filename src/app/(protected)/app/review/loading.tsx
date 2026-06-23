import { LoadingSkeleton } from "@/components/pixel-ui";

export default function ReviewLoading() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-40" />
      <LoadingSkeleton height={12} className="w-80" />

      {/* Card area */}
      <div className="pixel-panel p-6">
        <LoadingSkeleton height={14} className="w-32 mb-4" />
        <LoadingSkeleton height={160} className="w-full mb-4" />
        <LoadingSkeleton height={12} className="w-64" />
      </div>

      {/* Grade buttons */}
      <div className="flex gap-3 justify-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} height={40} className="w-24" />
        ))}
      </div>
    </div>
  );
}
