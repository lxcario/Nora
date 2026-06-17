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

  // Fetch due card counts per topic
  const todayStr = today.toISOString().split("T")[0];
  const { data: dueCards } = await supabase
    .from("cards")
    .select("topic_id")
    .eq("user_id", user.id)
    .lte("next_review_at", todayStr);

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

  // Auto-generate suggested sessions for days without activity
  // Simple spacing: suggest review if cards are due, suggest feynman for topics with upcoming exams
  const dueByTopic = new Map<string, number>();
  (dueCards ?? []).forEach((c) => {
    if (c.topic_id) {
      dueByTopic.set(c.topic_id, (dueByTopic.get(c.topic_id) ?? 0) + 1);
    }
  });

  const sessionsDateSet = new Set(sessions.map((s) => s.date));

  (topics ?? []).forEach((topic) => {
    const topicData = topic.subjects as unknown as { name: string; color: string } | null;
    const dueCount = dueByTopic.get(topic.id) ?? 0;

    // Suggest review sessions for topics with due cards
    if (dueCount > 0 && !sessionsDateSet.has(todayStr) && todayStr >= weekStart && todayStr <= weekEnd) {
      sessions.push({
        topic_id: topic.id,
        topic_name: topic.name,
        subject_name: topicData?.name ?? "",
        subject_color: topicData?.color ?? "#6366f1",
        mode: "review",
        date: todayStr,
        duration_minutes: Math.min(dueCount * 2, 30), // ~2 min per card, max 30
        completed: false,
      });
    }

    // If exam is within 14 days, suggest a Feynman session
    if (topic.exam_date) {
      const examDate = new Date(topic.exam_date);
      const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExam > 0 && daysUntilExam <= 14) {
        // Suggest on a day 3 days from now if in this week
        const suggestDate = new Date(today);
        suggestDate.setDate(today.getDate() + Math.min(3, daysUntilExam - 1));
        const suggestStr = suggestDate.toISOString().split("T")[0];
        if (suggestStr >= weekStart && suggestStr <= weekEnd && !sessionsDateSet.has(suggestStr)) {
          sessions.push({
            topic_id: topic.id,
            topic_name: topic.name,
            subject_name: topicData?.name ?? "",
            subject_color: topicData?.color ?? "#6366f1",
            mode: "feynman",
            date: suggestStr,
            duration_minutes: 20,
            completed: false,
          });
        }
      }
    }
  });

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
