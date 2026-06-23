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
 * Searches by name (ILIKE) and aliases (array overlap via `cs`).
 * Returns at most 8 results. Requires min 2-char query.
 */
export async function searchUniversities(
  query: string
): Promise<UniversitySearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();

  // Supabase ILIKE is case-insensitive. We search both name and aliases.
  // `.or()` combines name ILIKE with an array contains-text check on aliases.
  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from("universities")
    .select("id, name, aliases, primary_domain")
    .or(`name.ilike.${pattern},aliases.cs.{${q}}`)
    .order("name")
    .limit(8);

  if (error || !data) return [];

  return data.map(
    (u: { id: string; name: string; aliases: string[] | null; primary_domain: string }) => ({
      id: u.id,
      name: u.name,
      aliases: u.aliases ?? [],
      primaryDomain: u.primary_domain,
    })
  );
}
