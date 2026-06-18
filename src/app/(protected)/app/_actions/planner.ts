"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { incrementQuestProgress } from "./party-quests";
import type { AcademicEventType, ConfidenceStatus } from "@/lib/supabase/database.types";
import {
  assessLoad,
  loadIntensityMultiplier,
  type LoadEvent,
  type LoadPhase,
} from "@/lib/academic/academic-load";
import {
  distributeSessions,
  examRetention,
  NEAR_EXAM_THRESHOLD_DAYS,
} from "@/lib/spacing";
import { endOfUserLocalDay } from "@/lib/due";
import { nextFreeDate } from "@/lib/planner-scheduling";

export interface PlannedSession {
  id?: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
  subject_color: string;
  mode: "feynman" | "review" | "research" | "planner";
  date: string; // YYYY-MM-DD
  duration_minutes: number | null;
  completed: boolean;
  /**
   * FSRS request_retention override for near-exam sessions (spec Req 7.3).
   * Present only on auto-generated suggestions; undefined for completed sessions.
   * When present, the review flow should use this retention instead of the default.
   */
  requestRetention?: number;
}

/** A confirmed academic deadline surfaced in the planner (Requirement 13.1, 13.2). */
export interface PlannedAcademicEvent {
  id: string;
  eventType: AcademicEventType;
  label: string;
  title: string | null;
  startDate: string; // never null here (unreleased events are excluded)
  endDate: string | null;
  status: ConfidenceStatus; // "verified" | "inferred" (never "unreleased")
  daysUntil: number;
}

const ACADEMIC_EVENT_LABEL: Record<AcademicEventType, string> = {
  semester_start: "Semester start",
  semester_end: "Semester end",
  registration: "Registration",
  add_drop: "Add / Drop deadline",
  withdrawal_deadline: "Withdrawal deadline",
  midterm_period: "Midterms",
  final_period: "Finals",
  makeup_period: "Make-up exams",
  holiday: "Holiday",
  break: "Break",
  other: "Academic event",
};

/**
 * Gets the weekly plan for the user.
 * Combines actual study_sessions with auto-generated suggestions
 * based on topics, exam dates, and review queue.
 */
export interface AcademicLoadSummary {
  value: number;
  phase: LoadPhase;
  dominantLabel: string | null;
  dominantDaysUntil: number | null;
  message: string | null;
}

export async function getWeeklyPlan(weekOffset = 0): Promise<{
  sessions: PlannedSession[];
  weekStart: string;
  weekEnd: string;
  academicEvents: PlannedAcademicEvent[];
  upcomingDeadlines: PlannedAcademicEvent[];
  academicLoad: AcademicLoadSummary;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      sessions: [],
      weekStart: "",
      weekEnd: "",
      academicEvents: [],
      upcomingDeadlines: [],
      academicLoad: { value: 0, phase: "baseline", dominantLabel: null, dominantDaysUntil: null, message: null },
      error: "Not authenticated",
    };

  // Calculate week boundaries (Monday-Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  // Timezone-aware due cutoff for FSRS (spec Req 2.3, 2.4).
  const { data: plannerProfile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const plannerTz = plannerProfile?.timezone ?? "UTC";
  const cutoff = endOfUserLocalDay(today, plannerTz);

  // Fetch actual completed sessions for this week
  const { data: completedSessions } = await supabase
    .from("study_sessions")
    .select("id, topic_id, mode, duration_minutes, started_at, ended_at, topics(name, subjects(name, color))")
    .eq("user_id", user.id)
    .gte("started_at", `${weekStart}T00:00:00`)
    .lte("started_at", `${weekEnd}T23:59:59`)
    .order("started_at", { ascending: true });

  // Fetch topics with exam dates for planning
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, exam_date, subjects(name, color)")
    .eq("user_id", user.id)
    .order("exam_date", { ascending: true });

  // Fetch due card counts per topic (FSRS-only, timezone-aware)
  const { data: dueCards } = await supabase
    .from("cards")
    .select("topic_id")
    .eq("user_id", user.id)
    .lte("due", cutoff.toISOString());

  // Build completed sessions list
  const sessions: PlannedSession[] = (completedSessions ?? []).map((s) => {
    const topic = s.topics as unknown as { name: string; subjects: { name: string; color: string } } | null;
    return {
      id: s.id,
      topic_id: s.topic_id ?? "",
      topic_name: topic?.name ?? "General",
      subject_name: topic?.subjects?.name ?? "",
      subject_color: topic?.subjects?.color ?? "#6366f1",
      mode: s.mode as PlannedSession["mode"],
      date: (s.started_at as string).split("T")[0],
      duration_minutes: s.duration_minutes,
      completed: !!s.ended_at,
    };
  });

  // Auto-generate suggested sessions distributed across the week using
  // the Cepeda et al. 2008 spacing ridgeline (spec Req 7.1, 7.2, 7.3).
  const dueByTopic = new Map<string, number>();
  (dueCards ?? []).forEach((c) => {
    if (c.topic_id) {
      dueByTopic.set(c.topic_id, (dueByTopic.get(c.topic_id) ?? 0) + 1);
    }
  });

  const sessionsDateSet = new Set(sessions.map((s) => s.date));

  // Build per-topic schedule inputs for distributeSessions.
  // Include topics that have due cards OR an upcoming exam.
  const scheduleInputs = (topics ?? [])
    .map((topic) => {
      const daysUntilExam =
        topic.exam_date
          ? Math.ceil(
              (new Date(topic.exam_date).getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;
      return { topicId: topic.id, daysUntilExam };
    })
    .filter(({ topicId, daysUntilExam }) => {
      const hasDue = (dueByTopic.get(topicId) ?? 0) > 0;
      const examSoon =
        daysUntilExam !== null && daysUntilExam > 0 && daysUntilExam <= 90;
      return hasDue || examSoon;
    });

  // Days remaining until the end of the displayed week (≥ 1).
  const daysToWeekEnd = Math.max(
    1,
    Math.ceil(
      (new Date(weekEnd + "T23:59:59").getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const spacedDates = distributeSessions(scheduleInputs, today, daysToWeekEnd);

  // Build a lookup from topicId → topic row for quick rendering.
  const topicById = new Map(
    (topics ?? []).map((t) => [t.id, t])
  );

  for (const { topicId, date, requestRetention } of spacedDates) {
    // Only suggest within the displayed week; skip dates already occupied.
    if (date < weekStart || date > weekEnd) continue;
    if (sessionsDateSet.has(date)) continue;

    const topic = topicById.get(topicId);
    if (!topic) continue;
    const topicData = topic.subjects as unknown as { name: string; color: string } | null;
    const dueCount = dueByTopic.get(topicId) ?? 0;
    const daysUntilExam =
      topic.exam_date
        ? Math.ceil(
            (new Date(topic.exam_date).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

    // Mode: Feynman near the exam, review when cards are due.
    const mode: PlannedSession["mode"] =
      daysUntilExam !== null && daysUntilExam <= NEAR_EXAM_THRESHOLD_DAYS && dueCount === 0
        ? "feynman"
        : "review";

    sessions.push({
      topic_id: topicId,
      topic_name: topic.name,
      subject_name: topicData?.name ?? "",
      subject_color: topicData?.color ?? "#6366f1",
      mode,
      date,
      duration_minutes:
        mode === "review"
          ? Math.min(Math.max(dueCount, 1) * 2, 45)
          : 20,
      completed: false,
      requestRetention,
    });
    sessionsDateSet.add(date);
  }

  // ── Incorporate planner skips (spec Req 7.4) ──────────────────────────────
  // Read skips from the last 30 days so rescheduled sessions re-surface even
  // if the original date falls outside the current week view.
  const { data: skipRows } = await supabase
    .from("planner_skips")
    .select("topic_id, original_date, reschedule_date")
    .eq("user_id", user.id)
    .gte("original_date", new Date(today.getTime() - 30 * 86_400_000).toISOString().split("T")[0]);

  const skippedPairs = new Set<string>(
    (skipRows ?? []).map((r) => `${r.topic_id}:${r.original_date}`)
  );
  const rescheduledPairs = new Map<string, string>(
    (skipRows ?? [])
      .filter((r) => r.reschedule_date)
      .map((r) => [`${r.topic_id}:${r.reschedule_date}`, r.topic_id])
  );

  // Filter auto-generated suggestions: drop skipped dates, add rescheduled ones.
  const filteredSessions = sessions.filter((s) => {
    if (s.id) return true; // completed (DB row) — never filtered
    return !skippedPairs.has(`${s.topic_id}:${s.date}`);
  });

  // Add rescheduled sessions (they may land on a different week).
  for (const [pair, topicId] of rescheduledPairs) {
    const reschDate = pair.split(":")[1];
    if (reschDate < weekStart || reschDate > weekEnd) continue;
    if (filteredSessions.some((s) => s.topic_id === topicId && s.date === reschDate)) continue;

    const topic = topicById.get(topicId);
    if (!topic) continue;
    const td = topic.subjects as unknown as { name: string; color: string } | null;
    const dueCount = dueByTopic.get(topicId) ?? 0;
    const daysUntilExam = topic.exam_date
      ? Math.ceil((new Date(topic.exam_date).getTime() - today.getTime()) / 86_400_000)
      : null;

    filteredSessions.push({
      topic_id: topicId,
      topic_name: topic.name,
      subject_name: td?.name ?? "",
      subject_color: td?.color ?? "#6366f1",
      mode: daysUntilExam !== null && daysUntilExam <= NEAR_EXAM_THRESHOLD_DAYS && dueCount === 0
        ? "feynman" : "review",
      date: reschDate,
      duration_minutes: Math.min(Math.max(dueCount, 1) * 2, 45),
      completed: false,
      requestRetention: examRetention(daysUntilExam),
    });
  }

  // Replace sessions array with the filtered + rescheduled set.
  sessions.length = 0;
  sessions.push(...filteredSessions);

  // Sort by date
  sessions.sort((a, b) => a.date.localeCompare(b.date));

  // --- Merge confirmed academic events (Requirement 13.1, 13.2, 13.4) ---
  // Only confirmed, dated events surface; `unreleased` (NULL-date) events are
  // never shown as concrete dates.
  let academicEvents: PlannedAcademicEvent[] = [];
  let upcomingDeadlines: PlannedAcademicEvent[] = [];
  let academicLoad: AcademicLoadSummary = {
    value: 0,
    phase: "baseline",
    dominantLabel: null,
    dominantDaysUntil: null,
    message: null,
  };

  const { data: academicProfile } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (academicProfile) {
    const { data: evs } = await supabase
      .from("academic_events")
      .select("id, event_type, title, start_date, end_date, status")
      .eq("user_id", user.id)
      .eq("academic_profile_id", academicProfile.id)
      .eq("is_confirmed", true)
      .neq("status", "unreleased")
      .not("start_date", "is", null)
      .order("start_date", { ascending: true });

    const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
    const all: PlannedAcademicEvent[] = (evs ?? []).map((e) => {
      const startDate = e.start_date as string;
      const daysUntil = Math.ceil(
        (new Date(`${startDate}T00:00:00`).getTime() - todayMs) / (1000 * 60 * 60 * 24)
      );
      return {
        id: e.id,
        eventType: e.event_type as AcademicEventType,
        label: ACADEMIC_EVENT_LABEL[e.event_type as AcademicEventType] ?? "Academic event",
        title: e.title ?? null,
        startDate,
        endDate: (e.end_date as string | null) ?? null,
        status: e.status as ConfidenceStatus,
        daysUntil,
      };
    });

    // Events intersecting the displayed week → calendar chips.
    academicEvents = all.filter((e) => {
      const end = e.endDate ?? e.startDate;
      return e.startDate <= weekEnd && end >= weekStart;
    });

    // Next confirmed deadlines (today onward) → warning strip.
    upcomingDeadlines = all.filter((e) => e.daysUntil >= 0).slice(0, 5);

    // --- Cognitive-load-aware planning (Requirements 14.1–14.4) ---
    const loadEvents: LoadEvent[] = all
      .filter((e) => e.daysUntil >= 0)
      .map((e) => ({ eventType: e.eventType, daysUntil: e.daysUntil }));
    const assessment = assessLoad(loadEvents);
    const dominantPlanned = assessment.dominant
      ? all.find(
          (e) =>
            e.eventType === assessment.dominant!.eventType &&
            e.daysUntil === assessment.dominant!.daysUntil
        ) ?? null
      : null;

    let message: string | null = null;
    if (assessment.phase === "escalation" && dominantPlanned) {
      message = `Focus is shifting toward ${dominantPlanned.label.toLowerCase()} (in ${dominantPlanned.daysUntil} day${dominantPlanned.daysUntil === 1 ? "" : "s"}). Prioritizing related prep.`;
    } else if (assessment.phase === "mitigation" && dominantPlanned) {
      const when =
        dominantPlanned.daysUntil === 0
          ? "today"
          : dominantPlanned.daysUntil === 1
          ? "tomorrow"
          : `in ${dominantPlanned.daysUntil} days`;
      message = `High study load: ${dominantPlanned.label.toLowerCase()} ${when}. Emphasize active test-prep now.`;
    }

    academicLoad = {
      value: Number(assessment.load.toFixed(3)),
      phase: assessment.phase,
      dominantLabel: dominantPlanned?.label ?? null,
      dominantDaysUntil: dominantPlanned?.daysUntil ?? null,
      message,
    };

    // Reweight suggested (not-yet-completed) sessions as load rises.
    const multiplier = loadIntensityMultiplier(assessment.phase);
    if (multiplier > 1) {
      for (const s of sessions) {
        if (!s.completed && !s.id && s.duration_minutes) {
          s.duration_minutes = Math.min(60, Math.round(s.duration_minutes * multiplier));
        }
      }
    }
  }

  return { sessions, weekStart, weekEnd, academicEvents, upcomingDeadlines, academicLoad };
}

/**
 * Starts a study session. Returns the session ID.
 */
export async function startSession(
  topicId: string,
  mode: "feynman" | "review" | "research" | "planner"
): Promise<{ sessionId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      topic_id: topicId || null,
      mode,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/planner");
  return { sessionId: data.id };
}

/**
 * Completes (ends) a study session.
 */
export async function completeSession(
  sessionId: string,
  durationMinutes: number
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("study_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Track party quest progress for study_minutes (non-blocking)
  try {
    await incrementQuestProgress(user.id, "study_minutes", durationMinutes);
  } catch (e) {
    console.warn("Party quest progress update failed (session):", e);
  }

  revalidatePath("/app/planner");
  revalidatePath("/app/analytics");
  return { success: true };
}

/**
 * Marks a planner-suggested session as missed and reschedules it forward
 * to the next free day (spec Req 7.4).
 *
 * "Forward-fill" algorithm:
 *   1. Collect all existing study_session dates for this topic.
 *   2. Collect all already-rescheduled skip dates for this topic.
 *   3. Find the first day after `originalDate` not in either set.
 *   4. Persist the skip record with the computed reschedule date.
 *
 * This ensures missed sessions are rescheduled one-by-one without all
 * landing on the same next day (no compression).
 *
 * Returns `rescheduledTo` (YYYY-MM-DD) or `null` when no free slot was
 * found within a 14-day lookahead.
 */
export async function markSessionMissed(
  topicId: string,
  originalDate: string // YYYY-MM-DD
): Promise<{ rescheduledTo?: string | null; error?: string }> {
  if (!topicId || !originalDate) {
    return { error: "topicId and originalDate are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Gather occupied dates for this topic to avoid compression.
  // 1. Dates of existing study sessions for this topic.
  const { data: existingSessions } = await supabase
    .from("study_sessions")
    .select("started_at")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .gte("started_at", originalDate);

  const occupiedDates = new Set<string>(
    (existingSessions ?? []).map((s) =>
      (s.started_at as string).split("T")[0]
    )
  );

  // 2. Dates already taken by prior rescheduled skips for this topic.
  const { data: existingSkips } = await supabase
    .from("planner_skips")
    .select("reschedule_date")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .not("reschedule_date", "is", null);

  for (const skip of existingSkips ?? []) {
    if (skip.reschedule_date) occupiedDates.add(skip.reschedule_date as string);
  }

  // 3. Compute forward-fill date.
  const rescheduledTo = nextFreeDate(originalDate, occupiedDates);

  // 4. Persist the skip record.
  const { error: insertError } = await supabase.from("planner_skips").insert({
    user_id: user.id,
    topic_id: topicId,
    original_date: originalDate,
    reschedule_date: rescheduledTo ?? null,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/app/planner");
  return { rescheduledTo: rescheduledTo ?? null };
}
