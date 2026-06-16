"use client";

import { type AnalyticsData } from "@/app/(protected)/app/_actions/analytics";
import {
  Clock,
  Layers,
  FilePlus,
  Timer,
  Flame,
  TrendingUp,
  BarChart3,
  Award,
} from "lucide-react";

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Clock} label="Sessions (7d)" value={data.sessionsThisWeek.toString()} />
        <StatCard icon={Layers} label="Reviews (30d)" value={data.cardsReviewed.toString()} />
        <StatCard icon={FilePlus} label="Cards Created" value={data.cardsCreated.toString()} />
        <StatCard icon={Timer} label="Minutes (7d)" value={data.studyMinutes.toString()} />
        <StatCard icon={Flame} label="Streak" value={`${data.streak}d`} accent />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sessions chart */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-zinc-400" />
            Sessions per Day (30d)
          </h3>
          <BarChartSimple
            data={data.dailySessions}
            color="bg-indigo-500"
            emptyMessage="No sessions yet"
          />
        </div>

        {/* Reviews chart */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-zinc-400" />
            Cards Reviewed per Day (30d)
          </h3>
          <BarChartSimple
            data={data.dailyReviews}
            color="bg-emerald-500"
            emptyMessage="No reviews yet"
          />
        </div>
      </div>

      {/* Consistency heatmap */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-semibold">Consistency (last 30 days)</h3>
        <ConsistencyHeatmap sessions={data.dailySessions} reviews={data.dailyReviews} />
      </div>

      {/* Topic mastery */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Award className="h-4 w-4 text-zinc-400" />
          Topic Mastery
        </h3>
        {data.topicMastery.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Review some cards to see mastery data per topic.
          </p>
        ) : (
          <div className="space-y-3">
            {data.topicMastery.map((topic) => (
              <div key={topic.name} className="flex items-center gap-3">
                <span className="w-32 truncate text-sm">{topic.name}</span>
                <div className="flex-1">
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        topic.avgGrade >= 4
                          ? "bg-emerald-500"
                          : topic.avgGrade >= 3
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${(topic.avgGrade / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right text-xs text-zinc-500">
                  {topic.avgGrade}/5 ({topic.totalReviews})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Icon className={`h-5 w-5 ${accent ? "text-amber-500" : "text-zinc-400"}`} />
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className={`mt-0.5 text-xl font-bold ${accent ? "text-amber-500" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function BarChartSimple({
  data,
  color,
  emptyMessage,
}: {
  data: { date: string; count: number }[];
  color: string;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-32 items-end gap-[2px]">
      {data.map((d) => (
        <div
          key={d.date}
          className="group relative flex-1"
          title={`${d.date}: ${d.count}`}
        >
          <div
            className={`w-full rounded-t ${color} transition-all hover:opacity-80`}
            style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: "2px" }}
          />
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-white opacity-0 group-hover:opacity-100">
            {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsistencyHeatmap({
  sessions,
  reviews,
}: {
  sessions: { date: string; count: number }[];
  reviews: { date: string; count: number }[];
}) {
  // Build a 30-day grid
  const days: { date: string; level: number }[] = [];
  const activityMap = new Map<string, number>();

  sessions.forEach((s) => activityMap.set(s.date, (activityMap.get(s.date) ?? 0) + s.count));
  reviews.forEach((r) => activityMap.set(r.date, (activityMap.get(r.date) ?? 0) + r.count));

  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const activity = activityMap.get(dateStr) ?? 0;
    const level = activity === 0 ? 0 : activity <= 2 ? 1 : activity <= 5 ? 2 : 3;
    days.push({ date: dateStr, level });
  }

  const COLORS = [
    "bg-zinc-200 dark:bg-zinc-800",
    "bg-emerald-200 dark:bg-emerald-900",
    "bg-emerald-400 dark:bg-emerald-700",
    "bg-emerald-600 dark:bg-emerald-500",
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => (
        <div
          key={d.date}
          className={`h-4 w-4 rounded-sm ${COLORS[d.level]}`}
          title={`${d.date}: level ${d.level}`}
        />
      ))}
    </div>
  );
}
