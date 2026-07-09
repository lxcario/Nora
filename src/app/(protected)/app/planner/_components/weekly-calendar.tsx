import Link from "next/link";
import { type PlannedSession, type PlannedAcademicEvent } from "@/app/(protected)/app/_actions/planner";
import { PixelButton } from "@/components/pixel-ui";

const MODE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  feynman:  { label: "Feynman",  icon: "Lightbulb.png", color: "var(--pixel-accent)" },
  review:   { label: "Review",   icon: "Book.png",      color: "var(--pixel-success)" },
  research: { label: "Research", icon: "MagnifyingGlass.png", color: "var(--pixel-warning)" },
  planner:  { label: "Planning", icon: "Document.png",  color: "#5b9bd5" },
};

interface Props {
  sessions: PlannedSession[];
  weekStart: string;
  weekEnd: string;
  weekOffset?: number;
  academicEvents?: PlannedAcademicEvent[];
}

export function WeeklyCalendar({ sessions, weekStart, weekEnd, weekOffset = 0, academicEvents = [] }: Props) {

  // Generate days of the week
  const days = [];
  const start = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="pixel-panel flex items-center justify-between" style={{ padding: "var(--pixel-panel-compact) var(--pixel-panel-standard)" }}>
        <Link href={`/app/planner?week=${weekOffset - 1}`}>
          <PixelButton variant="secondary" size="small">
            ← Prev
          </PixelButton>
        </Link>
        <span className="flex items-center gap-2 font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
          <img src="/sprites/travel-book/icons/Document.png" alt="" width={14} height={14} className="pixel-art" />
          {formatDateShort(weekStart)} — {formatDateShort(weekEnd)}
        </span>
        <Link href={`/app/planner?week=${weekOffset + 1}`}>
          <PixelButton variant="secondary" size="small">
            Next →
          </PixelButton>
        </Link>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = day.toISOString().split("T")[0];
          const isToday = dateStr === today;
          const daySessions = sessions.filter((s) => s.date === dateStr);
          const dayAcademic = academicEvents.filter((e) => {
            const end = e.endDate ?? e.startDate;
            return e.startDate <= dateStr && end >= dateStr;
          });

          return (
            <div key={dateStr} className="flex flex-col">
              {/* Day header */}
              <div className="mb-1 text-center">
                <div
                  className="font-pixel text-[10px]"
                  style={{ color: isToday ? "var(--pixel-accent)" : "var(--pixel-text-muted)" }}
                >
                  {DAY_NAMES[day.getDay()]}
                </div>
                <div
                  className="mx-auto mt-0.5 flex h-6 w-6 items-center justify-center font-pixel text-[10px]"
                  style={{
                    backgroundColor: isToday ? "var(--pixel-accent)" : "transparent",
                    color: isToday ? "var(--pixel-bg-primary)" : "var(--pixel-text-secondary)",
                    border: isToday ? "none" : "1px solid var(--pixel-border)",
                  }}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Sessions for this day */}
              <div
                className="pixel-panel pixel-panel-inset flex min-h-[120px] flex-col gap-1 p-1.5"
                style={{
                  borderColor: isToday ? "var(--pixel-accent)" : undefined,
                  backgroundColor: isToday
                    ? "color-mix(in srgb, var(--pixel-accent) 6%, var(--pixel-bg-surface))"
                    : undefined,
                }}
              >
                {dayAcademic.map((e) => (
                  <AcademicChip key={e.id} event={e} />
                ))}
                {daySessions.length === 0 && dayAcademic.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
                      —
                    </span>
                  </div>
                ) : (
                  daySessions.map((session, i) => (
                    <SessionChip key={i} session={session} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
        {Object.entries(MODE_CONFIG).map(([mode, config]) => (
          <div key={mode} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5" style={{ backgroundColor: config.color }} />
            <span className="font-pixel text-[10px]">{config.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <img src="/sprites/travel-book/icons/Trophy.png" alt="" width={10} height={10} className="pixel-art" />
          <span className="font-pixel text-[10px]">Completed</span>
        </div>
      </div>
    </div>
  );
}

function AcademicChip({ event }: { event: PlannedAcademicEvent }) {
  const dotColor = event.status === "verified" ? "var(--pixel-success)" : "var(--pixel-warning)";
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-1 text-[10px]"
      style={{
        border: "1px solid var(--pixel-border)",
        backgroundColor: "var(--pixel-bg-surface)",
        color: "var(--pixel-text-primary)",
      }}
      title={event.status === "verified" ? "Verified — official source" : "Inferred — confirm if unsure"}
    >
      <img src="/sprites/travel-book/icons/Backpack.png" alt="" width={10} height={10} className="pixel-art flex-shrink-0" />
      <span className="truncate font-medium">{event.label}</span>
      <span
        className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
    </div>
  );
}

function SessionChip({ session }: { session: PlannedSession }) {
  const config = MODE_CONFIG[session.mode] ?? MODE_CONFIG.planner;

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-1 text-[10px]"
      style={{
        backgroundColor: session.completed
          ? "color-mix(in srgb, var(--pixel-success) 10%, var(--pixel-bg-surface))"
          : "var(--pixel-bg-secondary)",
        color: session.completed ? "var(--pixel-text-muted)" : "var(--pixel-text-primary)",
        textDecoration: session.completed ? "line-through" : "none",
      }}
    >
      <div
        className="h-1.5 w-1.5 flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />
      <span className="truncate">{session.topic_name}</span>
      {session.completed && (
        <img
          src="/sprites/travel-book/icons/Trophy.png"
          alt="Done"
          width={9}
          height={9}
          className="pixel-art ml-auto flex-shrink-0"
        />
      )}
      {!session.completed && session.duration_minutes && (
        <span className="ml-auto" style={{ color: "var(--pixel-text-muted)" }}>
          {session.duration_minutes}m
        </span>
      )}
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
