import { PageHeader } from "../_components/page-header";
import { getWeeklyPlan } from "../_actions/planner";
import { WeeklyCalendar } from "./_components/weekly-calendar";
import { EmptyState, DialogFrame } from "@/components/pixel-ui";

const STATUS_COLOR: Record<string, string> = {
  verified: "var(--pixel-success)",
  inferred: "var(--pixel-warning)",
};

export default async function PlannerPage() {
  const { sessions, weekStart, weekEnd, academicEvents, upcomingDeadlines, academicLoad, error } =
    await getWeeklyPlan(0);

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
          className="rounded-lg border-2 p-3 text-sm"
          style={{
            borderColor:
              academicLoad.phase === "mitigation" ? "var(--pixel-error)" : "var(--pixel-warning)",
            backgroundColor: "var(--pixel-bg-surface)",
            color:
              academicLoad.phase === "mitigation" ? "var(--pixel-error)" : "var(--pixel-text-primary)",
          }}
          role="status"
        >
          <span className="font-pixel text-[10px] mr-2">
            {academicLoad.phase === "mitigation" ? "⚠ HIGH LOAD" : "FOCUS SHIFT"}
          </span>
          {academicLoad.message}
        </div>
      )}

      {upcomingDeadlines.length > 0 && (
        <div className="rounded-lg border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-3">
          <h2 className="font-pixel text-[11px] text-[var(--pixel-accent)] mb-2">
            UPCOMING ACADEMIC DEADLINES
          </h2>
          <ul className="flex flex-wrap gap-2">
            {upcomingDeadlines.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 border-2 border-[var(--pixel-border)] px-2 py-1 text-xs text-[var(--pixel-text-primary)]"
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
        academicEvents={academicEvents}
      />
    </div>
  );
}
