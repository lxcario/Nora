/**
 * Semantic Scholar academic search client.
 *
 * Semantic Scholar (https://www.semanticscholar.org) provides rich metadata
 * including AI-generated TLDRs, citation intent, and reference graphs.
 * Free tier: 100 requests per 5 minutes (unauthenticated).
 * With API key: higher limits (1 req/sec sustained).
 *
 * Server-only — never import from client components.
 */

import type { AcademicWork } from "./types";

const BASE_URL = "https://api.semanticscholar.org/graph/v1";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 6;
const ABSTRACT_CHAR_LIMIT = 800;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractAuthors(authors: unknown[] | null | undefined): string[] {
  if (!Array.isArray(authors)) return [];
  return authors
    .slice(0, 5)
    .map((a) => {
      const auth = a as Record<string, unknown>;
      return (auth.name as string | undefined) ?? "";
    })
    .filter(Boolean);
}

function normaliseDoi(externalIds: unknown): string | null {
  if (!externalIds || typeof externalIds !== "object") return null;
  const ids = externalIds as Record<string, unknown>;
  const doi = ids.DOI as string | undefined;
  if (!doi) return null;
  return doi.replace(/^https?:\/\/doi\.org\//i, "");
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Extended result that includes the Semantic Scholar TLDR summary. */
export interface SemanticScholarWork extends AcademicWork {
  /** AI-generated one-sentence summary (TLDR). Null when not available. */
  tldr: string | null;
  /** Semantic Scholar paper ID (for follow-up lookups). */
  s2PaperId: string | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search Semantic Scholar for academic papers matching `query`.
 *
 * Uses the /paper/search endpoint with relevance ranking.
 * Returns titles, authors, abstracts, TLDRs, DOIs, and citation counts.
 *
 * @param query   Natural-language research query (min 3 chars).
 * @param options Optional overrides for limit and API key.
 */
export async function searchSemanticScholar(
  query: string,
  options: { limit?: number; apiKey?: string } = {}
): Promise<SemanticScholarWork[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 20);
  const apiKey =
    options.apiKey ?? process.env.SEMANTIC_SCHOLAR_API_KEY ?? "";

  const fields = [
    "paperId",
    "title",
    "authors",
    "year",
    "abstract",
    "tldr",
    "externalIds",
    "citationCount",
    "isOpenAccess",
    "openAccessPdf",
    "url",
  ].join(",");

  const params = new URLSearchParams({
    query: trimmed,
    limit: String(limit),
    fields,
  });

  const url = `${BASE_URL}/paper/search?${params.toString()}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (res.status === 429) {
      console.warn("Semantic Scholar rate limited (429)");
      return [];
    }
    if (!res.ok) {
      console.warn(`Semantic Scholar request failed (${res.status})`);
      return [];
    }

    const data = (await res.json()) as {
      data?: unknown[];
      total?: number;
    };

    return (data.data ?? []).map((item) => {
      const w = item as Record<string, unknown>;
      const doi = normaliseDoi(w.externalIds);
      const oaPdf = w.openAccessPdf as Record<string, unknown> | null;
      const tldrObj = w.tldr as Record<string, unknown> | null;

      return {
        title: (w.title as string | undefined) ?? "Untitled",
        authors: extractAuthors(w.authors as unknown[]),
        year: typeof w.year === "number" ? w.year : null,
        doi,
        url:
          (w.url as string | undefined) ??
          (doi ? `https://doi.org/${doi}` : null),
        oaPdfUrl:
          typeof oaPdf?.url === "string" ? (oaPdf.url as string) : null,
        abstract:
          typeof w.abstract === "string"
            ? (w.abstract as string).slice(0, ABSTRACT_CHAR_LIMIT)
            : null,
        citationCount:
          typeof w.citationCount === "number" ? w.citationCount : null,
        isOpenAccess: w.isOpenAccess === true,
        source: "openalex" as const, // mapped to the shared union for compatibility
        // Extended fields
        tldr:
          typeof tldrObj?.text === "string" ? (tldrObj.text as string) : null,
        s2PaperId:
          typeof w.paperId === "string" ? (w.paperId as string) : null,
      };
    });
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.warn("Semantic Scholar search error:", err.message);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
