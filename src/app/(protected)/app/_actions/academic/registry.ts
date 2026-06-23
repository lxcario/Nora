"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Registry options for the onboarding autocomplete. Carries the real DB UUIDs
 * so the wizard can persist registry foreign keys (Requirement 1.6, 2.4).
 */
export interface RegistryProgramOption {
  id: string;
  name: string;
  aliases: string[];
}
export interface RegistryFacultyOption {
  id: string;
  name: string;
  aliases: string[];
  programs: RegistryProgramOption[];
}
export interface RegistryUniversityOption {
  id: string;
  name: string;
  aliases: string[];
  primaryDomain: string;
  faculties: RegistryFacultyOption[];
}

/**
 * @deprecated Use `searchUniversities()` instead. This previously loaded the
 * entire registry on page load (7,000+ rows). Now returns an empty array.
 */
export async function getRegistry(): Promise<RegistryUniversityOption[]> {
  return [];
}

// ─── Lightweight search result (no nested faculties/programs) ────────────────

export interface UniversitySearchResult {
  id: string;
  name: string;
  aliases: string[];
  primaryDomain: string;
}

/**
 * Server-side university search for the onboarding autocomplete.
 * Uses a two-pass strategy: starts-with match first (most relevant), then
 * falls back to contains match if fewer than 3 results. Also checks aliases.
 * Returns at most 5 results. Requires min 2-char query.
 */
export async function searchUniversities(
  query: string
): Promise<UniversitySearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const MAX = 5;

  type Row = { id: string; name: string; aliases: string[] | null; primary_domain: string };
  function toResult(u: Row): UniversitySearchResult {
    return {
      id: u.id,
      name: u.name,
      aliases: u.aliases ?? [],
      primaryDomain: u.primary_domain,
    };
  }

  // Pass 1: starts-with match on name OR exact alias match
  const startsWithPattern = `${q}%`;
  const { data: primary } = await supabase
    .from("universities")
    .select("id, name, aliases, primary_domain")
    .or(`name.ilike.${startsWithPattern},aliases.cs.{${q}}`)
    .order("name")
    .limit(MAX);

  const results = (primary ?? []).map(toResult);

  // Pass 2: if we have < 3 results, backfill with contains match
  if (results.length < 3) {
    const containsPattern = `%${q}%`;
    const excludeIds = results.map((r) => r.id);
    const remaining = MAX - results.length;

    let builder = supabase
      .from("universities")
      .select("id, name, aliases, primary_domain")
      .ilike("name", containsPattern)
      .order("name")
      .limit(remaining);

    if (excludeIds.length > 0) {
      // Exclude already-found rows
      builder = builder.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: secondary } = await builder;
    if (secondary) {
      results.push(...secondary.map(toResult));
    }
  }

  return results;
}
