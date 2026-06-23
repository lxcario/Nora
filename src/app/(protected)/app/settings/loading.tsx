import { LoadingSkeleton } from "@/components/pixel-ui";

export default function SettingsLoading() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-32" />
      <LoadingSkeleton height={12} className="w-48" />

      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} height={32} className="w-24" />
        ))}
      </div>

      {/* Form fields */}
      <div className="pixel-panel p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <LoadingSkeleton height={10} className="w-24" />
            <LoadingSkeleton height={36} className="w-full" />
          </div>
        ))}
        <LoadingSkeleton height={40} className="w-32" />
      </div>
    </div>
  );
}
