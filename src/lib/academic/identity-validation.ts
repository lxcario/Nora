/**
 * Pure onboarding identity validation helpers (Requirements 1.5, 2.3).
 *
 * No side effects, no imports beyond shared types. Used by the
 * `saveAcademicIdentity` server action and covered by property tests.
 */

import type { TermKind } from "@/lib/supabase/database.types";

// --- Constants ---
export const MIN_YEAR_OF_STUDY = 1;
export const MAX_YEAR_OF_STUDY = 8; // matches the DB CHECK (1..8)
export const VALID_TERM_KINDS: readonly TermKind[] = [
  "semester",
  "quarter",
  "block",
  "trimester",
] as const;

const MAX_NAME_LENGTH = 200;
const MAX_TERM_LENGTH = 60;

// --- Types ---

export interface IdentityInput {
  /** Registry UUID, when the user picked a known institution. */
  universityId?: string | null;
  /** Raw free-text fallback (Requirement 1.6, 2.5). */
  universityNameRaw?: string | null;
  facultyId?: string | null;
  facultyNameRaw?: string | null;
  programId?: string | null;
  programNameRaw?: string | null;
  yearOfStudy?: number | string | null;
  term?: string | null;
  termKind?: string | null;
}

export interface NormalizedIdentity {
  universityId: string | null;
  universityNameRaw: string | null;
  facultyId: string | null;
  facultyNameRaw: string | null;
  programId: string | null;
  programNameRaw: string | null;
  yearOfStudy: number;
  term: string;
  termKind: TermKind;
}

export interface IdentityValidationResult {
  valid: boolean;
  /** Field-level messages keyed by field name (Requirement 1.5). */
  errors: Record<string, string>;
  /** Present only when `valid` is true. */
  value?: NormalizedIdentity;
}

// --- Helpers ---

/**
 * Trim and collapse internal whitespace. Returns null for empty input so
 * callers can store NULL rather than an empty string. Preserves case and
 * diacritics (this is a display value, not a match key).
 */
export function normalizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_NAME_LENGTH);
}

function normalizeId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceYear(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isInteger(input) ? input : null;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return parseInt(trimmed, 10);
  }
  return null;
}

/**
 * Validate the onboarding identity. Accepted iff a university is provided
 * (registry id OR raw text), the year is an integer within bounds, and a
 * term is present. termKind defaults to 'semester' when omitted.
 */
export function validateIdentity(input: IdentityInput): IdentityValidationResult {
  const errors: Record<string, string> = {};

  const universityId = normalizeId(input.universityId);
  const universityNameRaw = normalizeName(input.universityNameRaw);
  if (!universityId && !universityNameRaw) {
    errors.university = "Please select or enter your university.";
  }

  const year = coerceYear(input.yearOfStudy);
  if (year === null) {
    errors.yearOfStudy = "Please enter your year of study.";
  } else if (year < MIN_YEAR_OF_STUDY || year > MAX_YEAR_OF_STUDY) {
    errors.yearOfStudy = `Year of study must be between ${MIN_YEAR_OF_STUDY} and ${MAX_YEAR_OF_STUDY}.`;
  }

  const term = normalizeName(input.term);
  if (!term) {
    errors.term = "Please choose your current term.";
  } else if (term.length > MAX_TERM_LENGTH) {
    errors.term = `Term must be at most ${MAX_TERM_LENGTH} characters.`;
  }

  let termKind: TermKind = "semester";
  if (input.termKind != null && input.termKind !== "") {
    if (VALID_TERM_KINDS.includes(input.termKind as TermKind)) {
      termKind = input.termKind as TermKind;
    } else {
      errors.termKind = "Unsupported term structure.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    value: {
      universityId,
      universityNameRaw,
      facultyId: normalizeId(input.facultyId),
      facultyNameRaw: normalizeName(input.facultyNameRaw),
      programId: normalizeId(input.programId),
      programNameRaw: normalizeName(input.programNameRaw),
      yearOfStudy: year as number,
      term: term as string,
      termKind,
    },
  };
}
