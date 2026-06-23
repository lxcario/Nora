/**
 * scripts/seed-universities.ts
 *
 * One-time seed script that fetches university data from the Hipo Universities
 * API and inserts it into the Supabase `universities` table.
 *
 * Usage:
 *   npx tsx scripts/seed-universities.ts
 *
 * Required env vars (set in .env.local or export before running):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The service role key is required because the universities table has no
 * user-write RLS policies — only the service role can insert.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Load .env.local (simple parser, no external deps) ──────────────────────

function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Don't overwrite existing env vars
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local may not exist — rely on exported env vars
  }
}

loadEnvFile(resolve(__dirname, "../.env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "   Set them in .env.local or export them before running this script."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface HipoUniversity {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  alpha_two_code: string;
  "state-province": string | null;
}

interface UniversityRow {
  name: string;
  aliases: string[];
  primary_domain: string;
  country: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const COUNTRIES: { query: string; limit: number }[] = [
  { query: "turkiye", limit: Infinity }, // ALL Turkish universities (API uses "Turkiye")
  { query: "azerbaijan", limit: Infinity }, // ALL Azerbaijan universities
  { query: "united+states", limit: 200 },
  { query: "united+kingdom", limit: 200 },
  { query: "germany", limit: 200 },
  { query: "canada", limit: 200 },
  { query: "netherlands", limit: 200 },
  { query: "australia", limit: 200 },
  { query: "france", limit: 200 },
];

const BASE_URL = "http://universities.hipolabs.com/search";

// ─── Common abbreviation map (best-effort) ──────────────────────────────────

const KNOWN_ALIASES: Record<string, string[]> = {
  "Middle East Technical University": ["METU", "ODTÜ"],
  "Istanbul Technical University": ["ITU", "İTÜ"],
  "Bogazici University": ["Boğaziçi"],
  "Boğaziçi University": ["Bogazici"],
  "Hacettepe University": ["Hacettepe Üniversitesi"],
  "Massachusetts Institute of Technology": ["MIT"],
  "California Institute of Technology": ["Caltech"],
  "Stanford University": ["Stanford"],
  "Harvard University": ["Harvard"],
  "University of California, Los Angeles": ["UCLA"],
  "University of California, Berkeley": ["UC Berkeley"],
  "University of Southern California": ["USC"],
  "Georgia Institute of Technology": ["Georgia Tech"],
  "Carnegie Mellon University": ["CMU"],
  "University of Oxford": ["Oxford"],
  "University of Cambridge": ["Cambridge"],
  "Imperial College London": ["Imperial"],
  "University College London": ["UCL"],
  "London School of Economics and Political Science": ["LSE"],
  "King's College London": ["KCL"],
  "University of Edinburgh": ["Edinburgh"],
  "Technische Universität München": ["TUM"],
  "Ludwig-Maximilians-Universität München": ["LMU Munich", "LMU"],
  "Rheinisch-Westfälische Technische Hochschule Aachen": ["RWTH Aachen"],
  "Karlsruher Institut für Technologie": ["KIT"],
  "University of Toronto": ["U of T", "UofT"],
  "University of British Columbia": ["UBC"],
  "McGill University": ["McGill"],
  "University of Waterloo": ["UWaterloo"],
  "University of Melbourne": ["UniMelb"],
  "University of Sydney": ["USYD"],
  "Australian National University": ["ANU"],
  "University of New South Wales": ["UNSW"],
  "Delft University of Technology": ["TU Delft"],
  "Eindhoven University of Technology": ["TU/e"],
  "Universiteit van Amsterdam": ["UvA"],
  "École Polytechnique": ["Polytechnique", "X"],
  "Sorbonne Université": ["Sorbonne"],
  "École Normale Supérieure": ["ENS"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchCountry(query: string): Promise<HipoUniversity[]> {
  const url = `${BASE_URL}?country=${query}`;
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json() as Promise<HipoUniversity[]>;
}

function toRow(uni: HipoUniversity): UniversityRow | null {
  const domain = uni.domains?.[0];
  if (!domain) return null; // skip entries with no domain

  const aliases = KNOWN_ALIASES[uni.name] ?? [];

  return {
    name: uni.name,
    aliases,
    primary_domain: domain,
    country: uni.country,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎓 University seed script starting...\n");

  const allRows: UniversityRow[] = [];

  for (const { query, limit } of COUNTRIES) {
    try {
      const raw = await fetchCountry(query);
      const rows = raw
        .map(toRow)
        .filter((r): r is UniversityRow => r !== null)
        .slice(0, limit);

      allRows.push(...rows);
      console.log(`  ✓ ${query}: ${rows.length} universities\n`);

      // Be polite to the free API
      await sleep(300);
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${query}:`, err);
    }
  }

  console.log(`Total rows fetched: ${allRows.length}`);

  // Deduplicate by primary_domain (API may return dupes across country queries)
  const seen = new Set<string>();
  const deduped = allRows.filter((row) => {
    if (seen.has(row.primary_domain)) return false;
    seen.add(row.primary_domain);
    return true;
  });

  console.log(`After dedup: ${deduped.length} unique universities\n`);

  // Fetch existing domains to avoid duplicate inserts
  // (no UNIQUE constraint on primary_domain, so we filter client-side)
  console.log("Fetching existing domains from database...");
  const { data: existing, error: fetchErr } = await supabase
    .from("universities")
    .select("primary_domain");

  if (fetchErr) {
    console.error("Failed to fetch existing universities:", fetchErr.message);
    process.exit(1);
  }

  const existingDomains = new Set(
    (existing ?? []).map((r: { primary_domain: string }) => r.primary_domain)
  );
  console.log(`  Found ${existingDomains.size} existing universities.\n`);

  const toInsert = deduped.filter(
    (row) => !existingDomains.has(row.primary_domain)
  );

  if (toInsert.length === 0) {
    console.log("✅ All universities already exist. Nothing to insert.");
    return;
  }

  console.log(`Inserting ${toInsert.length} new universities...\n`);

  // Insert in batches of 500
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { error, count } = await supabase
      .from("universities")
      .insert(batch, { count: "exact" });

    if (error) {
      console.error(`  Batch ${batchNum} error:`, error.message);
    } else {
      const n = count ?? batch.length;
      totalInserted += n;
      console.log(`  Batch ${batchNum}: +${n} rows`);
    }
  }

  console.log(`\n✅ Done! Inserted ${totalInserted} new universities.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
