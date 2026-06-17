import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  matchUniversity,
  matchEntities,
  normalizeForMatch,
  SEED_UNIVERSITIES,
} from "./university-registry";

const METU = SEED_UNIVERSITIES[0];

describe("normalizeForMatch", () => {
  it("is diacritic- and case-insensitive for Turkish letters", () => {
    expect(normalizeForMatch("ODTÜ")).toBe(normalizeForMatch("ODTU"));
    expect(normalizeForMatch("Orta Doğu")).toBe(normalizeForMatch("orta dogu"));
    expect(normalizeForMatch("Mühendislik")).toBe("muhendislik");
    expect(normalizeForMatch("Elektrik-Elektronik")).toBe("elektrik elektronik");
  });

  it("collapses punctuation and whitespace to single spaces", () => {
    expect(normalizeForMatch("  METU,  Ankara ")).toBe("metu ankara");
  });

  it("property: is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(normalizeForMatch(normalizeForMatch(s))).toBe(normalizeForMatch(s));
      })
    );
  });
});

describe("matchUniversity — alias resolution (Requirement 2.3)", () => {
  it("resolves 'Orta Doğu', 'ODTÜ', and 'METU' to the same university", () => {
    const queries = ["Orta Doğu", "ODTÜ", "METU"];
    const domains = queries.map((q) => matchUniversity(q)[0]?.entity.primaryDomain);
    expect(domains).toEqual(["metu.edu.tr", "metu.edu.tr", "metu.edu.tr"]);
  });

  it("tolerates case, surrounding whitespace, and missing diacritics", () => {
    const queries = ["odtu", "  metu  ", "ORTA DOGU", "Orta Dogu Teknik Universitesi"];
    for (const q of queries) {
      const matches = matchUniversity(q);
      expect(matches[0]?.entity.primaryDomain).toBe("metu.edu.tr");
    }
  });

  it("property: every known alias (perturbed) maps to METU as the top match", () => {
    const aliasArb = fc.constantFrom(METU.name, ...METU.aliases);
    fc.assert(
      fc.property(aliasArb, fc.boolean(), fc.boolean(), (alias, upper, pad) => {
        let q = upper ? alias.toUpperCase() : alias.toLowerCase();
        if (pad) q = `  ${q}  `;
        const matches = matchUniversity(q);
        expect(matches[0]?.entity.primaryDomain).toBe("metu.edu.tr");
      })
    );
  });

  it("returns no matches for empty or whitespace-only queries", () => {
    expect(matchUniversity("")).toEqual([]);
    expect(matchUniversity("   ")).toEqual([]);
  });
});

describe("matchEntities — generic fuzzy matcher", () => {
  it("scores exact matches highest, then prefix, then substring", () => {
    const entities = [
      { name: "Electrical and Electronics Engineering", aliases: ["EEE"] },
      { name: "Mechanical Engineering", aliases: ["ME"] },
    ];
    const exact = matchEntities("EEE", entities);
    expect(exact[0].entity.name).toBe("Electrical and Electronics Engineering");
    expect(exact[0].score).toBe(1);

    const prefix = matchEntities("Electrical and Electronics", entities);
    expect(prefix[0].entity.name).toBe("Electrical and Electronics Engineering");
    expect(prefix[0].score).toBeGreaterThanOrEqual(0.85);
  });

  it("property: results are sorted by descending score", () => {
    const entities = [METU, ...METU.faculties[0].programs];
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 8 }), (q) => {
        const matches = matchEntities(q, entities);
        for (let i = 1; i < matches.length; i++) {
          expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
        }
      })
    );
  });
});
