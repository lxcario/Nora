/**
 * Shared types for the academic-search clients.
 *
 * AcademicWork is the common DTO returned by OpenAlex and Crossref.
 * UnpaywallResult carries open-access location data for a known DOI.
 */

/** A single academic work from OpenAlex or Crossref. */
export interface AcademicWork {
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  /** Landing page URL (publisher page, DOI redirect, etc.). */
  url: string | null;
  /** Direct open-access PDF URL discovered via Unpaywall (null until enriched). */
  oaPdfUrl: string | null;
  /** Short abstract or snippet for synthesis context. */
  abstract: string | null;
  citationCount: number | null;
  isOpenAccess: boolean;
  source: "openalex" | "crossref";
}

/** A single open-access location (from Unpaywall). */
export interface OALocation {
  /** Landing page for this OA copy. */
  url: string | null;
  /** Direct PDF download URL (null when not available). */
  urlForPdf: string | null;
  isBest: boolean;
  hostType: "publisher" | "repository" | null;
}

/** Unpaywall response for a single DOI. */
export interface UnpaywallResult {
  doi: string;
  title: string | null;
  isOa: boolean;
  bestOaLocation: OALocation | null;
}
