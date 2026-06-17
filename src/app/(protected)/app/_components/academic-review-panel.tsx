"use client";

import { useMemo, useState } from "react";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";
import type {
  AcademicEvent,
  CurriculumCourse,
  AcademicEventType,
  ConfidenceStatus,
} from "@/lib/supabase/database.types";
import {
  updateAcademicEvent,
  removeAcademicEvent,
  removeCurriculumCourse,
  confirmAcademicData,
} from "@/app/(protected)/app/_actions/academic/review";

const EVENT_LABEL: Record<AcademicEventType, string> = {
  semester_start: "Semester start",
  semester_end: "Semester end",
  registration: "Registration",
  add_drop: "Add / Drop",
  withdrawal_deadline: "Withdrawal deadline",
  midterm_period: "Midterms",
  final_period: "Finals",
  makeup_period: "Make-up exams",
  holiday: "Holiday",
  break: "Break",
  other: "Other",
};

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_LABEL).map(([value, label]) => ({
  value: value as AcademicEventType,
  label,
}));

const STATUS_BADGE: Record<ConfidenceStatus, { label: string; color: string }> = {
  verified: { label: "Verified", color: "var(--pixel-success)" },
  inferred: { label: "Inferred", color: "var(--pixel-warning)" },
  unreleased: { label: "Unreleased", color: "var(--pixel-text-secondary)" },
};

export function AcademicReviewPanel({
  initialEvents,
  initialCourses,
  initialStatus,
}: {
  initialEvents: AcademicEvent[];
  initialCourses: CurriculumCourse[];
  initialStatus: string | null;
}) {
  const [events, setEvents] = useState<AcademicEvent[]>(initialEvents);
  const [courses, setCourses] = useState<CurriculumCourse[]>(initialCourses);
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const by: Record<ConfidenceStatus, AcademicEvent[]> = {
      verified: [],
      inferred: [],
      unreleased: [],
    };
    for (const e of events) by[e.status].push(e);
    return by;
  }, [events]);

  function applyLocalUpdate(updated: AcademicEvent) {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function handleRemoveEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await removeAcademicEvent(id);
  }

  async function handleRemoveCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    await removeCurriculumCourse(id);
  }

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    const res = await confirmAcademicData();
    setConfirming(false);
    if (!res.ok) {
      setError(res.error ?? "Could not confirm. Please try again.");
      return;
    }
    setStatus("complete");
  }

  if (events.length === 0 && courses.length === 0) return null;

  const concreteCount = events.filter((e) => e.status !== "unreleased").length;

  return (
    <DialogFrame title="REVIEW YOUR ACADEMIC DATA" variant="large">
      <p className="text-xs text-[var(--pixel-text-secondary)] mb-4">
        We only kept dates that appear in your official documents. Edit, accept, or remove anything
        below, then confirm. Missing dates are marked <em>Unreleased</em> — never guessed.
      </p>

      {status === "complete" && (
        <div
          className="mb-4 border-2 p-2 text-xs"
          style={{ borderColor: "var(--pixel-success)", color: "var(--pixel-success)" }}
        >
          ✓ Confirmed. Your planner and dashboard now use these dates.
        </div>
      )}

      <div className="space-y-5">
        {(["verified", "inferred", "unreleased"] as ConfidenceStatus[]).map((s) =>
          groups[s].length > 0 ? (
            <section key={s}>
              <h3 className="font-pixel text-[11px] mb-2" style={{ color: STATUS_BADGE[s].color }}>
                {s === "verified"
                  ? "VERIFIED — OFFICIAL"
                  : s === "inferred"
                  ? "INFERRED — NEEDS A LOOK"
                  : "UNRELEASED — NOT YET PUBLISHED"}
              </h3>
              <ul className="space-y-2">
                {groups[s].map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    onUpdated={applyLocalUpdate}
                    onRemove={handleRemoveEvent}
                  />
                ))}
              </ul>
            </section>
          ) : null
        )}

        {courses.length > 0 && (
          <section>
            <h3 className="font-pixel text-[11px] mb-2 text-[var(--pixel-text-secondary)]">
              COURSES
            </h3>
            <ul className="space-y-2">
              {courses.map((c) => (
                <li
                  key={c.id}
                  className="pixel-panel pixel-panel-inset flex items-center justify-between gap-3 p-2"
                >
                  <span className="text-sm text-[var(--pixel-text-primary)] truncate">
                    {c.courseCode ? <strong>{c.courseCode}</strong> : null} {c.title ?? ""}
                    {c.isUserEnrolled && (
                      <span className="ml-2 text-[10px] text-[var(--pixel-success)]">enrolled</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCourse(c.id)}
                    className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-error)] hover:border-[var(--pixel-error)] shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {error && (
        <p className="text-xs mt-3" style={{ color: "var(--pixel-error)" }} role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t-2 border-[var(--pixel-border)]">
        <span className="text-xs text-[var(--pixel-text-secondary)]">
          {concreteCount} dated event{concreteCount === 1 ? "" : "s"} ·{" "}
          {groups.unreleased.length} unreleased
        </span>
        <PixelButton variant="success" onClick={handleConfirm} loading={confirming}>
          {status === "complete" ? "Update" : "Confirm & finish"}
        </PixelButton>
      </div>
    </DialogFrame>
  );
}

function formatRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

function EventRow({
  event,
  onUpdated,
  onRemove,
}: {
  event: AcademicEvent;
  onUpdated: (e: AcademicEvent) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(event.startDate ?? "");
  const [end, setEnd] = useState(event.endDate ?? "");
  const [eventType, setEventType] = useState<AcademicEventType>(event.eventType);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await updateAcademicEvent(event.id, {
      eventType,
      startDate: start === "" ? null : start,
      endDate: end === "" ? null : end,
    });
    setSaving(false);
    if (res.ok) {
      const nextStatus: ConfidenceStatus = start === "" ? "unreleased" : event.status === "unreleased" ? "inferred" : event.status;
      onUpdated({
        ...event,
        eventType,
        startDate: start === "" ? null : start,
        endDate: end === "" ? null : end,
        status: nextStatus,
      });
      setEditing(false);
    }
  }

  return (
    <li className="pixel-panel pixel-panel-inset p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm text-[var(--pixel-text-primary)]">
            {EVENT_LABEL[event.eventType]}
          </span>
          <span className="ml-2 text-xs text-[var(--pixel-text-secondary)]">
            {event.status === "unreleased" ? "Unreleased" : formatRange(event.startDate, event.endDate)}
          </span>
          {event.altStartDate && (
            <span className="ml-2 text-[10px] text-[var(--pixel-warning)]">
              (alt: {formatRange(event.altStartDate, event.altEndDate)})
            </span>
          )}
          {event.sourceExcerpt && (
            <p className="text-[10px] text-[var(--pixel-text-secondary)] mt-0.5 line-clamp-1 italic">
              “{event.sourceExcerpt}”
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-text-primary)]"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(event.id)}
            className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-error)] hover:border-[var(--pixel-error)]"
          >
            Remove
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-[10px] text-[var(--pixel-text-secondary)]">
            Type
            <select
              value={eventType}
              onChange={(ev) => setEventType(ev.target.value as AcademicEventType)}
              className="text-sm border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] text-[var(--pixel-text-primary)] px-1 py-0.5"
            >
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[10px] text-[var(--pixel-text-secondary)]">
            Start
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="text-sm border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] text-[var(--pixel-text-primary)] px-1 py-0.5"
            />
          </label>
          <label className="flex flex-col text-[10px] text-[var(--pixel-text-secondary)]">
            End
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="text-sm border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] text-[var(--pixel-text-primary)] px-1 py-0.5"
            />
          </label>
          <PixelButton size="small" variant="primary" onClick={save} loading={saving}>
            Save
          </PixelButton>
        </div>
      )}
    </li>
  );
}
