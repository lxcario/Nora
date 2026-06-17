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
 * Returns the full (tiny) university registry with faculties and programs
 * nested. Readable by any authenticated user (Requirement 2.1); returns an
 * empty list when the registry has not been seeded yet, so the wizard can
 * still fall back to free-text entry (Requirement 2.5).
 */
export async function getRegistry(): Promise<RegistryUniversityOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: unis } = await supabase
    .from("universities")
    .select("id, name, aliases, primary_domain")
    .order("name");

  if (!unis || unis.length === 0) return [];

  const uniIds = unis.map((u: { id: string }) => u.id);

  const [{ data: facs }, { data: progs }] = await Promise.all([
    supabase
      .from("faculties")
      .select("id, university_id, name, aliases")
      .in("university_id", uniIds),
    supabase
      .from("programs")
      .select("id, university_id, faculty_id, name, aliases")
      .in("university_id", uniIds),
  ]);

  type FacRow = { id: string; university_id: string; name: string; aliases: string[] | null };
  type ProgRow = {
    id: string;
    university_id: string;
    faculty_id: string | null;
    name: string;
    aliases: string[] | null;
  };

  const faculties = (facs ?? []) as FacRow[];
  const programs = (progs ?? []) as ProgRow[];

  return (unis as { id: string; name: string; aliases: string[] | null; primary_domain: string }[]).map(
    (u) => ({
      id: u.id,
      name: u.name,
      aliases: u.aliases ?? [],
      primaryDomain: u.primary_domain,
      faculties: faculties
        .filter((f) => f.university_id === u.id)
        .map((f) => ({
          id: f.id,
          name: f.name,
          aliases: f.aliases ?? [],
          programs: programs
            .filter((p) => p.faculty_id === f.id)
            .map((p) => ({ id: p.id, name: p.name, aliases: p.aliases ?? [] })),
        })),
    })
  );
}
