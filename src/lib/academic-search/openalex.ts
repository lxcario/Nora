/**
 * OpenAlex academic search client.
 *
 * OpenAlex (https://openalex.org) is a fully open, CC0 catalog of scholarly
 * works. No API key is required; passing `mailto` enrolls the app in the
 * "Polite Pool" for higher rate limits (Req 5.5).
 *
 * Server-only — never import from client components.
 */

import type { AcademicWork } from "./types";

const BASE_URL = "https://api.openalex.org";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 8;

/** Max characters taken from the reconstructed abstract. */
const ABSTRACT_CHAR_LIMIT = 800;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * OpenAlex stores abstracts as an inverted index:
 *   { "word": [positions...], ... }
 * This reconstructs the abstract text.
 */
function reconstructAbstract(
  inverted: Record<string, number[]> | null | undefined
): string | null {
  if (!inverted || typeof inverted !== "object") return null;
  try {
    const pos: [number, string][] = [];
    for (const [word, positions] of Object.entries(inverted)) {
      for (const p of positions) {
        pos.push([p, word]);
      }
    }
    if (pos.length === 0) return null;
    pos.sort((a, b) => a[0] - b[0]);
    return pos
      .map(([, w]) => w)
      .join(" ")
      .slice(0, ABSTRACT_CHAR_LIMIT);
  } catch {
    return null;
  }
}

/** Extract the first author display name list (max 5). */
function extractAuthors(
  authorships: unknown[] | null | undefined
): string[] {
  if (!Array.isArray(authorships)) return [];
  return authorships
    .slice(0, 5)
    .map((a) => {
      const auth = a as Record<string, unknown>;
      const author = auth.author as Record<string, unknown> | undefined;
      return (author?.display_name as string | undefined) ?? "";
    })
    .filter(Boolean);
}

/** Pull DOI string, normalise to bare "10.XXXX/..." form. */
function normaliseDoi(doi: unknown): string | null {
  if (typeof doi !== "string" || !doi) return null;
  return doi.replace(/^https?:\/\/doi\.org\//i, "");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search OpenAlex for academic works matching `query`.
 *
 * @param query   Natural-language research query (min 3 chars).
 * @param options Optional overrides for limit and mailto.
 */
export async function searchOpenAlex(
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
    search: trimmed,
    per_page: String(limit),
    select: "id,title,authorships,publication_year,doi,open_access,abstract_inverted_index,cited_by_count,primary_location",
  });
  if (mailto) params.set("mailto", mailto);

  const url = `${BASE_URL}/works?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`OpenAlex request failed (${res.status})`);
      return [];
    }

    const data = (await res.json()) as {
      results?: unknown[];
    };

    return (data.results ?? []).map((item) => {
      const w = item as Record<string, unknown>;
      const oa = w.open_access as Record<string, unknown> | undefined;
      const loc = w.primary_location as Record<string, unknown> | undefined;
      const doi = normaliseDoi(w.doi);
      return {
        title: (w.display_name ?? w.title ?? "Untitled") as string,
        authors: extractAuthors(w.authorships as unknown[]),
        year: typeof w.publication_year === "number" ? w.publication_year : null,
        doi,
        url:
          typeof (loc?.landing_page_url) === "string"
            ? (loc!.landing_page_url as string)
            : doi
            ? `https://doi.org/${doi}`
            : null,
        oaPdfUrl:
          typeof (oa?.oa_url) === "string" ? (oa!.oa_url as string) : null,
        abstract: reconstructAbstract(
          w.abstract_inverted_index as Record<string, number[]> | null
        ),
        citationCount:
          typeof w.cited_by_count === "number" ? w.cited_by_count : null,
        isOpenAccess:
          typeof oa?.is_oa === "boolean" ? (oa.is_oa as boolean) : false,
        source: "openalex" as const,
      };
    });
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.warn("OpenAlex search error:", err.message);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
