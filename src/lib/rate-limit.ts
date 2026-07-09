/**
 * Simple in-memory rate limiter for server actions.
 * Uses a sliding window approach per user ID.
 *
 * NOTE: This resets on server restart and doesn't work across
 * multiple server instances. For production at scale, use Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check if a user has exceeded their rate limit.
 *
 * @param userId - The user's ID (or any unique identifier)
 * @param action - The action name (combined with userId for the key)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 * @returns { allowed: boolean, retryAfterMs?: number }
 */
export function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs?: number } {
  cleanup(windowMs);

  const key = `${userId}:${action}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    // Calculate when the oldest request in the window will expire
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  // Allow the request
  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Pre-configured rate limit presets for common actions.
 */
export const RATE_LIMITS = {
  /** AI-powered evaluations (Feynman, research, RAG) — 10 per minute */
  ai_heavy: { maxRequests: 10, windowMs: 60_000 },
  /** Lighter AI calls (autocomplete, keyword extraction) — 30 per minute */
  ai_light: { maxRequests: 30, windowMs: 60_000 },
  /** Video search (YouTube API quota-sensitive) — 5 per minute */
  video_search: { maxRequests: 5, windowMs: 60_000 },
  /**
   * Reward/XP writes — generous for a real study session, but caps scripted
   * abuse of the atomic reward RPC. Best-effort per server instance (see the
   * honest caveat in SECURITY.md) — 60 per minute.
   */
  reward: { maxRequests: 60, windowMs: 60_000 },
} as const;
