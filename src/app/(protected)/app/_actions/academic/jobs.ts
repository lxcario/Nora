"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { claim, resolve, type WorkOutcome } from "@/lib/academic/job-state";
import type { Json, JobType, JobStatus, AcademicKind, AcademicSourceType } from "@/lib/supabase/database.types";
import {
  tierForSourceType,
  computeConfidence,
  isOfficialUrl,
  hostMatchesDomain,
} from "@/lib/academic/source-ranking";
import { getScrapeClient } from "@/lib/scrape-client";
import { extractAcademicEvents, extractAcademicCurriculum } from "./extract";
import { ingestAcademicUrl, ingestAcademicMarkdown } from "./ingest";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const STALE_RUNNING_MS = 2 * 60_000;

/** Map a discovered source type to the academic document kind used on ingest. */
function kindForSourceType(t: AcademicSourceType | string | null): AcademicKind {
  switch (t) {
    case "registrar_calendar":
      return "academic_calendar";
    case "dept_curriculum":
      return "curriculum";
    case "course_catalog":
      return "course_catalog";
    case "syllabus":
      return "syllabus";
    default:
      return "announcement";
  }
}

// --- Enqueue ---

export interface EnqueueSpec {
  jobType: JobType;
  payload?: Json;
  maxAttempts?: number;
  delayMs?: number;
}

async function insertJob(
  supabase: SupabaseClient,
  userId: string,
  profileId: string | null,
  spec: EnqueueSpec
): Promise<void> {
  await supabase.from("ingestion_jobs").insert({
    user_id: userId,
    academic_profile_id: profileId,
    job_type: spec.jobType,
    payload: spec.payload ?? {},
    max_attempts: spec.maxAttempts ?? 3,
    next_run_at: new Date(Date.now() + (spec.delayMs ?? 0)).toISOString(),
    status: "pending",
  });
}

/**
 * Public enqueue used by discovery start-up (Task 9) and onboarding. Verifies
 * auth and resolves the caller's academic profile.
 */
export async function enqueueAcademicJob(spec: EnqueueSpec): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  await insertJob(supabase, user.id, profile?.id ?? null, spec);
  revalidatePath("/app/academic");
  return { ok: true };
}

// --- Job handlers ---

interface JobRow {
  id: string;
  user_id: string;
  academic_profile_id: string | null;
  job_type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

interface HandlerResult {
  outcome: WorkOutcome;
  result?: Json;
  error?: string;
  followUps?: EnqueueSpec[];
}

interface JobContext {
  supabase: SupabaseClient;
  userId: string;
  profileId: string | null;
  payload: Record<string, unknown>;
  job: JobRow;
}

type Handler = (ctx: JobContext) => Promise<HandlerResult>;

/** extract_events: run grounded extraction over an already-ingested document. */
const handleExtractEvents: Handler = async (ctx) => {
  const paperId = typeof ctx.payload.paperId === "string" ? ctx.payload.paperId : null;
  if (!paperId) return { outcome: "skip", error: "no paperId in payload" };
  const res = await extractAcademicEvents(paperId);
  if (res.ok) return { outcome: "success", result: (res.counts ?? null) as Json };
  return { outcome: "transient_error", error: res.error };
};

/** extract_curriculum: extract courses from an ingested curriculum/catalog doc. */
const handleExtractCurriculum: Handler = async (ctx) => {
  const paperId = typeof ctx.payload.paperId === "string" ? ctx.payload.paperId : null;
  if (!paperId) return { outcome: "skip", error: "no paperId in payload" };
  const res = await extractAcademicCurriculum(paperId);
  if (res.ok) return { outcome: "success", result: (res.counts ?? null) as Json };
  return { outcome: "transient_error", error: res.error };
};

/**
 * discover_sources: registry-first (use the seeded official URLs), else a
 * locale-aware official-domain search ("akademik takvim" / "academic calendar").
 * Persists academic_sources and enqueues a fetch_source per candidate. When
 * nothing is found, falls back to manual upload (Requirement 4.1, 4.2, 4.4).
 */
const handleDiscoverSources: Handler = async (ctx) => {
  const { supabase, userId, profileId } = ctx;
  if (!profileId) return { outcome: "skip", error: "no profile" };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("university_id, program_id, university_name_raw")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return { outcome: "skip" };

  interface Candidate {
    url: string;
    type: AcademicSourceType;
    domain: string | null;
  }
  const candidates: Candidate[] = [];
  let primaryDomain: string | null = null;

  // Registry path — use the verified, seeded URLs directly (Requirement 4.1).
  if (profile.university_id) {
    const { data: uni } = await supabase
      .from("universities")
      .select("primary_domain, academic_calendar_url")
      .eq("id", profile.university_id)
      .maybeSingle();
    primaryDomain = (uni?.primary_domain as string | null) ?? null;
    if (uni?.academic_calendar_url) {
      candidates.push({ url: uni.academic_calendar_url, type: "registrar_calendar", domain: primaryDomain });
    }
    if (profile.program_id) {
      const { data: prog } = await supabase
        .from("programs")
        .select("curriculum_url, course_catalog_url")
        .eq("id", profile.program_id)
        .maybeSingle();
      if (prog?.curriculum_url) {
        candidates.push({ url: prog.curriculum_url, type: "dept_curriculum", domain: primaryDomain });
      } else if (prog?.course_catalog_url) {
        candidates.push({ url: prog.course_catalog_url, type: "course_catalog", domain: primaryDomain });
      }
    }
  }

  // Fallback path — locale-aware search scoped to the official domain (Req 4.2).
  const client = getScrapeClient();
  if (candidates.length === 0 && client.available && profile.university_name_raw) {
    const queries = [
      `${profile.university_name_raw} akademik takvim`,
      `${profile.university_name_raw} academic calendar`,
    ];
    for (const q of queries) {
      const res = await client.search(q, {
        limit: 5,
        allowedDomains: primaryDomain ? [primaryDomain] : undefined,
      });
      if (res.ok) {
        for (const hit of res.hits) {
          let host = "";
          try {
            host = new URL(hit.url).hostname;
          } catch {
            continue;
          }
          const looksOfficial = primaryDomain
            ? hostMatchesDomain(host, primaryDomain)
            : host.endsWith(".edu.tr");
          if (!looksOfficial) continue;
          if (!primaryDomain) primaryDomain = host.split(".").slice(-3).join(".");
          candidates.push({ url: hit.url, type: "registrar_calendar", domain: primaryDomain });
          break;
        }
      }
      if (candidates.length > 0) break;
    }
  }

  // Persist sources and enqueue fetch_source for each.
  const followUps: EnqueueSpec[] = [];
  for (const c of candidates) {
    const tier = tierForSourceType(c.type);
    const official = !!(c.domain && isOfficialUrl(c.url, c.domain));
    const { data: src } = await supabase
      .from("academic_sources")
      .insert({
        user_id: userId,
        academic_profile_id: profileId,
        url: c.url,
        domain: c.domain,
        source_type: c.type,
        source_tier: tier,
        is_official: official,
        confidence_base: computeConfidence({ tier, official }),
      })
      .select("id")
      .single();
    if (src?.id) followUps.push({ jobType: "fetch_source", payload: { sourceId: src.id } });
  }

  if (followUps.length === 0) {
    // No official source located → manual-upload fallback (Requirement 4.4).
    await supabase
      .from("academic_profiles")
      .update({ onboarding_status: "review", updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .eq("user_id", userId);
    return { outcome: "success", result: { found: 0 } as Json };
  }
  return { outcome: "success", result: { found: followUps.length } as Json, followUps };
};

/**
 * fetch_source: download a PDF (SSRF-guarded) or scrape an HTML page to
 * markdown, ingest it through the reused pipeline, link it to the source, and
 * enqueue the matching extraction. Protected/scanned/quota cases skip to the
 * manual-upload path rather than looping (Requirements 6.1, 6.4, 18.x).
 */
const handleFetchSource: Handler = async (ctx) => {
  const { supabase, userId } = ctx;
  const sourceId = typeof ctx.payload.sourceId === "string" ? ctx.payload.sourceId : null;
  if (!sourceId) return { outcome: "skip", error: "no sourceId" };

  const { data: source } = await supabase
    .from("academic_sources")
    .select("id, url, domain, source_type")
    .eq("id", sourceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!source?.url) return { outcome: "skip", error: "source has no url" };

  const kind = kindForSourceType(source.source_type as AcademicSourceType | null);
  const isPdf = /\.pdf($|\?)/i.test(source.url as string);
  let paperId: string | null = null;

  if (isPdf) {
    const res = await ingestAcademicUrl(source.url as string, kind);
    if (res.data?.scanned) {
      await supabase.from("academic_sources").update({ http_status: 415 }).eq("id", sourceId);
      return { outcome: "skip", error: "scanned PDF — manual upload needed" };
    }
    if (!res.data) return { outcome: "transient_error", error: res.error };
    paperId = res.data.paperId;
  } else {
    const client = getScrapeClient();
    if (!client.available) return { outcome: "skip", error: "no scrape provider" };
    const scrape = await client.scrape(source.url as string, {
      allowedDomains: source.domain ? [source.domain as string] : undefined,
    });
    if (!scrape.ok || !scrape.markdown) {
      // Network-ish failures retry; auth wall / quota / off-domain → manual.
      if (scrape.reason === "timeout" || scrape.reason === "http_error" || scrape.reason === "unknown") {
        return { outcome: "transient_error", error: scrape.error };
      }
      await supabase
        .from("academic_sources")
        .update({ http_status: scrape.httpStatus ?? null })
        .eq("id", sourceId);
      return { outcome: "skip", error: scrape.reason };
    }
    const res = await ingestAcademicMarkdown(scrape.markdown, {
      title: scrape.title ?? (source.url as string),
      url: source.url as string,
      kind,
    });
    if (!res.data) return { outcome: "transient_error", error: res.error };
    paperId = res.data.paperId;
  }

  await supabase
    .from("academic_sources")
    .update({ paper_id: paperId, fetched_at: new Date().toISOString() })
    .eq("id", sourceId);

  const followUps: EnqueueSpec[] =
    kind === "curriculum" || kind === "course_catalog"
      ? [{ jobType: "extract_curriculum", payload: { paperId } }]
      : [{ jobType: "extract_events", payload: { paperId } }];
  return { outcome: "success", followUps };
};

/** parse_document / embed_chunks are folded into fetch_source (one bounded unit). */
const handleSkip: Handler = async () => ({ outcome: "skip" });

const HANDLERS: Record<JobType, Handler> = {
  discover_sources: handleDiscoverSources,
  fetch_source: handleFetchSource,
  parse_document: handleSkip,
  embed_chunks: handleSkip,
  extract_curriculum: handleExtractCurriculum,
  extract_events: handleExtractEvents,
};

// --- Processor ---

export interface JobProgress {
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  skipped: number;
  /** True while there is still claimable/in-flight work. */
  active: boolean;
}

/**
 * Claim and run a single bounded unit of work, then enqueue any follow-ups
 * (Requirement 12.2). Designed to be called repeatedly by the client poller
 * and/or a pg_cron sweeper. Returns the current progress so the caller knows
 * whether to keep polling.
 */
export async function processNextJob(): Promise<{ progress: JobProgress; processedJobType?: JobType }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { progress: emptyProgress() };

  // Reclaim stale `running` jobs (interrupted runs) back to pending.
  const staleCutoff = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
  await supabase
    .from("ingestion_jobs")
    .update({ status: "pending", locked_at: null })
    .eq("user_id", user.id)
    .eq("status", "running")
    .lt("locked_at", staleCutoff);

  // Find the next runnable pending job.
  const nowIso = new Date().toISOString();
  const { data: candidate } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate) {
    return { progress: await readProgress(supabase, user.id) };
  }

  const job = candidate as JobRow;
  const claimT = claim({ status: job.status, attempts: job.attempts, maxAttempts: job.max_attempts });
  if (!claimT) {
    return { progress: await readProgress(supabase, user.id) };
  }

  // Conditional claim to avoid a double-run race (only succeeds if still pending).
  const { data: claimed } = await supabase
    .from("ingestion_jobs")
    .update({ status: "running", attempts: claimT.attempts, locked_at: nowIso })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    // Someone else claimed it; let the poller try again.
    return { progress: await readProgress(supabase, user.id) };
  }

  const runningJob: JobRow = { ...job, status: "running", attempts: claimT.attempts };

  // Run the handler (any throw becomes a transient error).
  let handlerResult: HandlerResult;
  try {
    const handler = HANDLERS[job.job_type] ?? handleSkip;
    handlerResult = await handler({
      supabase,
      userId: user.id,
      profileId: job.academic_profile_id,
      payload: job.payload ?? {},
      job: runningJob,
    });
  } catch (err) {
    handlerResult = {
      outcome: "transient_error",
      error: err instanceof Error ? err.message : "Handler threw",
    };
  }

  const transition = resolve(
    { status: "running", attempts: runningJob.attempts, maxAttempts: runningJob.max_attempts },
    handlerResult.outcome
  );

  await supabase
    .from("ingestion_jobs")
    .update({
      status: transition.status,
      attempts: transition.attempts,
      next_run_at: new Date(Date.now() + transition.nextRunDelayMs).toISOString(),
      locked_at: null,
      result: handlerResult.result ?? null,
      error: handlerResult.error?.slice(0, 1000) ?? null,
    })
    .eq("id", job.id)
    .eq("user_id", user.id);

  // Enqueue follow-ups only on success.
  if (transition.status === "succeeded" && handlerResult.followUps?.length) {
    for (const spec of handlerResult.followUps) {
      await insertJob(supabase, user.id, job.academic_profile_id, spec);
    }
  }

  revalidatePath("/app/academic");
  return { progress: await readProgress(supabase, user.id), processedJobType: job.job_type };
}

/** Current job counts for the user (Requirement 12.3 progress polling). */
export async function getJobProgress(): Promise<JobProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return emptyProgress();
  return readProgress(supabase, user.id);
}

async function readProgress(supabase: SupabaseClient, userId: string): Promise<JobProgress> {
  const { data } = await supabase
    .from("ingestion_jobs")
    .select("status")
    .eq("user_id", userId);

  const counts = emptyProgress();
  for (const r of (data ?? []) as { status: JobStatus }[]) {
    counts[r.status] += 1;
  }
  counts.active = counts.pending > 0 || counts.running > 0;
  return counts;
}

function emptyProgress(): JobProgress {
  return { pending: 0, running: 0, succeeded: 0, failed: 0, skipped: 0, active: false };
}

// --- Discovery notice (graceful fallback messaging, Requirements 18.1, 18.3, 18.4) ---

export interface DiscoveryNotice {
  message: string | null;
  tone: "info" | "warning";
}

/**
 * A short, user-facing notice when automatic discovery couldn't fully populate
 * the academic data — so the student knows to upload the official PDF instead.
 * Returns null while discovery is still in flight.
 */
export async function getDiscoveryNotice(): Promise<DiscoveryNotice> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: null, tone: "info" };

  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { message: null, tone: "info" };

  // Still working → no notice yet.
  const { data: active } = await supabase
    .from("ingestion_jobs")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "running"])
    .limit(1);
  if (active && active.length > 0) return { message: null, tone: "info" };

  const { data: sources } = await supabase
    .from("academic_sources")
    .select("paper_id, is_stale")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profile.id);
  const list = (sources ?? []) as { paper_id: string | null; is_stale: boolean }[];
  if (list.length === 0) return { message: null, tone: "info" };

  const unfetched = list.filter((s) => !s.paper_id);
  const stale = list.filter((s) => s.is_stale);

  if (unfetched.length === list.length) {
    return {
      message:
        "We couldn't automatically fetch your university's official pages (they may need a login, hit a quota, or aren't text-based). Upload the PDFs below — we only use real official documents.",
      tone: "warning",
    };
  }
  if (unfetched.length > 0) {
    return {
      message: "Some official sources couldn't be fetched automatically. You can upload them below.",
      tone: "warning",
    };
  }
  if (stale.length > 0) {
    return {
      message:
        "Your academic calendar may be from a previous year. Upload the current one if the dates look off.",
      tone: "warning",
    };
  }
  return { message: null, tone: "info" };
}
