/**
 * Job state machine — pure helpers for the ingestion queue (Requirements
 * 12.2, 12.4, 12.6). No side effects; covered by property tests.
 *
 * Lifecycle:  pending → running → (succeeded | skipped | failed)
 *                          └─ transient error & attempts left → pending (backoff)
 *
 * `attempts` counts how many times a job has been claimed/run. A job may be
 * claimed only while pending with attempts < maxAttempts, so attempts can reach
 * but never exceed maxAttempts, and every job eventually reaches a terminal
 * state (success/skip, or failure once retries are exhausted).
 */

import type { JobStatus } from "@/lib/supabase/database.types";

export const TERMINAL_STATUSES: readonly JobStatus[] = ["succeeded", "failed", "skipped"];

export function isTerminal(status: JobStatus): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export interface JobLike {
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
}

/** Outcome of running one unit of work. */
export type WorkOutcome = "success" | "transient_error" | "fatal_error" | "skip";

export interface Transition {
  status: JobStatus;
  attempts: number;
  /** Delay before the job becomes runnable again (0 for terminal/immediate). */
  nextRunDelayMs: number;
}

// Exponential backoff with a cap. attempts is the number already made.
const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000; // 5 minutes

export function backoffMs(attempts: number): number {
  if (attempts <= 0) return BASE_BACKOFF_MS;
  const ms = BASE_BACKOFF_MS * 2 ** (attempts - 1);
  return Math.min(ms, MAX_BACKOFF_MS);
}

/** A job is claimable only when pending and it still has attempts remaining. */
export function isClaimable(job: JobLike): boolean {
  return job.status === "pending" && job.attempts < job.maxAttempts;
}

/**
 * Claim a pending job for execution: → running, attempts incremented.
 * Returns null if the job is not claimable (already terminal/running/exhausted).
 */
export function claim(job: JobLike): Transition | null {
  if (!isClaimable(job)) return null;
  return { status: "running", attempts: job.attempts + 1, nextRunDelayMs: 0 };
}

/**
 * Resolve a running job given the outcome of its work unit.
 *  - success      → succeeded
 *  - skip         → skipped
 *  - fatal_error  → failed (no retry)
 *  - transient    → pending with backoff if attempts remain, else failed
 */
export function resolve(job: JobLike, outcome: WorkOutcome): Transition {
  switch (outcome) {
    case "success":
      return { status: "succeeded", attempts: job.attempts, nextRunDelayMs: 0 };
    case "skip":
      return { status: "skipped", attempts: job.attempts, nextRunDelayMs: 0 };
    case "fatal_error":
      return { status: "failed", attempts: job.attempts, nextRunDelayMs: 0 };
    case "transient_error":
      if (job.attempts < job.maxAttempts) {
        return { status: "pending", attempts: job.attempts, nextRunDelayMs: backoffMs(job.attempts) };
      }
      return { status: "failed", attempts: job.attempts, nextRunDelayMs: 0 };
  }
}

/**
 * Treat a job as stale (lock leaked from an interrupted run) when it has been
 * `running` past the timeout. The sweeper/next claim can reclaim it.
 */
export function isStaleRunning(
  status: JobStatus,
  lockedAtMs: number | null,
  nowMs: number,
  staleAfterMs = 2 * 60_000
): boolean {
  if (status !== "running") return false;
  if (lockedAtMs == null) return true;
  return nowMs - lockedAtMs > staleAfterMs;
}
