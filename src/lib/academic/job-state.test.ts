import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  isTerminal,
  isClaimable,
  claim,
  resolve,
  backoffMs,
  isStaleRunning,
  TERMINAL_STATUSES,
  type JobLike,
  type WorkOutcome,
} from "./job-state";

describe("terminal states", () => {
  it("recognizes terminal vs non-terminal", () => {
    expect(isTerminal("succeeded")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("skipped")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
    expect(isTerminal("running")).toBe(false);
  });
});

describe("claim / resolve", () => {
  it("claims a fresh pending job into running and increments attempts", () => {
    const t = claim({ status: "pending", attempts: 0, maxAttempts: 3 });
    expect(t).toEqual({ status: "running", attempts: 1, nextRunDelayMs: 0 });
  });
  it("refuses to claim exhausted or non-pending jobs", () => {
    expect(claim({ status: "pending", attempts: 3, maxAttempts: 3 })).toBeNull();
    expect(claim({ status: "running", attempts: 1, maxAttempts: 3 })).toBeNull();
    expect(claim({ status: "succeeded", attempts: 1, maxAttempts: 3 })).toBeNull();
  });
  it("maps outcomes to the right next status", () => {
    const running: JobLike = { status: "running", attempts: 1, maxAttempts: 3 };
    expect(resolve(running, "success").status).toBe("succeeded");
    expect(resolve(running, "skip").status).toBe("skipped");
    expect(resolve(running, "fatal_error").status).toBe("failed");
    expect(resolve(running, "transient_error").status).toBe("pending");
  });
  it("fails a transient error once attempts are exhausted", () => {
    const exhausted: JobLike = { status: "running", attempts: 3, maxAttempts: 3 };
    expect(resolve(exhausted, "transient_error").status).toBe("failed");
  });
});

describe("backoff", () => {
  it("is monotonic non-decreasing and capped", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (n) => {
        expect(backoffMs(n + 1)).toBeGreaterThanOrEqual(backoffMs(n));
        expect(backoffMs(n)).toBeLessThanOrEqual(5 * 60_000);
      })
    );
  });
});

describe("stale running detection", () => {
  it("treats a long-running lock (or missing lock) as stale", () => {
    const now = 1_000_000;
    expect(isStaleRunning("running", null, now)).toBe(true);
    expect(isStaleRunning("running", now - 10_000, now)).toBe(false);
    expect(isStaleRunning("running", now - 5 * 60_000, now)).toBe(true);
    expect(isStaleRunning("pending", null, now)).toBe(false);
  });
});

// Drive a job through the full machine with arbitrary outcomes.
function runToCompletion(
  maxAttempts: number,
  outcomes: WorkOutcome[]
): { status: string; attempts: number; steps: number } {
  let job: JobLike = { status: "pending", attempts: 0, maxAttempts };
  let i = 0;
  let steps = 0;
  const guard = (maxAttempts + 2) * 4; // generous loop guard

  while (!isTerminal(job.status) && steps < guard) {
    steps++;
    if (job.status === "pending") {
      const c = claim(job);
      if (!c) {
        // Not claimable while pending ⇒ exhausted; force-fail for the model.
        job = { ...job, status: "failed" };
        continue;
      }
      job = { ...job, status: c.status, attempts: c.attempts };
    } else if (job.status === "running") {
      const outcome = outcomes[i++ % outcomes.length] ?? "transient_error";
      const r = resolve(job, outcome);
      job = { ...job, status: r.status, attempts: r.attempts };
    }
  }
  return { status: job.status, attempts: job.attempts, steps };
}

describe("state machine properties (Requirements 12.4, 12.6)", () => {
  it("property: every job eventually reaches a terminal status", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.constantFrom<WorkOutcome>("success", "transient_error", "fatal_error", "skip"), {
          minLength: 1,
          maxLength: 12,
        }),
        (maxAttempts, outcomes) => {
          const result = runToCompletion(maxAttempts, outcomes);
          expect(TERMINAL_STATUSES.includes(result.status as never)).toBe(true);
        }
      )
    );
  });

  it("property: attempts never exceed maxAttempts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.constantFrom<WorkOutcome>("transient_error"), { minLength: 1, maxLength: 20 }),
        (maxAttempts, outcomes) => {
          const result = runToCompletion(maxAttempts, outcomes);
          expect(result.attempts).toBeLessThanOrEqual(maxAttempts);
          // All-transient outcomes must end in failure after exhausting retries.
          expect(result.status).toBe("failed");
          expect(result.attempts).toBe(maxAttempts);
        }
      )
    );
  });
});
