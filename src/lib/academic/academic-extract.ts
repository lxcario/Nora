/**
 * Grounded academic date extraction — pure helpers (Requirements 7.1–7.6).
 *
 * The hard rule of this feature: NEVER invent a date. These helpers only ever
 * turn text that is physically present in the source into a structured date.
 * The LLM (in the server action) returns a verbatim source line per candidate;
 * we (a) confirm that line exists in the source and (b) parse the date out of
 * that line ourselves, so an emitted date is grounded by construction.
 *
 * No side effects, no imports beyond shared types. Covered by property tests.
 */

import type { AcademicEventType } from "@/lib/supabase/database.types";

// --- ASCII/diacritic-insensitive lowercasing (Turkish-aware) ---
// Unlike the registry normalizer, this PRESERVES digits and date separators
// (. / -) so date parsing can run on the normalized string.
function asciiLower(input: string): string {
  return input
    .replace(/[İIı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o")
    .replace(/[Üü]/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// --- Month normalization (English + Turkish, incl. abbreviations) ---

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, ocak: 1,
  february: 2, feb: 2, subat: 2,
  march: 3, mar: 3, mart: 3,
  april: 4, apr: 4, nisan: 4,
  may: 5, mayis: 5,
  june: 6, jun: 6, haziran: 6,
  july: 7, jul: 7, temmuz: 7,
  august: 8, aug: 8, agustos: 8,
  september: 9, sept: 9, sep: 9, eylul: 9,
  october: 10, oct: 10, ekim: 10,
  november: 11, nov: 11, kasim: 11,
  december: 12, dec: 12, aralik: 12,
};

/** Map an English or Turkish month token to 1–12, or null. */
export function normalizeMonth(token: string): number | null {
  const t = asciiLower(token).replace(/\.$/, "").trim();
  return MONTHS[t] ?? null;
}

// Month alternation for date regexes — full names first so they win over
// abbreviations at the same position.
const MONTH_ALT =
  "january|february|march|april|may|june|july|august|september|october|november|december|" +
  "ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik|" +
  "jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec";

const SEP = "(?:–|—|-|to|ile)";

// --- Date validity ---

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
/** Build an ISO date string, or null if the (y,m,d) triple is not a real date. */
function makeISO(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export interface ParsedDateRange {
  startDate: string;
  endDate: string | null;
}

/**
 * Parse a single date or date-range out of one line of text. Returns null when
 * no valid, fully-specified (day+month+year) date is present — we never guess a
 * missing component. Turkish and English month names are supported, plus
 * numeric DMY (12.01.2026 / 12/01/2026) and ISO (2026-01-12) forms.
 */
export function parseDateRange(text: string): ParsedDateRange | null {
  const s = asciiLower(text);
  const M = MONTH_ALT;

  // Ordered most-specific-first. Each returns [startISO, endISO|null].
  // 1) "D Mon YYYY <sep> D Mon YYYY"
  let m = new RegExp(
    `(\\d{1,2})\\s+(${M})\\s+(\\d{4})\\s*${SEP}\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})`
  ).exec(s);
  if (m) {
    const a = makeISO(+m[3], normalizeMonth(m[2])!, +m[1]);
    const b = makeISO(+m[6], normalizeMonth(m[5])!, +m[4]);
    return orderedRange(a, b);
  }

  // 2) "D Mon <sep> D Mon YYYY" (shared year)
  m = new RegExp(
    `(\\d{1,2})\\s+(${M})\\s*${SEP}\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})`
  ).exec(s);
  if (m) {
    const y = +m[5];
    const a = makeISO(y, normalizeMonth(m[2])!, +m[1]);
    const b = makeISO(y, normalizeMonth(m[4])!, +m[3]);
    return orderedRange(a, b);
  }

  // 3) "D <sep> D Mon YYYY" (shared month + year)
  m = new RegExp(`(\\d{1,2})\\s*${SEP}\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})`).exec(s);
  if (m) {
    const y = +m[4];
    const mo = normalizeMonth(m[3])!;
    const a = makeISO(y, mo, +m[1]);
    const b = makeISO(y, mo, +m[2]);
    return orderedRange(a, b);
  }

  // 4) numeric DMY range "DD.MM.YYYY <sep> DD.MM.YYYY"
  m = new RegExp(
    `(\\d{1,2})[.\\/](\\d{1,2})[.\\/](\\d{4})\\s*${SEP}\\s*(\\d{1,2})[.\\/](\\d{1,2})[.\\/](\\d{4})`
  ).exec(s);
  if (m) {
    const a = makeISO(+m[3], +m[2], +m[1]);
    const b = makeISO(+m[6], +m[5], +m[4]);
    return orderedRange(a, b);
  }

  // 5) single "D Mon YYYY"
  m = new RegExp(`(\\d{1,2})\\s+(${M})\\s+(\\d{4})`).exec(s);
  if (m) {
    const a = makeISO(+m[3], normalizeMonth(m[2])!, +m[1]);
    return a ? { startDate: a, endDate: null } : null;
  }

  // 6) single ISO "YYYY-MM-DD"
  m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) {
    const a = makeISO(+m[1], +m[2], +m[3]);
    return a ? { startDate: a, endDate: null } : null;
  }

  // 7) single numeric DMY "DD.MM.YYYY" or "DD/MM/YYYY"
  m = /(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(s);
  if (m) {
    const a = makeISO(+m[3], +m[2], +m[1]);
    return a ? { startDate: a, endDate: null } : null;
  }

  return null;
}

function orderedRange(a: string | null, b: string | null): ParsedDateRange | null {
  if (!a || !b) return null;
  if (b < a) return null; // end before start ⇒ misparse, drop
  return { startDate: a, endDate: a === b ? null : b };
}

// --- Event-type classification (English + Turkish vocabulary) ---

const EVENT_KEYWORDS: { type: AcademicEventType; keywords: string[] }[] = [
  { type: "final_period", keywords: ["final exam", "final sinav", "final sinavlari", "yariyil sonu sinav", "final"] },
  { type: "makeup_period", keywords: ["butunleme", "make-up", "make up", "makeup", "resit", "mazeret sinav"] },
  { type: "midterm_period", keywords: ["midterm", "mid-term", "ara sinav", "arasinav", "vize"] },
  { type: "add_drop", keywords: ["add-drop", "add/drop", "add drop", "ekle-sil", "ekle sil", "ekle birak", "ders ekleme birakma", "ders ekleme"] },
  { type: "withdrawal_deadline", keywords: ["withdrawal", "withdraw", "dersten cekilme", "ders cekilme", "cekilme"] },
  { type: "registration", keywords: ["interactive registration", "course registration", "registration", "ders kayit", "kayit yenileme", "kayitlanma", "kayit"] },
  { type: "semester_start", keywords: ["first day of classes", "classes begin", "classes start", "start of classes", "derslerin baslamasi", "yariyil basi", "donem basi", "guz donemi", "bahar donemi"] },
  { type: "semester_end", keywords: ["last day of classes", "classes end", "end of classes", "derslerin sona ermesi", "derslerin bitisi", "yariyil sonu", "donem sonu"] },
  { type: "holiday", keywords: ["public holiday", "holiday", "resmi tatil", "bayram", "tatil"] },
  { type: "break", keywords: ["semester break", "winter break", "spring break", "ara tatil", "yariyil tatili"] },
];

/**
 * Classify a label/line into a canonical event type, or null if unknown.
 * Turkish and English vocabulary normalize to the same canonical types
 * (Requirement 7.2).
 */
export function classifyEventType(label: string): AcademicEventType | null {
  const t = asciiLower(label);
  for (const { type, keywords } of EVENT_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return type;
  }
  return null;
}

// --- Grounding ---

/**
 * True iff `candidate` (the verbatim source line the LLM returned) actually
 * occurs in the source text. Whitespace-collapsed and case-insensitive, but
 * otherwise verbatim. This is the gate that makes ungrounded dates impossible
 * (Requirement 7.1, 7.3).
 */
export function isGroundedInSource(sourceText: string, candidate: string): boolean {
  if (!sourceText || !candidate) return false;
  const needle = collapseWs(candidate).toLowerCase();
  if (needle.length < 4) return false;
  const hay = collapseWs(sourceText).toLowerCase();
  return hay.includes(needle);
}

// --- Term window ---

export type TermSeason = "fall" | "spring" | "summer";

/** Detect the season of a free-text term label ("Fall", "Güz", …). */
export function detectTermSeason(term: string | null | undefined): TermSeason | null {
  if (!term) return null;
  const t = asciiLower(term);
  if (t.includes("fall") || t.includes("autumn") || t.includes("guz")) return "fall";
  if (t.includes("spring") || t.includes("bahar")) return "spring";
  if (t.includes("summer") || t.includes("yaz")) return "summer";
  return null;
}

// Generous month windows (academic calendars overflow the strict season).
const TERM_WINDOWS: Record<TermSeason, number[]> = {
  fall: [9, 10, 11, 12, 1, 2],
  spring: [2, 3, 4, 5, 6, 7],
  summer: [6, 7, 8, 9],
};

/** Is an ISO date's month inside the plausible window for the given season? */
export function isWithinTermWindow(isoDate: string, season: TermSeason): boolean {
  const m = Number(isoDate.slice(5, 7));
  if (!m) return false;
  return TERM_WINDOWS[season].includes(m);
}

// --- High-level validation ---

export interface EventCandidate {
  /** The LLM's proposed event type (validated/overridden by classification). */
  eventType?: string | null;
  /** A human label for the event, used to classify when eventType is absent. */
  label?: string | null;
  /** The verbatim line from the source that contains the date. */
  sourceLine: string;
}

export interface ExtractionContext {
  sourceText: string;
  season: TermSeason | null;
  /** 1 (registrar) … 4 (syllabus); Tier-1 may override the term-window guard. */
  sourceTier: number | null;
}

export type DropReason = "ungrounded" | "unparseable_date" | "out_of_window";

export interface ValidatedEvent {
  eventType: AcademicEventType;
  startDate: string;
  endDate: string | null;
  sourceExcerpt: string;
}

export type ValidationOutcome =
  | { ok: true; event: ValidatedEvent }
  | { ok: false; reason: DropReason };

const VALID_EVENT_TYPES: ReadonlySet<string> = new Set<AcademicEventType>([
  "semester_start", "semester_end", "registration", "add_drop", "withdrawal_deadline",
  "midterm_period", "final_period", "makeup_period", "holiday", "break", "other",
]);

/**
 * Validate one LLM-proposed event against the source and term window.
 *
 * Drops (returns ok:false) when:
 *  - the source line is not present in the source text  → "ungrounded"
 *  - no valid date can be parsed from the source line   → "unparseable_date"
 *  - the date is outside the term window AND the source is not Tier-1
 *    → "out_of_window" (Requirement 7.6)
 *
 * The emitted date is always parsed from the grounded source line, so a date
 * absent from the source can never be produced (Requirement 7.1, 7.3).
 */
export function validateExtractedEvent(
  candidate: EventCandidate,
  ctx: ExtractionContext
): ValidationOutcome {
  if (!isGroundedInSource(ctx.sourceText, candidate.sourceLine)) {
    return { ok: false, reason: "ungrounded" };
  }

  const parsed = parseDateRange(candidate.sourceLine);
  if (!parsed) {
    return { ok: false, reason: "unparseable_date" };
  }

  // Term-window guard: out-of-window dates require a Tier-1 source.
  if (ctx.season && !isWithinTermWindow(parsed.startDate, ctx.season)) {
    if (ctx.sourceTier !== 1) {
      return { ok: false, reason: "out_of_window" };
    }
  }

  const proposed = candidate.eventType && VALID_EVENT_TYPES.has(candidate.eventType)
    ? (candidate.eventType as AcademicEventType)
    : null;
  const eventType: AcademicEventType =
    proposed ?? classifyEventType(candidate.label ?? candidate.sourceLine) ?? "other";

  return {
    ok: true,
    event: {
      eventType,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      sourceExcerpt: collapseWs(candidate.sourceLine).slice(0, 500),
    },
  };
}
