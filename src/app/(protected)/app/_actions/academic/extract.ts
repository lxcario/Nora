"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  validateExtractedEvent,
  classifyEventType,
  parseDateRange,
  detectTermSeason,
  type EventCandidate,
} from "@/lib/academic/academic-extract";
import {
  computeConfidence,
  statusForConfidence,
} from "@/lib/academic/source-ranking";
import type { AcademicEventType } from "@/lib/supabase/database.types";

const LLM_TIMEOUT_MS = 30_000;
const MAX_SOURCE_CHARS = 16_000; // keep the LLM prompt bounded
const MANUAL_UPLOAD_TIER = 4; // uploads are Tier 4 (syllabus/upload) per Req 9.1

// Event types we expect a calendar to cover; missing ones become `unreleased`.
const EXPECTED_TYPES: AcademicEventType[] = [
  "semester_start",
  "semester_end",
  "registration",
  "add_drop",
  "midterm_period",
  "final_period",
  "makeup_period",
];

export interface ExtractEventsResult {
  ok: boolean;
  error?: string;
  counts?: { kept: number; dropped: number; unreleased: number };
}

/**
 * Extract grounded academic events from an ingested academic document.
 *
 * Pipeline: gather the document's chunk text → propose candidate lines (a
 * grounded line-scan, plus a strict LLM pass when a provider is configured) →
 * validate EVERY candidate through `academic-extract` (verbatim grounding +
 * date parse + term window) → rank/score → write `academic_events`. Expected
 * event types with no grounded date are stored as `unreleased` with NULL dates.
 * NEVER invents a date (Requirements 7.1, 7.3, 7.4, 7.5).
 */
export async function extractAcademicEvents(paperId: string): Promise<ExtractEventsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rl = checkRateLimit(user.id, "extract_academic", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: "Too many extraction requests. Please wait a moment and retry." };
  }

  // Verify the document belongs to the user and is an indexed academic doc.
  const { data: paper } = await supabase
    .from("papers")
    .select("id, title, academic_kind, academic_profile_id, parse_status, storage_path")
    .eq("id", paperId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!paper) return { ok: false, error: "Document not found" };
  if (!paper.academic_kind || !paper.academic_profile_id) {
    return { ok: false, error: "This document is not tagged as academic." };
  }
  if (paper.parse_status !== "ready" && paper.parse_status !== "partial") {
    return { ok: false, error: "Document is not indexed yet. Wait for parsing to finish." };
  }
  const profileId = paper.academic_profile_id as string;

  // Term season for the window guard.
  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("term")
    .eq("id", profileId)
    .maybeSingle();
  const season = detectTermSeason(profile?.term ?? null);

  // Source text = the document's chunk contents (already grounded text).
  const { data: chunkRows } = await supabase
    .from("paper_chunks")
    .select("content")
    .eq("paper_id", paperId)
    .eq("user_id", user.id)
    .order("chunk_index", { ascending: true });
  const sourceText = (chunkRows ?? []).map((c: { content: string }) => c.content).join("\n");
  if (!sourceText.trim()) {
    return { ok: false, error: "No indexed text found for this document." };
  }

  // Ensure an academic_sources row exists for this upload (Tier 4).
  const sourceId = await ensureUploadSource(supabase, user.id, profileId, paper);

  // --- Gather candidates ---
  const candidates: EventCandidate[] = [...lineScanCandidates(sourceText)];
  if (hasLLMProvider()) {
    try {
      const llmCands = await getLlmCandidates(sourceText);
      candidates.push(...llmCands);
    } catch {
      // LLM is best-effort augmentation; the grounded line-scan stands alone.
    }
  }

  // --- Validate every candidate (grounding is enforced here) ---
  const confidence = computeConfidence({ tier: MANUAL_UPLOAD_TIER, official: true });
  const status = statusForConfidence(confidence, true); // 0.6 → inferred

  const seen = new Set<string>();
  const concreteTypes = new Set<AcademicEventType>();
  let dropped = 0;
  const rows: Array<Record<string, unknown>> = [];

  for (const cand of candidates) {
    const outcome = validateExtractedEvent(cand, { sourceText, season, sourceTier: MANUAL_UPLOAD_TIER });
    if (!outcome.ok) {
      dropped++;
      continue;
    }
    const { eventType, startDate, endDate, sourceExcerpt } = outcome.event;
    const key = `${eventType}|${startDate}|${endDate ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    concreteTypes.add(eventType);

    rows.push({
      user_id: user.id,
      academic_profile_id: profileId,
      event_type: eventType,
      title: cand.label?.slice(0, 200) ?? null,
      start_date: startDate,
      end_date: endDate,
      confidence,
      status,
      is_confirmed: false,
      source_id: sourceId,
      source_excerpt: sourceExcerpt,
    });
  }

  // Re-run idempotency: clear this source's prior events before re-inserting.
  await supabase.from("academic_events").delete().eq("user_id", user.id).eq("source_id", sourceId);
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("academic_events").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  // Stale-year detection (Requirement 18.4): if every dated event predates the
  // current calendar year, flag the source stale so the sweeper can re-discover.
  const datedYears = rows
    .map((r) => (typeof r.start_date === "string" ? Number((r.start_date as string).slice(0, 4)) : NaN))
    .filter((y) => !Number.isNaN(y));
  if (datedYears.length > 0) {
    const isStale = datedYears.every((y) => y < new Date().getFullYear());
    await supabase
      .from("academic_sources")
      .update({ is_stale: isStale })
      .eq("id", sourceId)
      .eq("user_id", user.id);
  }

  // --- Expected-but-missing types → `unreleased` (NULL dates), never invented ---
  const { data: otherConcrete } = await supabase
    .from("academic_events")
    .select("event_type")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profileId)
    .neq("status", "unreleased");
  const covered = new Set<AcademicEventType>([
    ...concreteTypes,
    ...((otherConcrete ?? []) as { event_type: AcademicEventType }[]).map((r) => r.event_type),
  ]);

  const unreleasedRows = EXPECTED_TYPES.filter((t) => !covered.has(t)).map((t) => ({
    user_id: user.id,
    academic_profile_id: profileId,
    event_type: t,
    title: null,
    start_date: null,
    end_date: null,
    confidence: null,
    status: "unreleased" as const,
    is_confirmed: false,
    source_id: sourceId,
    source_excerpt: null,
  }));
  if (unreleasedRows.length > 0) {
    await supabase.from("academic_events").insert(unreleasedRows);
  }

  // Collection reached the review stage (Requirement 3.4).
  await supabase
    .from("academic_profiles")
    .update({ onboarding_status: "review", updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .eq("user_id", user.id);

  revalidatePath("/app/academic");
  revalidatePath("/app/planner");

  return {
    ok: true,
    counts: { kept: rows.length, dropped, unreleased: unreleasedRows.length },
  };
}

// --- Candidate generation ---

/**
 * Grounded line-scan: each returned candidate IS a verbatim source line, so it
 * cannot introduce an ungrounded date. Keeps only lines that classify to a
 * known event type and contain a parseable date.
 */
function lineScanCandidates(sourceText: string): EventCandidate[] {
  const out: EventCandidate[] = [];
  const lines = sourceText.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length < 6) continue;
    const type = classifyEventType(line);
    if (!type) continue;
    if (!parseDateRange(line)) continue;
    out.push({ eventType: type, label: line, sourceLine: line });
  }
  return out;
}

/** Strict LLM extraction — returns only candidate lines, validated downstream. */
async function getLlmCandidates(sourceText: string): Promise<EventCandidate[]> {
  const system =
    "You extract academic-calendar events from the provided source text. " +
    "STRICT RULES: (1) Only use dates that appear EXACTLY in the text. " +
    "(2) Never infer, compute, or guess a date. (3) For each event, copy the VERBATIM line " +
    "from the source that contains the date into `sourceLine`. " +
    "Return ONLY a JSON array of objects {\"eventType\": string, \"label\": string, \"sourceLine\": string}. " +
    "eventType must be one of: semester_start, semester_end, registration, add_drop, withdrawal_deadline, " +
    "midterm_period, final_period, makeup_period, holiday, break, other. " +
    "If you are unsure, still copy the exact source line. Output JSON only, no prose.";

  const content = await callLLM({
    system,
    user: sourceText.slice(0, MAX_SOURCE_CHARS),
    temperature: 0,
    maxTokens: 2048,
    groqTimeoutMs: LLM_TIMEOUT_MS,
    openRouterTimeoutMs: LLM_TIMEOUT_MS,
  });

  return parseLlmCandidates(content);
}

function parseLlmCandidates(content: string): EventCandidate[] {
  if (!content) return [];
  // Strip code fences and isolate the JSON array.
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
    .map((o) => ({
      eventType: typeof o.eventType === "string" ? o.eventType : null,
      label: typeof o.label === "string" ? o.label : null,
      sourceLine: typeof o.sourceLine === "string" ? o.sourceLine : "",
    }))
    .filter((c) => c.sourceLine.length > 0);
}

// --- Source row ---

async function ensureUploadSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profileId: string,
  paper: { id: string; title: string; storage_path: string | null }
): Promise<string> {
  const { data: existing } = await supabase
    .from("academic_sources")
    .select("id")
    .eq("user_id", userId)
    .eq("academic_profile_id", profileId)
    .eq("paper_id", paper.id)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: inserted } = await supabase
    .from("academic_sources")
    .insert({
      user_id: userId,
      academic_profile_id: profileId,
      paper_id: paper.id,
      title: paper.title,
      source_type: "other",
      source_tier: MANUAL_UPLOAD_TIER,
      is_official: false, // domain not verified; user-vouched upload
      confidence_base: computeConfidence({ tier: MANUAL_UPLOAD_TIER, official: true }),
      storage_path: paper.storage_path,
      fetched_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return inserted!.id;
}

// --- Curriculum extraction (Requirements 8.1, 8.2, 8.4, 8.5) ---

const COURSE_CODE_RE = /\b([A-Z]{2,5})\s?(\d{3})\b/;
const COURSE_CODE_RE_G = /\b([A-Z]{2,5})\s?(\d{3})\b/g;

export interface ExtractCurriculumResult {
  ok: boolean;
  error?: string;
  counts?: { kept: number; enrolledMatched: number };
}

/**
 * Extract curriculum courses (code + title) from an ingested curriculum/catalog
 * document via a grounded line-scan. Persists Curriculum_Course rows with the
 * source's tier-derived confidence/status, and matches the user's explicitly
 * entered course codes (marking them enrolled). Idempotent per source.
 */
export async function extractAcademicCurriculum(paperId: string): Promise<ExtractCurriculumResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: paper } = await supabase
    .from("papers")
    .select("id, academic_kind, academic_profile_id, parse_status")
    .eq("id", paperId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!paper) return { ok: false, error: "Document not found" };
  if (!paper.academic_profile_id) return { ok: false, error: "Not an academic document" };
  if (paper.parse_status !== "ready" && paper.parse_status !== "partial") {
    return { ok: false, error: "Document not indexed yet" };
  }
  const profileId = paper.academic_profile_id as string;

  // Source tier → confidence/status.
  const { data: source } = await supabase
    .from("academic_sources")
    .select("id, source_tier, is_official")
    .eq("user_id", user.id)
    .eq("paper_id", paperId)
    .maybeSingle();
  const tier = (source?.source_tier as number | null) ?? 3;
  const official = (source?.is_official as boolean | null) ?? true;
  const sourceId = (source?.id as string | null) ?? null;
  const confidence = computeConfidence({ tier, official });
  const status = statusForConfidence(confidence, true);

  const { data: chunkRows } = await supabase
    .from("paper_chunks")
    .select("content")
    .eq("paper_id", paperId)
    .eq("user_id", user.id)
    .order("chunk_index", { ascending: true });
  const sourceText = (chunkRows ?? []).map((c: { content: string }) => c.content).join("\n");
  if (!sourceText.trim()) return { ok: false, error: "No indexed text found" };

  // Grounded line-scan for "CODE 123  Title…".
  const found = new Map<string, { code: string; title: string | null }>();
  for (const rawLine of sourceText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = COURSE_CODE_RE.exec(line);
    if (!m) continue;
    const code = `${m[1]}${m[2]}`.toUpperCase();
    if (found.has(code)) continue;
    // Title = the line with course codes stripped, cleaned.
    const title = line.replace(COURSE_CODE_RE_G, " ").replace(/\s+/g, " ").trim();
    found.set(code, { code, title: title.length >= 3 ? title.slice(0, 200) : null });
    if (found.size >= 300) break;
  }

  // Existing user-entered enrolled codes (from onboarding) → match + enrich.
  const { data: enrolledRows } = await supabase
    .from("curriculum_courses")
    .select("id, course_code")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profileId)
    .eq("is_user_enrolled", true);
  const enrolledByCode = new Map<string, string>();
  for (const r of (enrolledRows ?? []) as { id: string; course_code: string | null }[]) {
    if (r.course_code) enrolledByCode.set(r.course_code.toUpperCase().replace(/\s+/g, ""), r.id);
  }

  // Idempotent: clear this source's previously-extracted (non-enrolled) rows.
  if (sourceId) {
    await supabase
      .from("curriculum_courses")
      .delete()
      .eq("user_id", user.id)
      .eq("source_id", sourceId)
      .eq("is_user_enrolled", false);
  }

  let enrolledMatched = 0;
  const inserts: Array<Record<string, unknown>> = [];

  for (const { code, title } of found.values()) {
    const enrolledRowId = enrolledByCode.get(code);
    if (enrolledRowId) {
      // Enrich the user's enrolled row with official title/source/confidence.
      enrolledMatched++;
      await supabase
        .from("curriculum_courses")
        .update({ title, source_id: sourceId, confidence, status })
        .eq("id", enrolledRowId)
        .eq("user_id", user.id);
    } else {
      inserts.push({
        user_id: user.id,
        academic_profile_id: profileId,
        course_code: code,
        title,
        is_user_enrolled: false,
        is_confirmed: false,
        source_id: sourceId,
        confidence,
        status,
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("curriculum_courses").insert(inserts);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/app/academic");
  return { ok: true, counts: { kept: inserts.length, enrolledMatched } };
}
