"use client";

import { useState } from "react";
import { type PlannedSession } from "@/app/(protected)/app/_actions/planner";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PenLine,
  Layers,
  FlaskConical,
  CheckCircle2,
  Clock,
} from "lucide-react";

const MODE_CONFIG = {
  feynman: { icon: PenLine, label: "Feynman", color: "bg-indigo-500" },
  review: { icon: Layers, label: "Review", color: "bg-emerald-500" },
  research: { icon: FlaskConical, label: "Research", color: "bg-amber-500" },
  planner: { icon: CalendarDays, label: "Planning", color: "bg-sky-500" },
};

interface Props {
  sessions: PlannedSession[];
  weekStart: string;
  weekEnd: string;
}

export function WeeklyCalendar({ sessions, weekStart, weekEnd }: Props) {
  const [currentWeekOffset] = useState(0);

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
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <a
          href={`/app/planner?week=${currentWeekOffset - 1}`}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </a>
        <span className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-zinc-400" />
          {formatDateShort(weekStart)} — {formatDateShort(weekEnd)}
        </span>
        <a
          href={`/app/planner?week=${currentWeekOffset + 1}`}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = day.toISOString().split("T")[0];
          const isToday = dateStr === today;
          const daySessions = sessions.filter((s) => s.date === dateStr);

          return (
            <div key={dateStr} className="flex flex-col">
              {/* Day header */}
              <div
                className={`mb-1 text-center text-xs font-medium ${
                  isToday
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <div>{DAY_NAMES[day.getDay()]}</div>
                <div
                  className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    isToday
                      ? "bg-indigo-600 text-white"
                      : ""
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Sessions for this day */}
              <div
                className={`flex min-h-[120px] flex-col gap-1 rounded-lg border p-1.5 ${
                  isToday
                    ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/10"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                {daySessions.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-700">—</span>
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
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        {Object.entries(MODE_CONFIG).map(([mode, config]) => (
          <div key={mode} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${config.color}`} />
            {config.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Completed
        </div>
      </div>
    </div>
  );
}

function SessionChip({ session }: { session: PlannedSession }) {
  const config = MODE_CONFIG[session.mode];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] ${
        session.completed
          ? "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800"
          : "bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <div
        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${config.color}`}
      />
      <span className="truncate">{session.topic_name}</span>
      {session.completed && (
        <CheckCircle2 className="ml-auto h-3 w-3 flex-shrink-0 text-emerald-500" />
      )}
      {!session.completed && session.duration_minutes && (
        <span className="ml-auto flex items-center gap-0.5 text-zinc-400">
          <Clock className="h-2.5 w-2.5" />
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
