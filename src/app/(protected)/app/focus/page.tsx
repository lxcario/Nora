import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { FocusTimer } from "./_components/focus-timer";
import {
  computeRecommendation,
  type FocusSessionRecord,
} from "@/lib/focus-adaptive";

export const metadata = {
  title: "Focus Timer — Nora",
};

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read recent focus sessions to drive the adaptive recommendation. Until the
  // session-logging slice lands (needs migration 020 to allow mode='focus'),
  // this returns an empty set and the engine falls back to the 25/5 default.
  let history: FocusSessionRecord[] = [];
  if (user) {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const { data } = await supabase
      .from("study_sessions")
      .select("duration_minutes, started_at, ended_at")
      .eq("user_id", user.id)
      .eq("mode", "focus")
      .gte("started_at", fourteenDaysAgo.toISOString());

    history = (data ?? [])
      .filter((s) => typeof s.duration_minutes === "number")
      .map((s) => ({
        durationMinutes: s.duration_minutes as number,
        completedFull: Boolean(s.ended_at),
        createdAt: new Date(s.started_at as string),
      }));
  }

  const recommendation = computeRecommendation(history);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Focus Timer"
        description="A cozy Pomodoro timer that learns your best focus length over time."
      />
      <div className="pixel-panel" style={{ padding: "var(--pixel-panel-standard)" }}>
        <FocusTimer recommendation={recommendation} />
      </div>
    </div>
  );
}
