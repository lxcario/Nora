/**
 * Tests for src/lib/rate-limit.ts
 *
 * Covers the in-memory sliding-window limiter and the `reward` preset added
 * for the reward RPC (Req 5). Each test uses a unique user key so the
 * module-level store doesn't leak state between cases.
 */

import { describe, it, expect } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks with a retry hint", () => {
    const user = `u-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(user, "t", 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(user, "t", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs ?? 0).toBeGreaterThan(0);
  });

  it("scopes the budget per user", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(checkRateLimit(a, "t", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(a, "t", 1, 60_000).allowed).toBe(false);
    // A different user is unaffected.
    expect(checkRateLimit(b, "t", 1, 60_000).allowed).toBe(true);
  });

  it("scopes the budget per action", () => {
    const u = `u-${Math.random()}`;
    expect(checkRateLimit(u, "act1", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(u, "act1", 1, 60_000).allowed).toBe(false);
    // A different action has its own budget.
    expect(checkRateLimit(u, "act2", 1, 60_000).allowed).toBe(true);
  });

  it("frees the budget once the window has passed", () => {
    const u = `u-${Math.random()}`;
    expect(checkRateLimit(u, "t", 1, 30).allowed).toBe(true);
    expect(checkRateLimit(u, "t", 1, 30).allowed).toBe(false);
    // Wait out the 30 ms window.
    const until = Date.now() + 45;
    while (Date.now() < until) {
      /* spin briefly */
    }
    expect(checkRateLimit(u, "t", 1, 30).allowed).toBe(true);
  });
});

describe("RATE_LIMITS.reward preset (Req 5)", () => {
  it("is defined with a positive per-minute cap", () => {
    expect(RATE_LIMITS.reward).toBeDefined();
    expect(RATE_LIMITS.reward.maxRequests).toBeGreaterThan(0);
    expect(RATE_LIMITS.reward.windowMs).toBe(60_000);
  });

  it("bounds abuse: the (max+1)-th reward call in the window is blocked", () => {
    const user = `reward-${Math.random()}`;
    const { maxRequests, windowMs } = RATE_LIMITS.reward;
    for (let i = 0; i < maxRequests; i++) {
      expect(checkRateLimit(user, "reward", maxRequests, windowMs).allowed).toBe(true);
    }
    expect(checkRateLimit(user, "reward", maxRequests, windowMs).allowed).toBe(false);
  });
});
