"use client";

import { type AnalyticsData } from "@/app/(protected)/app/_actions/analytics";
import { formatStreak } from "@/lib/format-streak";
import { DialogFrame, PixelProgressBar } from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Stat icon sprites
// ---------------------------------------------------------------------------

const STAT_ICONS: Record<string, string> = {
  sessions: "Restart.png",
  reviews: "Book.png",
  cards: "Document.png",
  minutes: "Sun.png",
  streak: "PotionRed.png",
};

// ---------------------------------------------------------------------------
// AnalyticsDashboard
// ---------------------------------------------------------------------------

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={STAT_ICONS.sessions} label="Sessions (7d)" value={data.sessionsThisWeek.toString()} />
        <StatCard icon={STAT_ICONS.reviews} label="Reviews (30d)" value={data.cardsReviewed.toString()} />
        <StatCard icon={STAT_ICONS.cards} label="Cards Created" value={data.cardsCreated.toString()} />
        <StatCard icon={STAT_ICONS.minutes} label="Minutes (7d)" value={data.studyMinutes.toString()} />
        <StatCard
          icon={STAT_ICONS.streak}
          label="Streak"
          value={data.streak === 0 ? formatStreak(0, "analytics") : `${data.streak}d`}
          accent
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sessions chart */}
        <DialogFrame title="SESSIONS PER DAY (30D)">
          <BarChartPixel
            data={data.dailySessions}
            color="var(--pixel-accent)"
            emptyMessage="No sessions yet"
          />
        </DialogFrame>

        {/* Reviews chart */}
        <DialogFrame title="CARDS REVIEWED PER DAY (30D)">
          <BarChartPixel
            data={data.dailyReviews}
            color="var(--pixel-success)"
            emptyMessage="No reviews yet"
          />
        </DialogFrame>
      </div>

      {/* Consistency heatmap */}
      <DialogFrame title="CONSISTENCY (LAST 30 DAYS)">
        <ConsistencyHeatmap sessions={data.dailySessions} reviews={data.dailyReviews} />
      </DialogFrame>

      {/* Topic mastery */}
      <DialogFrame title="TOPIC MASTERY">
        {data.topicMastery.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
            Review some cards to see mastery data per topic.
          </p>
        ) : (
          <div className="space-y-3">
            {data.topicMastery.map((topic) => {
              const color =
                topic.avgGrade >= 4
                  ? "var(--pixel-success)"
                  : topic.avgGrade >= 3
                    ? "var(--pixel-warning)"
                    : "var(--pixel-error)";
              return (
                <div key={topic.name} className="flex items-center gap-3">
                  <span
                    className="w-32 truncate text-sm"
                    style={{ color: "var(--pixel-text-primary)" }}
                  >
                    {topic.name}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-3 overflow-hidden"
                      style={{
                        backgroundColor: "var(--pixel-bg-secondary)",
                        border: "1px solid var(--pixel-border)",
                      }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(topic.avgGrade / 5) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="w-16 text-right text-xs"
                    style={{ color: "var(--pixel-text-secondary)" }}
                  >
                    {topic.avgGrade}/5 ({topic.totalReviews})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DialogFrame>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard — pixel-themed stat tile
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="pixel-panel flex items-center gap-3 p-3">
      <img
        src={`/sprites/travel-book/icons/${icon}`}
        alt=""
        width={20}
        height={20}
        className="pixel-art shrink-0"
      />
      <div>
        <p
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--pixel-text-secondary)", letterSpacing: "0.5px" }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 font-pixel text-lg"
          style={{ color: accent ? "var(--pixel-accent)" : "var(--pixel-text-primary)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BarChartPixel — pixel-themed bar chart
// ---------------------------------------------------------------------------

function BarChartPixel({
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
      <div
        className="flex h-32 items-center justify-center text-xs"
        style={{ color: "var(--pixel-text-muted)" }}
      >
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
            className="w-full transition-all hover:opacity-80"
            style={{
              height: `${(d.count / maxCount) * 100}%`,
              minHeight: "2px",
              backgroundColor: color,
              imageRendering: "pixelated",
            }}
          />
          <div
            className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 font-pixel text-[9px] opacity-0 group-hover:opacity-100"
            style={{
              backgroundColor: "var(--pixel-bg-surface)",
              border: "1px solid var(--pixel-border)",
              color: "var(--pixel-text-primary)",
            }}
          >
            {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConsistencyHeatmap — pixel-themed 30-day grid
// ---------------------------------------------------------------------------

function ConsistencyHeatmap({
  sessions,
  reviews,
}: {
  sessions: { date: string; count: number }[];
  reviews: { date: string; count: number }[];
}) {
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
    "var(--pixel-bg-secondary)",
    "color-mix(in srgb, var(--pixel-success) 30%, var(--pixel-bg-secondary))",
    "color-mix(in srgb, var(--pixel-success) 60%, var(--pixel-bg-secondary))",
    "var(--pixel-success)",
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => (
        <div
          key={d.date}
          className="h-4 w-4"
          style={{
            backgroundColor: COLORS[d.level],
            border: "1px solid var(--pixel-border)",
            imageRendering: "pixelated",
          }}
          title={`${d.date}: level ${d.level}`}
        />
      ))}
    </div>
  );
}
