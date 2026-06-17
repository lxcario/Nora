"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  validateIdentity,
  type IdentityInput,
} from "@/lib/academic/identity-validation";
import type { AcademicProfile } from "@/lib/supabase/database.types";

// --- Row → DTO mapper ---

type AcademicProfileRow = {
  id: string;
  user_id: string;
  university_id: string | null;
  faculty_id: string | null;
  program_id: string | null;
  university_name_raw: string | null;
  faculty_name_raw: string | null;
  program_name_raw: string | null;
  year_of_study: number | null;
  term: string | null;
  term_kind: AcademicProfile["termKind"];
  locale: string;
  timezone: string;
  onboarding_status: AcademicProfile["onboardingStatus"];
};

function toAcademicProfile(row: AcademicProfileRow): AcademicProfile {
  return {
    id: row.id,
    userId: row.user_id,
    universityId: row.university_id,
    facultyId: row.faculty_id,
    programId: row.program_id,
    universityNameRaw: row.university_name_raw,
    facultyNameRaw: row.faculty_name_raw,
    programNameRaw: row.program_name_raw,
    yearOfStudy: row.year_of_study,
    term: row.term,
    termKind: row.term_kind,
    locale: row.locale,
    timezone: row.timezone,
    onboardingStatus: row.onboarding_status,
  };
}

// --- Reads ---

/**
 * Returns the current user's academic profile, or null if they have not
 * completed onboarding. Re-verifies auth (Requirement 17.4).
 */
export async function getAcademicProfile(): Promise<AcademicProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("academic_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? toAcademicProfile(data as AcademicProfileRow) : null;
}

// --- Writes ---

export interface SaveIdentityResult {
  ok: boolean;
  /** Field-level validation messages (Requirement 1.5). */
  errors?: Record<string, string>;
  /** Non-field error (auth/db). */
  error?: string;
  profileId?: string;
}

/**
 * Persist the student's academic identity and kick off background discovery.
 *
 * - Re-verifies auth inside the action (Requirement 17.4; Next.js data-security
 *   guidance: a page-level check does not protect a Server Action).
 * - Validates input with the pure `validateIdentity` (Requirement 1.5).
 * - Stores BOTH matched registry ids and raw free-text (Requirement 1.6).
 * - Sets onboarding_status='discovering' and enqueues discovery without
 *   blocking on any network work (Requirements 1.4, 3.1).
 */
export async function saveAcademicIdentity(
  input: IdentityInput
): Promise<SaveIdentityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const result = validateIdentity(input);
  if (!result.valid) {
    return { ok: false, errors: result.errors };
  }
  const v = result.value!;

  // user_id is UNIQUE → upsert so re-running onboarding updates in place.
  const { data, error } = await supabase
    .from("academic_profiles")
    .upsert(
      {
        user_id: user.id,
        university_id: v.universityId,
        faculty_id: v.facultyId,
        program_id: v.programId,
        university_name_raw: v.universityNameRaw,
        faculty_name_raw: v.facultyNameRaw,
        program_name_raw: v.programNameRaw,
        year_of_study: v.yearOfStudy,
        term: v.term,
        term_kind: v.termKind,
        onboarding_status: "discovering",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save profile" };
  }

  // Enqueue discovery without blocking (Requirement 3.1). Advanced by the
  // client poller (processNextJob) and/or the optional pg_cron sweeper.
  await startAcademicDiscovery(supabase, user.id, data.id);

  revalidatePath("/app");
  return { ok: true, profileId: data.id };
}

/**
 * Enqueue a `discover_sources` job for the profile unless one is already
 * pending/running. Non-blocking; the actual work happens in processNextJob().
 */
async function startAcademicDiscovery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profileId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("ingestion_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("academic_profile_id", profileId)
    .eq("job_type", "discover_sources")
    .in("status", ["pending", "running"])
    .maybeSingle();
  if (existing) return;

  await supabase.from("ingestion_jobs").insert({
    user_id: userId,
    academic_profile_id: profileId,
    job_type: "discover_sources",
    payload: { profileId },
    status: "pending",
  });
}

/**
 * Persist explicit course codes the student entered during onboarding as
 * user-enrolled curriculum courses (Requirement 8.4). Stored as `inferred`
 * (user-asserted, not yet matched to an official source). Best-effort: skips
 * duplicates and never blocks onboarding.
 */
export async function setEnrolledCourseCodes(
  codes: string[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const cleaned = Array.from(
    new Set(
      codes
        .map((c) => c.replace(/\s+/g, " ").trim().toUpperCase())
        .filter((c) => c.length > 0 && c.length <= 32)
    )
  ).slice(0, 40);
  if (cleaned.length === 0) return { ok: true };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, error: "No academic profile" };

  // Avoid duplicating codes already stored for this profile.
  const { data: existing } = await supabase
    .from("curriculum_courses")
    .select("course_code")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profile.id)
    .not("course_code", "is", null);
  const existingCodes = new Set(
    (existing ?? []).map((r: { course_code: string | null }) =>
      (r.course_code ?? "").toUpperCase()
    )
  );

  const rows = cleaned
    .filter((code) => !existingCodes.has(code))
    .map((code) => ({
      user_id: user.id,
      academic_profile_id: profile.id,
      course_code: code,
      is_user_enrolled: true,
      is_confirmed: false,
      status: "inferred" as const,
      confidence: 0.5,
    }));

  if (rows.length === 0) return { ok: true };

  const { error } = await supabase.from("curriculum_courses").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  return { ok: true };
}
