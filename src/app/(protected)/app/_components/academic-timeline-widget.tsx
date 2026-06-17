import Link from "next/link";
import { DialogFrame } from "@/components/pixel-ui";
import { getAcademicTimeline } from "@/app/(protected)/app/_actions/academic/review";

function formatRange(start: string, end: string | null): string {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Dashboard widget showing the next confirmed academic events and an explicit
 * "unreleased" state for expected-but-missing categories (Requirement 15.x).
 * Self-contained async Server Component.
 */
export async function AcademicTimelineWidget() {
  const timeline = await getAcademicTimeline();
  if (!timeline.hasProfile) return null;

  // Onboarded but not finished reviewing → nudge to finish.
  if (timeline.status !== "complete") {
    return (
      <DialogFrame title="YOUR SEMESTER">
        <p className="text-sm text-[var(--pixel-text-secondary)]">
          {timeline.status === "review"
            ? "We found some dates from your documents — review and confirm them."
            : "Finish setting up your semester to see real academic dates here."}
        </p>
        <Link
          href="/app/academic"
          className="mt-2 inline-block font-pixel text-[11px] text-[var(--pixel-accent)] hover:brightness-110"
        >
          Go to My University →
        </Link>
      </DialogFrame>
    );
  }

  if (timeline.upcoming.length === 0 && timeline.unreleased.length === 0) {
    return null;
  }

  return (
    <DialogFrame title="ACADEMIC TIMELINE">
      {timeline.upcoming.length > 0 ? (
        <ul className="space-y-2">
          {timeline.upcoming.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      e.status === "verified" ? "var(--pixel-success)" : "var(--pixel-warning)",
                  }}
                  title={e.status === "verified" ? "Verified — official" : "Inferred"}
                />
                <span className="text-sm text-[var(--pixel-text-primary)] truncate">{e.label}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-[var(--pixel-text-secondary)]">
                  {formatRange(e.startDate, e.endDate)}
                </span>
                <span className="block text-[10px] text-[var(--pixel-text-secondary)]">
                  {e.daysUntil === 0 ? "today" : e.daysUntil === 1 ? "tomorrow" : `in ${e.daysUntil}d`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--pixel-text-secondary)]">
          No upcoming confirmed dates right now.
        </p>
      )}

      {timeline.unreleased.length > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-[var(--pixel-border)]">
          <p className="font-pixel text-[10px] text-[var(--pixel-text-secondary)] mb-1.5">
            NOT YET RELEASED
          </p>
          <div className="flex flex-wrap gap-1.5">
            {timeline.unreleased.map((u) => (
              <span
                key={u.eventType}
                className="font-pixel text-[9px] px-1.5 py-0.5 border border-[var(--pixel-border)] text-[var(--pixel-text-secondary)]"
              >
                {u.label}: unreleased
              </span>
            ))}
          </div>
        </div>
      )}
    </DialogFrame>
  );
}
