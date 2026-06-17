/**
 * Source ranking, confidence, and conflict resolution — pure helpers
 * (Requirements 5.2, 9.1–9.3, 10.1–10.3).
 *
 * A lightweight, transparent alternative to the spec's "Bayesian consensus
 * engine": tier the source, derive a confidence in 0..1, map confidence to a
 * Verified/Inferred/Unreleased status, and resolve conflicts by tier.
 *
 * No side effects, no imports beyond shared types. Covered by property tests.
 */

import type { AcademicSourceType, ConfidenceStatus } from "@/lib/supabase/database.types";

// --- Domain audit (Requirement 5.2) ---

/** True iff `host` is exactly `domain` or a subdomain of it. */
export function hostMatchesDomain(host: string, domain: string): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  const d = domain.trim().toLowerCase().replace(/^\.+|\.$/g, "");
  if (!h || !d) return false;
  return h === d || h.endsWith(`.${d}`);
}

/**
 * A source is "official" only when its host is on, or under, the institution's
 * primary domain. Anything else (or an unparseable URL) is not official.
 */
export function isOfficialUrl(url: string, primaryDomain: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return hostMatchesDomain(parsed.hostname, primaryDomain);
  } catch {
    return false;
  }
}

// --- Tiering (Requirement 9.1) ---

export const SOURCE_TYPE_TIER: Record<AcademicSourceType, number> = {
  registrar_calendar: 1,
  course_catalog: 1,
  faculty_page: 2,
  dept_curriculum: 3,
  announcement: 3,
  syllabus: 4,
  other: 4,
};

/** Map a source type to its tier (1 registrar … 4 syllabus/upload). */
export function tierForSourceType(type: AcademicSourceType | null | undefined): number {
  if (!type) return 4;
  return SOURCE_TYPE_TIER[type] ?? 4;
}

// --- Confidence (Requirement 9.2) ---

const TIER_BASE_CONFIDENCE: Record<number, number> = {
  1: 0.97,
  2: 0.85,
  3: 0.72,
  4: 0.6,
};

const NON_OFFICIAL_CONFIDENCE = 0.4; // below the 0.60 inferred floor → unreleased

export interface ConfidenceInput {
  tier: number;
  /** Host is on/under the institution's primary domain. */
  official: boolean;
  /** ≥2 independent official sources agree on this value. */
  corroborated?: boolean;
}

/**
 * Confidence in 0..1. Off-domain sources are pinned below the inferred floor.
 * Corroboration by independent official sources nudges a value toward verified.
 */
export function computeConfidence({ tier, official, corroborated }: ConfidenceInput): number {
  if (!official) return NON_OFFICIAL_CONFIDENCE;
  const base = TIER_BASE_CONFIDENCE[tier] ?? 0.6;
  const boosted = corroborated ? base + 0.1 : base;
  return clamp01(Number(boosted.toFixed(3)));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// --- Confidence → status (Requirement 9.3) ---

export const VERIFIED_THRESHOLD = 0.95;
export const INFERRED_THRESHOLD = 0.6;

/**
 * Map confidence to a status. When no official date exists at all, the event is
 * always `unreleased` (date stored as NULL) — we never guess.
 */
export function statusForConfidence(
  confidence: number | null,
  hasOfficialDate: boolean
): ConfidenceStatus {
  if (!hasOfficialDate || confidence == null) return "unreleased";
  if (confidence >= VERIFIED_THRESHOLD) return "verified";
  if (confidence >= INFERRED_THRESHOLD) return "inferred";
  return "unreleased";
}

/** Convenience: human-readable provenance label for a status + source. */
export function statusLabel(status: ConfidenceStatus, sourceHint?: string): string {
  switch (status) {
    case "verified":
      return sourceHint ? `Verified — ${sourceHint}` : "Verified";
    case "inferred":
      return sourceHint ? `Inferred — ${sourceHint}` : "Inferred";
    case "unreleased":
      return "Unreleased";
  }
}

// --- Conflict resolution (Requirements 10.1–10.3) ---

export interface RankedValue<T> {
  value: T;
  tier: number;
  /** Higher = more recent; used to break ties between equal tiers. */
  sourceYear?: number | null;
  /** True when this value is specific to a single course (a syllabus). */
  isCourseSpecific?: boolean;
  /** Opaque ref (e.g. source id) carried through for callers. */
  ref?: string;
}

export interface Resolution<T> {
  chosen: RankedValue<T>;
  /** The strongest losing candidate, retained for display (Requirement 10.4). */
  alternative?: RankedValue<T>;
}

/**
 * Resolve conflicting values for the same institution-wide event.
 * Highest tier (lowest number) wins; ties broken by the more recent source.
 * The runner-up is retained as an alternative.
 */
export function resolveInstitutionEvent<T>(candidates: RankedValue<T>[]): Resolution<T> | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort(compareAuthority);
  return { chosen: sorted[0], alternative: sorted[1] };
}

/**
 * Resolve a date for a SPECIFIC course. A course-specific syllabus value wins
 * over a general (department/registrar) value for that course only
 * (Requirement 10.2); otherwise authority ordering applies.
 */
export function resolveCourseDate<T>(candidates: RankedValue<T>[]): Resolution<T> | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    if (!!a.isCourseSpecific !== !!b.isCourseSpecific) {
      return a.isCourseSpecific ? -1 : 1; // course-specific first
    }
    return compareAuthority(a, b);
  });
  return { chosen: sorted[0], alternative: sorted[1] };
}

/** Lower tier number = more authoritative; tie → more recent source year. */
function compareAuthority<T>(a: RankedValue<T>, b: RankedValue<T>): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  const ay = a.sourceYear ?? -Infinity;
  const by = b.sourceYear ?? -Infinity;
  return by - ay;
}
