/**
 * Crossref academic search client.
 *
 * Crossref (https://www.crossref.org) provides DOI metadata for journal
 * articles, conference papers, and books. Passing `mailto` in the User-Agent
 * header enrolls the app in the "Polite Pool" for stable rate limits (Req 5.5).
 *
 * Server-only — never import from client components.
 */

import type { AcademicWork } from "./types";

const BASE_URL = "https://api.crossref.org";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 5;
const ABSTRACT_CHAR_LIMIT = 800;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse Crossref date parts [[year], [year, month], [year, month, day]]. */
function parseCrossrefYear(
  published: unknown
): number | null {
  const pub = published as { "date-parts"?: number[][] } | undefined;
  const parts = pub?.["date-parts"]?.[0];
  if (Array.isArray(parts) && typeof parts[0] === "number") return parts[0];
  return null;
}

function extractCrossrefAuthors(
  authors: unknown[] | null | undefined
): string[] {
  if (!Array.isArray(authors)) return [];
  return authors
    .slice(0, 5)
    .map((a) => {
      const auth = a as Record<string, unknown>;
      const given = auth.given as string | undefined;
      const family = auth.family as string | undefined;
      if (family && given) return `${given} ${family}`;
      if (family) return family;
      return (auth.name as string | undefined) ?? "";
    })
    .filter(Boolean);
}

function extractCrossrefAbstract(item: Record<string, unknown>): string | null {
  const raw = item.abstract as string | undefined;
  if (!raw) return null;
  // Strip JATS XML tags that Crossref sometimes includes.
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, ABSTRACT_CHAR_LIMIT);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search Crossref for works matching `query`.
 *
 * Uses the `query` (bibliographic) parameter for broad full-text matching.
 *
 * @param query   Research query.
 * @param options Optional overrides for limit and mailto.
 */
export async function searchCrossref(
  query: string,
  options: { limit?: number; mailto?: string } = {}
): Promise<AcademicWork[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const mailto =
    options.mailto ??
    process.env.ACADEMIC_API_MAILTO ??
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
    "";
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 20);

  const params = new URLSearchParams({
    query: trimmed,
    rows: String(limit),
    select: "DOI,title,author,published,URL,abstract,is-referenced-by-count,type",
  });
  if (mailto) params.set("mailto", mailto);

  const url = `${BASE_URL}/works?${params.toString()}`;

  // Crossref Polite Pool: include mailto in the User-Agent header.
  const userAgent = mailto
    ? `PixelStudyOS/1.0 (mailto:${mailto})`
    : "PixelStudyOS/1.0";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": userAgent },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`Crossref request failed (${res.status})`);
      return [];
    }

    const data = (await res.json()) as {
      message?: { items?: unknown[] };
    };

    return (data.message?.items ?? []).map((item) => {
      const w = item as Record<string, unknown>;
      const titleArr = w.title as string[] | undefined;
      const doi = (w.DOI as string | undefined) ?? null;
      return {
        title: Array.isArray(titleArr) ? (titleArr[0] ?? "Untitled") : "Untitled",
        authors: extractCrossrefAuthors(w.author as unknown[]),
        year: parseCrossrefYear(w.published),
        doi,
        url: typeof w.URL === "string" ? w.URL : doi ? `https://doi.org/${doi}` : null,
        oaPdfUrl: null, // enriched separately via Unpaywall
        abstract: extractCrossrefAbstract(w),
        citationCount:
          typeof w["is-referenced-by-count"] === "number"
            ? (w["is-referenced-by-count"] as number)
            : null,
        isOpenAccess: false, // Crossref doesn't reliably report OA status
        source: "crossref" as const,
      };
    });
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.warn("Crossref search error:", err.message);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
