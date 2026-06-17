import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  hostMatchesDomain,
  isOfficialUrl,
  tierForSourceType,
  computeConfidence,
  statusForConfidence,
  resolveInstitutionEvent,
  resolveCourseDate,
  VERIFIED_THRESHOLD,
  INFERRED_THRESHOLD,
  type RankedValue,
} from "./source-ranking";
import type { AcademicSourceType } from "@/lib/supabase/database.types";

describe("domain audit (Requirement 5.2)", () => {
  it("treats only on/under the primary domain as official", () => {
    expect(isOfficialUrl("https://oidb.metu.edu.tr/en/academic-calendar", "metu.edu.tr")).toBe(true);
    expect(isOfficialUrl("https://metu.edu.tr/", "metu.edu.tr")).toBe(true);
    expect(isOfficialUrl("https://eee.metu.edu.tr/", "metu.edu.tr")).toBe(true);
    expect(isOfficialUrl("https://evil.com/metu.edu.tr", "metu.edu.tr")).toBe(false);
  });
  it("is not fooled by suffix spoofing", () => {
    expect(hostMatchesDomain("metu.edu.tr.evil.com", "metu.edu.tr")).toBe(false);
    expect(hostMatchesDomain("notmetu.edu.tr", "metu.edu.tr")).toBe(false);
  });
  it("rejects non-http(s) and malformed URLs", () => {
    expect(isOfficialUrl("ftp://metu.edu.tr/x", "metu.edu.tr")).toBe(false);
    expect(isOfficialUrl("not a url", "metu.edu.tr")).toBe(false);
  });
});

describe("tier classification (Requirement 9.1)", () => {
  it("maps registrar/faculty/dept/syllabus to tiers 1–4", () => {
    expect(tierForSourceType("registrar_calendar")).toBe(1);
    expect(tierForSourceType("faculty_page")).toBe(2);
    expect(tierForSourceType("dept_curriculum")).toBe(3);
    expect(tierForSourceType("syllabus")).toBe(4);
  });
  it("defaults unknown/missing to Tier 4", () => {
    expect(tierForSourceType("other")).toBe(4);
    expect(tierForSourceType(null)).toBe(4);
  });
  it("property: every source type maps to a tier in 1..4", () => {
    const types: AcademicSourceType[] = [
      "registrar_calendar", "course_catalog", "faculty_page",
      "dept_curriculum", "announcement", "syllabus", "other",
    ];
    fc.assert(
      fc.property(fc.constantFrom(...types), (t) => {
        const tier = tierForSourceType(t);
        expect(tier).toBeGreaterThanOrEqual(1);
        expect(tier).toBeLessThanOrEqual(4);
      })
    );
  });
});

describe("status thresholds (Requirement 9.3)", () => {
  it("maps the documented bands", () => {
    expect(statusForConfidence(0.97, true)).toBe("verified");
    expect(statusForConfidence(0.95, true)).toBe("verified");
    expect(statusForConfidence(0.85, true)).toBe("inferred");
    expect(statusForConfidence(0.6, true)).toBe("inferred");
    expect(statusForConfidence(0.59, true)).toBe("unreleased");
  });
  it("is always unreleased when there is no official date", () => {
    expect(statusForConfidence(0.99, false)).toBe("unreleased");
    expect(statusForConfidence(null, true)).toBe("unreleased");
  });
  it("property: status matches the thresholds for any confidence", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (c) => {
        const expected =
          c >= VERIFIED_THRESHOLD ? "verified" : c >= INFERRED_THRESHOLD ? "inferred" : "unreleased";
        expect(statusForConfidence(c, true)).toBe(expected);
      })
    );
  });
  it("property: Tier-1 official ⇒ verified; off-domain ⇒ unreleased", () => {
    expect(statusForConfidence(computeConfidence({ tier: 1, official: true }), true)).toBe("verified");
    expect(statusForConfidence(computeConfidence({ tier: 2, official: false }), true)).toBe("unreleased");
  });
});

describe("conflict resolution (Requirements 10.1–10.3)", () => {
  it("picks the highest tier (lowest number) for institution-wide events", () => {
    const cands: RankedValue<string>[] = [
      { value: "A", tier: 3 },
      { value: "B", tier: 1 },
      { value: "C", tier: 2 },
    ];
    const r = resolveInstitutionEvent(cands)!;
    expect(r.chosen.value).toBe("B");
    expect(r.alternative?.value).toBe("C");
  });

  it("breaks tier ties by the more recent source year, keeping the alternative", () => {
    const cands: RankedValue<string>[] = [
      { value: "old", tier: 2, sourceYear: 2023 },
      { value: "new", tier: 2, sourceYear: 2025 },
    ];
    const r = resolveInstitutionEvent(cands)!;
    expect(r.chosen.value).toBe("new");
    expect(r.alternative?.value).toBe("old");
  });

  it("lets a course-specific syllabus win over a higher-tier general source", () => {
    const cands: RankedValue<string>[] = [
      { value: "dept", tier: 1, isCourseSpecific: false },
      { value: "syllabus", tier: 4, isCourseSpecific: true },
    ];
    const r = resolveCourseDate(cands)!;
    expect(r.chosen.value).toBe("syllabus");
    expect(r.alternative?.value).toBe("dept");
  });

  it("property: institution winner always has the minimum tier", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ tier: fc.integer({ min: 1, max: 4 }), year: fc.integer({ min: 2018, max: 2026 }) }),
          { minLength: 1, maxLength: 6 }
        ),
        (items) => {
          const cands: RankedValue<number>[] = items.map((it, i) => ({
            value: i,
            tier: it.tier,
            sourceYear: it.year,
          }));
          const minTier = Math.min(...items.map((i) => i.tier));
          const r = resolveInstitutionEvent(cands)!;
          expect(r.chosen.tier).toBe(minTier);
        }
      )
    );
  });
});
