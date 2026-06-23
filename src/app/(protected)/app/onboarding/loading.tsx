import { LoadingSkeleton } from "@/components/pixel-ui";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pixel-grid-bg bg-[var(--pixel-bg-primary)]">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center space-y-2">
          <LoadingSkeleton height={22} className="w-64 mx-auto" />
          <LoadingSkeleton height={12} className="w-80 mx-auto" />
        </div>

        {/* Step dots placeholder */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} height={8} className="w-8" />
          ))}
        </div>

        {/* Form panel placeholder */}
        <div
          className="pixel-panel"
          style={{ padding: "var(--pixel-panel-standard, 12px)" }}
        >
          <LoadingSkeleton height={14} className="w-32 mb-4" />
          <LoadingSkeleton height={36} className="w-full mb-3" />
          <LoadingSkeleton height={36} className="w-full mb-3" />
          <LoadingSkeleton height={12} className="w-48" />
        </div>
      </div>
    </div>
  );
}
