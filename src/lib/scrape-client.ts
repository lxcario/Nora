/**
 * Provider-agnostic search/scrape client for academic source discovery.
 *
 * SERVER-ONLY. Used by the discovery job handlers (never the browser).
 *
 * Safety (Requirement 5.x):
 *  - Every target URL is validated with `assertPublicHttpUrl` (lib/ssrf.ts)
 *    before we ask a provider to fetch it — private/loopback/link-local/
 *    metadata addresses are rejected.
 *  - A per-university domain allowlist restricts scraping/search to the
 *    institution's own primary domain (and subdomains).
 *  - Fetched content is returned as DATA. Callers must treat it as untrusted
 *    and MUST NOT follow any instructions embedded in it.
 *  - Per-request timeouts; never sends user data/secrets beyond the query.
 *  - With no provider key configured, the "manual" client no-ops so onboarding
 *    falls back to manual upload rather than failing.
 */

import { assertPublicHttpUrl } from "@/lib/ssrf";
import { hostMatchesDomain } from "@/lib/academic/source-ranking";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_MARKDOWN_CHARS = 200_000;

export type ScrapeFailureReason =
  | "no_provider"
  | "ssrf_blocked"
  | "off_domain"
  | "http_error"
  | "timeout"
  | "quota"
  | "auth_wall"
  | "unknown";

export interface ScrapeResult {
  ok: boolean;
  url: string;
  markdown?: string;
  title?: string;
  httpStatus?: number;
  error?: string;
  reason?: ScrapeFailureReason;
}

export interface SearchHit {
  url: string;
  title?: string;
  snippet?: string;
}

export interface SearchResult {
  ok: boolean;
  hits: SearchHit[];
  error?: string;
  reason?: ScrapeFailureReason;
}

export interface ScrapeOptions {
  /** Restrict to these primary domains (and subdomains). */
  allowedDomains?: string[];
}
export interface SearchOptions {
  allowedDomains?: string[];
  limit?: number;
}

export interface ScrapeClient {
  readonly provider: "firecrawl" | "manual";
  readonly available: boolean;
  search(query: string, opts?: SearchOptions): Promise<SearchResult>;
  scrape(url: string, opts?: ScrapeOptions): Promise<ScrapeResult>;
}

/** Pick the configured client. Firecrawl when a key is set, else the no-op. */
export function getScrapeClient(): ScrapeClient {
  const key = process.env.FIRECRAWL_API_KEY;
  if (key && key.trim()) return new FirecrawlClient(key.trim());
  return new ManualClient();
}

// --- Shared guards ---

function urlAllowedByDomains(url: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return allowedDomains.some((d) => hostMatchesDomain(host, d));
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
}

/** Map an HTTP status to a failure reason (quota/auth/other). */
function reasonForStatus(status: number): ScrapeFailureReason {
  if (status === 402 || status === 429) return "quota";
  if (status === 401 || status === 403) return "auth_wall";
  return "http_error";
}

// --- Manual (no provider) ---

class ManualClient implements ScrapeClient {
  readonly provider = "manual" as const;
  readonly available = false;

  async search(): Promise<SearchResult> {
    return { ok: false, hits: [], reason: "no_provider", error: "No scrape provider configured" };
  }
  async scrape(url: string): Promise<ScrapeResult> {
    return { ok: false, url, reason: "no_provider", error: "No scrape provider configured" };
  }
}

// --- Firecrawl ---

class FirecrawlClient implements ScrapeClient {
  readonly provider = "firecrawl" as const;
  readonly available = true;
  constructor(private readonly apiKey: string) {}

  private async post(path: string, body: unknown): Promise<{ status: number; json: unknown } | { error: ScrapeFailureReason; message: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: reasonForStatus(res.status), message: `Firecrawl ${res.status}` };
      }
      return { status: res.status, json };
    } catch (err) {
      if (isAbortError(err)) return { error: "timeout", message: "Firecrawl request timed out" };
      return { error: "unknown", message: err instanceof Error ? err.message : "Network error" };
    } finally {
      clearTimeout(timeout);
    }
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult> {
    const limit = Math.min(Math.max(opts.limit ?? 6, 1), 10);
    // Scope the query to the official domain when we have one.
    const scoped =
      opts.allowedDomains && opts.allowedDomains.length > 0
        ? `${query} ${opts.allowedDomains.map((d) => `site:${d}`).join(" OR ")}`
        : query;

    const resp = await this.post("/search", { query: scoped, limit });
    if ("error" in resp) return { ok: false, hits: [], reason: resp.error, error: resp.message };

    const data = extractArray(resp.json);
    const hits: SearchHit[] = [];
    for (const item of data) {
      const url = typeof item.url === "string" ? item.url : "";
      if (!url) continue;
      // Defense-in-depth: enforce the allowlist on every returned hit.
      if (!urlAllowedByDomains(url, opts.allowedDomains)) continue;
      hits.push({
        url,
        title: typeof item.title === "string" ? item.title : undefined,
        snippet:
          typeof item.description === "string"
            ? item.description
            : typeof item.snippet === "string"
            ? item.snippet
            : undefined,
      });
    }
    return { ok: true, hits };
  }

  async scrape(url: string, opts: ScrapeOptions = {}): Promise<ScrapeResult> {
    // 1) Domain allowlist (official sources only).
    if (!urlAllowedByDomains(url, opts.allowedDomains)) {
      return { ok: false, url, reason: "off_domain", error: "URL is outside the allowed domain" };
    }
    // 2) SSRF guard before any outbound fetch of this URL.
    const ssrf = await assertPublicHttpUrl(url);
    if (!ssrf.ok) {
      return { ok: false, url, reason: "ssrf_blocked", error: ssrf.error ?? "URL blocked" };
    }

    const resp = await this.post("/scrape", { url, formats: ["markdown"], onlyMainContent: true });
    if ("error" in resp) return { ok: false, url, reason: resp.error, error: resp.message };

    const data = asRecord(asRecord(resp.json).data);
    const metadata = asRecord(data.metadata);
    const httpStatus = typeof metadata.statusCode === "number" ? metadata.statusCode : undefined;

    if (httpStatus && (httpStatus === 401 || httpStatus === 403)) {
      return { ok: false, url, httpStatus, reason: "auth_wall", error: "Login/permission wall" };
    }

    const markdown = typeof data.markdown === "string" ? data.markdown.slice(0, MAX_MARKDOWN_CHARS) : "";
    if (!markdown.trim()) {
      return { ok: false, url, httpStatus, reason: "http_error", error: "No content extracted" };
    }

    return {
      ok: true,
      url,
      markdown,
      title: typeof metadata.title === "string" ? metadata.title : undefined,
      httpStatus,
    };
  }
}

// --- JSON shape helpers (provider responses are untyped) ---

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function extractArray(json: unknown): Record<string, unknown>[] {
  const root = asRecord(json);
  const candidate = Array.isArray(root.data)
    ? root.data
    : Array.isArray((asRecord(root.data) as { web?: unknown }).web)
    ? (asRecord(root.data) as { web: unknown[] }).web
    : Array.isArray(root.results)
    ? root.results
    : [];
  return (candidate as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
}
