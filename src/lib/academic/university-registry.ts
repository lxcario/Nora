/**
 * University Registry — pure matching helpers + launch seed data.
 *
 * No side effects, no imports. Used by the onboarding autocomplete
 * (Requirement 2.3) and mirrored by the SQL seed in
 * `supabase/seed_university_registry.sql`.
 *
 * Matching is diacritic-insensitive and alias-aware so that
 * "Orta Doğu", "ODTÜ", and "METU" all resolve to one university.
 */

// --- Types (mirror the registry tables, camelCase) ---

export interface RegistryProgram {
  name: string;
  aliases: string[];
  degreeLevel?: string;
  curriculumUrl?: string;
  courseCatalogUrl?: string;
  language?: string;
}

export interface RegistryFaculty {
  name: string;
  aliases: string[];
  url?: string;
  programs: RegistryProgram[];
}

export interface RegistryUniversity {
  name: string;
  aliases: string[];
  country: string;
  primaryDomain: string;
  registrarUrl?: string;
  academicCalendarUrl?: string;
  timezone: string;
  locale: string;
  verified: boolean;
  faculties: RegistryFaculty[];
}

/** Anything with a primary name and optional aliases can be fuzzy-matched. */
export interface MatchableEntity {
  name: string;
  aliases?: string[] | null;
}

export interface EntityMatch<T> {
  entity: T;
  /** 1.0 = exact name/alias, 0.85 = prefix, 0.7 = substring. */
  score: number;
  matchedOn: string;
}

// --- Normalization ---

/**
 * Normalize a string for diacritic-insensitive, case-insensitive matching.
 *
 * Handles Turkish letters explicitly (ı/İ/ş/ğ/ç/ö/ü) before the generic
 * Unicode NFD diacritic strip, because the dotless ı (U+0131) does not
 * decompose and `toLowerCase()` on İ is locale-dependent.
 */
export function normalizeForMatch(input: string): string {
  if (!input) return "";
  return input
    .replace(/[İIı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o")
    .replace(/[Üü]/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip remaining combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // punctuation/whitespace → single space
    .trim();
}

/**
 * Score a single candidate string against an already-normalized query.
 * Returns 0 when there is no useful relationship.
 */
function scoreCandidate(normalizedQuery: string, candidate: string): number {
  const nc = normalizeForMatch(candidate);
  if (!nc || !normalizedQuery) return 0;
  if (nc === normalizedQuery) return 1;
  // Prefix match in either direction ("Orta Doğu" ⊂ "Orta Doğu Teknik …").
  if (nc.startsWith(normalizedQuery) || normalizedQuery.startsWith(nc)) return 0.85;
  // Substring match anywhere.
  if (nc.includes(normalizedQuery) || normalizedQuery.includes(nc)) return 0.7;
  return 0;
}

/**
 * Fuzzy-match a free-text query against a list of entities with names + aliases.
 * Returns matches sorted by descending score (best first). Pure.
 */
export function matchEntities<T extends MatchableEntity>(
  query: string,
  entities: T[]
): EntityMatch<T>[] {
  const q = normalizeForMatch(query);
  if (!q) return [];

  const matches: EntityMatch<T>[] = [];
  for (const entity of entities) {
    const candidates = [entity.name, ...(entity.aliases ?? [])];
    let best = 0;
    let matchedOn = "";
    for (const candidate of candidates) {
      const score = scoreCandidate(q, candidate);
      if (score > best) {
        best = score;
        matchedOn = candidate;
      }
    }
    if (best > 0) {
      matches.push({ entity, score: best, matchedOn });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/** Convenience wrapper for the launch seed (or any RegistryUniversity[]). */
export function matchUniversity(
  query: string,
  universities: RegistryUniversity[] = SEED_UNIVERSITIES
): EntityMatch<RegistryUniversity>[] {
  return matchEntities(query, universities);
}

// --- Launch seed data ---
//
// VERIFIED against official metu.edu.tr sources (June 2026). The exact
// academic-calendar / curriculum deep-links are the discovery entry points;
// the SQL mirror lives in supabase/seed_university_registry.sql.

export const SEED_UNIVERSITIES: RegistryUniversity[] = [
  {
    name: "Middle East Technical University",
    aliases: [
      "METU",
      "ODTÜ",
      "ODTU",
      "Orta Doğu Teknik Üniversitesi",
      "Orta Dogu Teknik Universitesi",
      "Orta Doğu",
      "Middle East Technical University (METU)",
    ],
    country: "Turkey",
    primaryDomain: "metu.edu.tr",
    registrarUrl: "https://oidb.metu.edu.tr/en",
    academicCalendarUrl: "https://oidb.metu.edu.tr/en/academic-calendar",
    timezone: "Europe/Istanbul",
    locale: "tr-TR",
    verified: true,
    faculties: [
      {
        name: "Faculty of Engineering",
        aliases: ["Mühendislik Fakültesi", "Muhendislik Fakultesi", "Engineering"],
        url: "https://eng.metu.edu.tr/",
        programs: [
          {
            name: "Electrical and Electronics Engineering",
            aliases: [
              "EEE",
              "EE",
              "Elektrik-Elektronik Mühendisliği",
              "Elektrik Elektronik Muhendisligi",
              "Electrical & Electronics Engineering",
              "Electrical-Electronics Engineering",
            ],
            degreeLevel: "undergraduate",
            curriculumUrl: "https://catalog2.metu.edu.tr/",
            courseCatalogUrl: "https://catalog2.metu.edu.tr/",
            language: "en",
          },
        ],
      },
    ],
  },
];
