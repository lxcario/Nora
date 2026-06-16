import { PageHeader } from "../_components/page-header";
import { getWeeklyPlan } from "../_actions/planner";
import { WeeklyCalendar } from "./_components/weekly-calendar";

export default async function PlannerPage() {
  const { sessions, weekStart, weekEnd, error } = await getWeeklyPlan(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Planner"
        description="Your weekly study schedule based on spaced practice rules, exam dates, and due cards."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <WeeklyCalendar
        sessions={sessions}
        weekStart={weekStart}
        weekEnd={weekEnd}
      />
    </div>
  );
}
