/**
 * Unpaywall open-access lookup client.
 *
 * Unpaywall (https://unpaywall.org) provides open-access locations for known
 * DOIs. Passing `email` in every request is required by their terms of service
 * for API access (Req 5.5). No key is required for normal usage.
 *
 * Server-only — never import from client components.
 *
 * Note on SSRF: The `oaPdfUrl` from Unpaywall results is an EXTERNAL user-
 * visible URL that the app may download. Before downloading, callers MUST
 * validate it with `assertPublicHttpUrl` from `@/lib/ssrf`. This client
 * returns the URL string only — it does not fetch the PDF itself.
 */

import type { OALocation, UnpaywallResult } from "./types";

const BASE_URL = "https://api.unpaywall.org/v2";
const DEFAULT_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseOALocation(loc: unknown): OALocation | null {
  if (!loc || typeof loc !== "object") return null;
  const l = loc as Record<string, unknown>;
  return {
    url: typeof l.url === "string" ? l.url : null,
    urlForPdf: typeof l.url_for_pdf === "string" ? l.url_for_pdf : null,
    isBest: l.is_best === true,
    hostType:
      l.host_type === "publisher" || l.host_type === "repository"
        ? (l.host_type as "publisher" | "repository")
        : null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up open-access information for a single DOI.
 *
 * Returns `null` when the DOI is not found, the request fails, or `email`
 * is not configured (Req 8.5 graceful degradation).
 *
 * The returned `bestOaLocation.urlForPdf` should be validated with
 * `assertPublicHttpUrl` before the app downloads the PDF.
 *
 * @param doi     Bare DOI string, e.g. "10.1038/s41586-021-03819-2".
 * @param options Optional email override (falls back to env).
 */
export async function lookupUnpaywall(
  doi: string,
  options: { email?: string } = {}
): Promise<UnpaywallResult | null> {
  const trimmed = doi.trim();
  if (!trimmed || !trimmed.startsWith("10.")) return null;

  const email =
    options.email ??
    process.env.ACADEMIC_API_EMAIL ??
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
    "";

  if (!email) {
    // Unpaywall requires email; skip gracefully when not configured.
    console.warn("Unpaywall lookup skipped: ACADEMIC_API_EMAIL is not set.");
    return null;
  }

  const encodedDoi = encodeURIComponent(trimmed);
  const url = `${BASE_URL}/${encodedDoi}?email=${encodeURIComponent(email)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (res.status === 404) return null; // DOI not in Unpaywall database
    if (!res.ok) {
      console.warn(`Unpaywall request failed (${res.status}) for DOI ${trimmed}`);
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;

    return {
      doi: (data.doi as string | undefined) ?? trimmed,
      title: typeof data.title === "string" ? data.title : null,
      isOa: data.is_oa === true,
      bestOaLocation: parseOALocation(data.best_oa_location),
    };
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.warn(`Unpaywall lookup error for DOI ${trimmed}:`, err.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Enriches `AcademicWork` objects with OA PDF URLs from Unpaywall.
 * Works are processed concurrently (up to 5 at a time) to keep latency low.
 *
 * @param works  Works to enrich — only those with a non-null `doi` are queried.
 * @param email  Unpaywall email (falls back to env).
 */
export async function enrichWithUnpaywall<
  T extends { doi: string | null; oaPdfUrl: string | null; isOpenAccess: boolean }
>(works: T[], email?: string): Promise<T[]> {
  if (works.length === 0) return works;

  const CONCURRENCY = 5;
  const enriched = [...works];

  for (let i = 0; i < enriched.length; i += CONCURRENCY) {
    const batch = enriched.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (w, j) => {
        if (!w.doi) return;
        const result = await lookupUnpaywall(w.doi, { email });
        if (result?.bestOaLocation) {
          enriched[i + j] = {
            ...w,
            oaPdfUrl: result.bestOaLocation.urlForPdf ?? w.oaPdfUrl,
            isOpenAccess: result.isOa || w.isOpenAccess,
          };
        }
      })
    );
  }

  return enriched;
}
