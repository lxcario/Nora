import { PageHeader } from "../_components/page-header";
import { getAnalytics } from "../_actions/analytics";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";
import { BarChart3, PenLine, Layers } from "lucide-react";

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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {data && activeDays < 3 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
          <BarChart3 className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">Not enough data yet</p>
          <p className="mt-1 text-center text-xs text-zinc-400 max-w-xs">
            Analytics light up after 3 days of activity. Keep studying — your charts will appear soon.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="/app/feynman"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
            >
              <PenLine className="h-4 w-4 text-emerald-500" />
              Feynman Mode
            </a>
            <a
              href="/app/review"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
            >
              <Layers className="h-4 w-4 text-indigo-500" />
              Review Cards
            </a>
          </div>
          {/* Still show the raw stat cards so users can see their XP */}
          <div className="mt-6 w-full">
            <AnalyticsDashboard data={data} />
          </div>
        </div>
      ) : data ? (
        <AnalyticsDashboard data={data} />
      ) : null}
    </div>
  );
}
