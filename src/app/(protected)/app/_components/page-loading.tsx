import { LoadingSkeleton } from "@/components/pixel-ui";

/**
 * Unified page loading skeleton used by all feature pages.
 * Matches the common layout: PageHeader → content panel → secondary content.
 * Prevents the white flash on navigation.
 */
export function PageLoading() {
  return (
    <div className="space-y-5">
      {/* ─── Page Header (title + description) ─── */}
      <div className="space-y-2">
        <LoadingSkeleton height={22} className="w-48" />
        <LoadingSkeleton height={12} className="w-80 max-w-full" />
      </div>

      {/* ─── Primary content panel ─── */}
      <div className="pixel-panel p-5 space-y-4">
        {/* Toolbar / controls row */}
        <div className="flex items-center gap-3">
          <LoadingSkeleton height={32} className="w-40" />
          <LoadingSkeleton height={32} className="w-28" />
        </div>

        {/* Main content area */}
        <LoadingSkeleton height={140} />

        {/* Action row */}
        <div className="flex items-center gap-3">
          <LoadingSkeleton height={36} className="w-36" />
          <LoadingSkeleton height={36} className="w-24" />
        </div>
      </div>

      {/* ─── Secondary panel ─── */}
      <div className="pixel-panel p-4 space-y-3">
        <LoadingSkeleton height={12} className="w-32" />
        <LoadingSkeleton height={10} className="w-full" />
        <LoadingSkeleton height={10} className="w-3/4" />
      </div>
    </div>
  );
}
