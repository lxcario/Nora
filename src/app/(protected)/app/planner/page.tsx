import { PageHeader } from "../_components/page-header";
import { getWeeklyPlan } from "../_actions/planner";
import { WeeklyCalendar } from "./_components/weekly-calendar";
import { EmptyState, DialogFrame } from "@/components/pixel-ui";

const STATUS_COLOR: Record<string, string> = {
  verified: "var(--pixel-success)",
  inferred: "var(--pixel-warning)",
};

interface PlannerPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const params = await searchParams;
  const weekOffset = parseInt(params.week ?? "0", 10) || 0;

  const { sessions, weekStart, weekEnd, academicEvents, upcomingDeadlines, academicLoad, error } =
    await getWeeklyPlan(weekOffset);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Planner"
        description="Your weekly study schedule based on spaced practice rules, exam dates, and due cards."
      />

      {error && (
        <DialogFrame state="error">
          <p className="text-sm" style={{ color: "var(--pixel-error)" }}>
            {error || "Your planner couldn't load. Refresh to try again."}
          </p>
        </DialogFrame>
      )}

      {academicLoad.message && (
        <div
          className="pixel-panel text-sm"
          data-state={academicLoad.phase === "mitigation" ? "error" : "warning"}
          style={{
            padding: "var(--pixel-panel-standard)",
            color:
              academicLoad.phase === "mitigation" ? "var(--pixel-error)" : "var(--pixel-text-primary)",
          }}
          role="status"
        >
          <span
            className="font-pixel text-[11px] mr-2"
            style={{
              color:
                academicLoad.phase === "mitigation" ? "var(--pixel-error)" : "var(--pixel-warning)",
            }}
          >
            {academicLoad.phase === "mitigation" ? "⚠ HIGH LOAD" : "FOCUS SHIFT"}
          </span>
          {academicLoad.message}
        </div>
      )}

      {upcomingDeadlines.length > 0 && (
        <div className="pixel-panel" style={{ padding: "var(--pixel-panel-standard)" }}>
          <h2 className="font-pixel text-[11px] text-[var(--pixel-accent)] mb-2">
            UPCOMING ACADEMIC DEADLINES
          </h2>
          <ul className="flex flex-wrap gap-2">
            {upcomingDeadlines.map((e) => (
              <li
                key={e.id}
                className="pixel-panel pixel-panel-inset flex items-center gap-2 text-xs text-[var(--pixel-text-primary)]"
                style={{ padding: "6px 10px" }}
                title={`${e.status === "verified" ? "Verified — official" : "Inferred — confirm if unsure"}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[e.status] ?? "var(--pixel-text-secondary)" }}
                />
                <span className="font-medium">{e.label}</span>
                <span className="text-[var(--pixel-text-secondary)]">
                  {e.daysUntil === 0 ? "today" : e.daysUntil === 1 ? "tomorrow" : `in ${e.daysUntil} days`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sessions.length === 0 && academicEvents.length === 0 && !error && (
        <EmptyState
          icon="calendar"
          message="Your planner is empty this week. Add topics in Settings or upload your academic calendar to get started."
          actionLabel="Add Topics"
          actionHref="/app/settings"
        />
      )}

      <WeeklyCalendar
        sessions={sessions}
        weekStart={weekStart}
        weekEnd={weekEnd}
        weekOffset={weekOffset}
        academicEvents={academicEvents}
      />
    </div>
  );
}
