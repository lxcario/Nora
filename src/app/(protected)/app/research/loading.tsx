import { LoadingSkeleton } from "@/components/pixel-ui";

export default function ResearchLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Page header */}
      <LoadingSkeleton height={20} className="w-44" />
      <LoadingSkeleton height={12} className="w-64" />

      {/* Search input */}
      <div className="pixel-panel p-4">
        <LoadingSkeleton height={40} className="w-full" />
      </div>

      {/* Results area */}
      <div className="pixel-panel p-4 space-y-3">
        <LoadingSkeleton height={14} className="w-36 mb-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pixel-panel pixel-panel-inset p-3 space-y-2">
            <LoadingSkeleton height={14} className="w-3/4" />
            <LoadingSkeleton height={10} className="w-full" />
            <LoadingSkeleton height={10} className="w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
