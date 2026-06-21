/**
 * Tavily web search client.
 *
 * Tavily (https://tavily.com) provides AI-optimised web search with content
 * extraction in a single API call. Free tier: 1,000 credits/month.
 *
 * Each search call costs 1 credit. Returns search results with extracted page
 * content (not just snippets), making it ideal for grounding LLM synthesis.
 *
 * Requires TAVILY_API_KEY in environment variables.
 * Server-only — never import from client components.
 */

const TAVILY_URL = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESULTS = 5;
const CONTENT_CHAR_LIMIT = 2000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single web search result from Tavily. */
export interface TavilyResult {
  /** Page title. */
  title: string;
  /** Full URL of the page. */
  url: string;
  /** Extracted page content (longer than a snippet — up to ~2000 chars). */
  content: string;
  /** Short snippet/summary from the search index. */
  snippet: string;
  /** Relevance score (0–1) assigned by Tavily. */
  score: number;
  /** Domain of the source (e.g. "wikipedia.org"). */
  domain: string;
}

/** Options for the Tavily search call. */
export interface TavilySearchOptions {
  /** Maximum number of results (default 5, max 10). */
  maxResults?: number;
  /** Search depth: "basic" (faster, cheaper) or "advanced" (deeper extraction). */
  searchDepth?: "basic" | "advanced";
  /** Include content extraction in results (default true). */
  includeContent?: boolean;
  /** Restrict to specific domains (optional). */
  includeDomains?: string[];
  /** Exclude specific domains (optional). */
  excludeDomains?: string[];
  /** Request timeout in ms. */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true when Tavily is configured (API key is set).
 * UI can use this to show/hide web search features.
 */
export function hasTavilyKey(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

/**
 * Search the web via Tavily and return results with extracted content.
 *
 * Returns an empty array when:
 * - TAVILY_API_KEY is not configured (graceful degradation)
 * - The query is too short
 * - The request fails or times out
 *
 * @param query   Natural-language search query (min 3 chars).
 * @param options Optional search configuration.
 */
export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("Tavily search skipped: TAVILY_API_KEY is not set.");
    return [];
  }

  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const maxResults = Math.min(options.maxResults ?? DEFAULT_MAX_RESULTS, 10);
  const searchDepth = options.searchDepth ?? "basic";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const body: Record<string, unknown> = {
    api_key: apiKey,
    query: trimmed,
    max_results: maxResults,
    search_depth: searchDepth,
    include_answer: false,
    include_raw_content: false,
  };

  if (options.includeDomains?.length) {
    body.include_domains = options.includeDomains;
  }
  if (options.excludeDomains?.length) {
    body.exclude_domains = options.excludeDomains;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429) {
      console.warn("Tavily rate limited (429) — monthly quota may be exhausted.");
      return [];
    }
    if (res.status === 401) {
      console.warn("Tavily auth failed (401) — check TAVILY_API_KEY.");
      return [];
    }
    if (!res.ok) {
      console.warn(`Tavily request failed (${res.status})`);
      return [];
    }

    const data = (await res.json()) as {
      results?: unknown[];
    };

    return (data.results ?? []).map((item) => {
      const r = item as Record<string, unknown>;
      const url = (r.url as string | undefined) ?? "";
      let domain = "";
      try {
        domain = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        domain = "";
      }

      return {
        title: (r.title as string | undefined) ?? "Untitled",
        url,
        content: ((r.content as string | undefined) ?? "").slice(
          0,
          CONTENT_CHAR_LIMIT
        ),
        snippet:
          (r.snippet as string | undefined) ??
          ((r.content as string | undefined) ?? "").slice(0, 300),
        score: typeof r.score === "number" ? r.score : 0,
        domain,
      };
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("Tavily search timed out.");
    } else if (err instanceof Error) {
      console.warn("Tavily search error:", err.message);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
