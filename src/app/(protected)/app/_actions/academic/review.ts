"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  AcademicEvent,
  CurriculumCourse,
  AcademicEventType,
} from "@/lib/supabase/database.types";

// --- Row → DTO mappers ---

type EventRow = {
  id: string;
  academic_profile_id: string;
  event_type: AcademicEventType;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  confidence: number | null;
  status: AcademicEvent["status"];
  is_confirmed: boolean;
  source_id: string | null;
  source_excerpt: string | null;
  alt_start_date: string | null;
  alt_end_date: string | null;
  alt_source_id: string | null;
};

function toEvent(r: EventRow): AcademicEvent {
  return {
    id: r.id,
    academicProfileId: r.academic_profile_id,
    eventType: r.event_type,
    title: r.title,
    startDate: r.start_date,
    endDate: r.end_date,
    confidence: r.confidence,
    status: r.status,
    isConfirmed: r.is_confirmed,
    sourceId: r.source_id,
    sourceExcerpt: r.source_excerpt,
    altStartDate: r.alt_start_date,
    altEndDate: r.alt_end_date,
    altSourceId: r.alt_source_id,
  };
}

type CourseRow = {
  id: string;
  academic_profile_id: string;
  course_code: string | null;
  title: string | null;
  year_level: number | null;
  term: string | null;
  credits: number | null;
  description: string | null;
  is_user_enrolled: boolean;
  is_confirmed: boolean;
  source_id: string | null;
  confidence: number | null;
  status: CurriculumCourse["status"];
};

function toCourse(r: CourseRow): CurriculumCourse {
  return {
    id: r.id,
    academicProfileId: r.academic_profile_id,
    courseCode: r.course_code,
    title: r.title,
    yearLevel: r.year_level,
    term: r.term,
    credits: r.credits,
    description: r.description,
    isUserEnrolled: r.is_user_enrolled,
    isConfirmed: r.is_confirmed,
    sourceId: r.source_id,
    confidence: r.confidence,
    status: r.status,
  };
}

// --- Reads ---

export interface AcademicReviewData {
  status: string | null;
  events: AcademicEvent[];
  courses: CurriculumCourse[];
}

/** Load the current user's extracted events + courses for the Review screen. */
export async function getAcademicReviewData(): Promise<AcademicReviewData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: null, events: [], courses: [] };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id, onboarding_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { status: null, events: [], courses: [] };

  const [{ data: events }, { data: courses }] = await Promise.all([
    supabase
      .from("academic_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("academic_profile_id", profile.id)
      .order("start_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("curriculum_courses")
      .select("*")
      .eq("user_id", user.id)
      .eq("academic_profile_id", profile.id)
      .order("year_level", { ascending: true, nullsFirst: false }),
  ]);

  return {
    status: profile.onboarding_status,
    events: ((events ?? []) as EventRow[]).map(toEvent),
    courses: ((courses ?? []) as CourseRow[]).map(toCourse),
  };
}

// --- Edits (Requirement 11.2) ---

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface EventPatch {
  eventType?: AcademicEventType;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Edit an event the user owns. Setting a start date on a previously-unreleased
 * event promotes it to `inferred` (user-provided); clearing it returns it to
 * `unreleased` with NULL dates. We never store an unparseable date.
 */
export async function updateAcademicEvent(
  id: string,
  patch: EventPatch
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const update: Record<string, unknown> = {};

  if (patch.eventType) update.event_type = patch.eventType;
  if (patch.title !== undefined) update.title = patch.title?.slice(0, 200) ?? null;

  if (patch.startDate !== undefined) {
    const start = patch.startDate;
    if (start === null || start === "") {
      // Cleared → back to unreleased with NULL dates.
      update.start_date = null;
      update.end_date = null;
      update.status = "unreleased";
      update.confidence = null;
    } else {
      if (!ISO_DATE.test(start)) return { ok: false, error: "Invalid start date" };
      update.start_date = start;
      update.status = "inferred";
      update.confidence = 0.6;
    }
  }

  if (patch.endDate !== undefined) {
    const end = patch.endDate;
    if (end === null || end === "") {
      update.end_date = null;
    } else {
      if (!ISO_DATE.test(end)) return { ok: false, error: "Invalid end date" };
      update.end_date = end;
    }
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("academic_events")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/academic");
  return { ok: true };
}

export async function removeAcademicEvent(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("academic_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/academic");
  return { ok: true };
}

export async function removeCurriculumCourse(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("curriculum_courses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/academic");
  return { ok: true };
}

// --- Confirm (Requirement 11.3) ---

export interface ConfirmResult {
  ok: boolean;
  error?: string;
}

/**
 * Confirm the reviewed academic data: mark all remaining events and courses as
 * confirmed, create/update the exam topic from any confirmed final period
 * (Requirement 13.3), and set the profile to `complete` (Requirement 11.3).
 */
export async function confirmAcademicData(): Promise<ConfirmResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id, program_name_raw, university_name_raw")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, error: "No academic profile" };

  await supabase
    .from("academic_events")
    .update({ is_confirmed: true })
    .eq("user_id", user.id)
    .eq("academic_profile_id", profile.id);

  await supabase
    .from("curriculum_courses")
    .update({ is_confirmed: true })
    .eq("user_id", user.id)
    .eq("academic_profile_id", profile.id);

  // Create/update an exam topic from the confirmed final period (Req 13.3).
  await syncExamTopicFromFinals(supabase, user.id, profile);

  await supabase
    .from("academic_profiles")
    .update({ onboarding_status: "complete", updated_at: new Date().toISOString() })
    .eq("id", profile.id)
    .eq("user_id", user.id);

  revalidatePath("/app");
  revalidatePath("/app/planner");
  revalidatePath("/app/academic");
  return { ok: true };
}

// --- Dashboard timeline (Requirement 15.1, 15.2, 15.3) ---

const TIMELINE_LABEL: Record<AcademicEventType, string> = {
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
  other: "Academic event",
};

export interface TimelineEvent {
  id: string;
  eventType: AcademicEventType;
  label: string;
  startDate: string;
  endDate: string | null;
  status: AcademicEvent["status"];
  daysUntil: number;
}

export interface AcademicTimeline {
  hasProfile: boolean;
  status: string | null;
  upcoming: TimelineEvent[];
  unreleased: { eventType: AcademicEventType; label: string }[];
}

/**
 * Dashboard timeline: the next confirmed, dated events (chronological) plus the
 * expected categories that are still unreleased — shown explicitly rather than
 * guessed. Reads only the current user's confirmed events.
 */
export async function getAcademicTimeline(): Promise<AcademicTimeline> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hasProfile: false, status: null, upcoming: [], unreleased: [] };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id, onboarding_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { hasProfile: false, status: null, upcoming: [], unreleased: [] };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayMs = new Date(`${todayStr}T00:00:00`).getTime();

  const { data: confirmedDated } = await supabase
    .from("academic_events")
    .select("id, event_type, start_date, end_date, status")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profile.id)
    .eq("is_confirmed", true)
    .neq("status", "unreleased")
    .not("start_date", "is", null)
    .gte("start_date", todayStr)
    .order("start_date", { ascending: true })
    .limit(6);

  const upcoming: TimelineEvent[] = (confirmedDated ?? []).map((e) => {
    const startDate = e.start_date as string;
    return {
      id: e.id,
      eventType: e.event_type as AcademicEventType,
      label: TIMELINE_LABEL[e.event_type as AcademicEventType] ?? "Academic event",
      startDate,
      endDate: (e.end_date as string | null) ?? null,
      status: e.status as AcademicEvent["status"],
      daysUntil: Math.ceil((new Date(`${startDate}T00:00:00`).getTime() - todayMs) / 86_400_000),
    };
  });

  const { data: unreleasedRows } = await supabase
    .from("academic_events")
    .select("event_type")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profile.id)
    .eq("is_confirmed", true)
    .eq("status", "unreleased");

  const seen = new Set<string>();
  const unreleased: { eventType: AcademicEventType; label: string }[] = [];
  for (const r of (unreleasedRows ?? []) as { event_type: AcademicEventType }[]) {
    if (seen.has(r.event_type)) continue;
    seen.add(r.event_type);
    unreleased.push({ eventType: r.event_type, label: TIMELINE_LABEL[r.event_type] ?? "Academic event" });
  }

  return { hasProfile: true, status: profile.onboarding_status, upcoming, unreleased };
}

/**
 * Mirror a confirmed final-exam period into the existing subjects/topics model
 * so the planner's exam-date logic picks it up (Requirement 13.3). Idempotent:
 * reuses a dedicated program subject and one "Final Exams" topic.
 */
async function syncExamTopicFromFinals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: { id: string; program_name_raw: string | null; university_name_raw: string | null }
): Promise<void> {
  const { data: finals } = await supabase
    .from("academic_events")
    .select("start_date")
    .eq("user_id", userId)
    .eq("academic_profile_id", profile.id)
    .eq("event_type", "final_period")
    .not("start_date", "is", null)
    .order("start_date", { ascending: true })
    .limit(1);

  const examDate = finals?.[0]?.start_date as string | undefined;
  if (!examDate) return; // unreleased finals → nothing concrete to create

  const subjectName = profile.program_name_raw?.trim() || "My Program";

  // Find or create a subject for the program.
  let subjectId: string | null = null;
  const { data: existingSubject } = await supabase
    .from("subjects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", subjectName)
    .maybeSingle();
  if (existingSubject?.id) {
    subjectId = existingSubject.id;
  } else {
    const { data: createdSubject } = await supabase
      .from("subjects")
      .insert({ user_id: userId, name: subjectName, color: "#6366f1" })
      .select("id")
      .single();
    subjectId = createdSubject?.id ?? null;
  }
  if (!subjectId) return;

  // Find or create the "Final Exams" topic and set its exam_date.
  const topicName = "Final Exams";
  const { data: existingTopic } = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .eq("name", topicName)
    .maybeSingle();

  if (existingTopic?.id) {
    await supabase
      .from("topics")
      .update({ exam_date: examDate })
      .eq("id", existingTopic.id)
      .eq("user_id", userId);
  } else {
    await supabase.from("topics").insert({
      user_id: userId,
      subject_id: subjectId,
      name: topicName,
      exam_date: examDate,
    });
  }
}
