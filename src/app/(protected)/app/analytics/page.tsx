import { PageHeader } from "../_components/page-header";
import { getAnalytics } from "../_actions/analytics";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";
import { DialogFrame } from "@/components/pixel-ui";
import { BarChart3 } from "lucide-react";

export default async function AnalyticsPage() {
  const { data, error } = await getAnalytics();

  // Count distinct days with activity
  const activeDays = data
    ? new Set([
        ...data.dailySessions.map((d) => d.date),
        ...data.dailyReviews.map((d) => d.date),
      ]).size
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track your progress, mastery per topic, and consistency."
      />

      {error && (
        <DialogFrame state="error">
          <p className="text-sm text-[var(--pixel-error)]">{error}</p>
        </DialogFrame>
      )}

      {data && activeDays < 3 ? (
        <DialogFrame>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="mb-3 h-10 w-10 text-[var(--pixel-text-muted)]" />
            <p className="font-pixel text-sm text-[var(--pixel-text-primary)]">
              Not enough data yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-[var(--pixel-text-secondary)]">
              Analytics light up after 3 days of activity. Keep studying — your
              charts will appear soon.
            </p>
            <div className="mt-5 flex gap-3">
              <a href="/app/feynman" className="pixel-btn pixel-btn-secondary inline-flex">
                Feynman Mode
              </a>
              <a href="/app/review" className="pixel-btn pixel-btn-primary inline-flex">
                Review Cards
              </a>
            </div>
            {/* Still show the raw stat cards so users can see their XP */}
            <div className="mt-6 w-full">
              <AnalyticsDashboard data={data} />
            </div>
          </div>
        </DialogFrame>
      ) : data ? (
        <AnalyticsDashboard data={data} />
      ) : null}
    </div>
  );
}
