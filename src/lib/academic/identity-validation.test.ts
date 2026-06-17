import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateIdentity,
  normalizeName,
  MIN_YEAR_OF_STUDY,
  MAX_YEAR_OF_STUDY,
  VALID_TERM_KINDS,
} from "./identity-validation";

describe("normalizeName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeName("  Faculty   of  Engineering ")).toBe("Faculty of Engineering");
  });
  it("returns null for empty / whitespace-only / non-string input", () => {
    expect(normalizeName("")).toBeNull();
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName(null)).toBeNull();
    expect(normalizeName(undefined)).toBeNull();
    expect(normalizeName(42 as unknown)).toBeNull();
  });
  it("preserves case and diacritics (display value)", () => {
    expect(normalizeName("Orta Doğu Teknik Üniversitesi")).toBe(
      "Orta Doğu Teknik Üniversitesi"
    );
  });
});

describe("validateIdentity (Requirement 1.5)", () => {
  it("accepts a complete identity and normalizes values", () => {
    const r = validateIdentity({
      universityId: "uni-1",
      yearOfStudy: "2",
      term: "Fall 2025",
    });
    expect(r.valid).toBe(true);
    expect(r.value?.yearOfStudy).toBe(2);
    expect(r.value?.term).toBe("Fall 2025");
    expect(r.value?.termKind).toBe("semester");
  });

  it("accepts a raw-text university (no registry id)", () => {
    const r = validateIdentity({
      universityNameRaw: "Some Unlisted University",
      yearOfStudy: 1,
      term: "Güz",
    });
    expect(r.valid).toBe(true);
    expect(r.value?.universityId).toBeNull();
    expect(r.value?.universityNameRaw).toBe("Some Unlisted University");
  });

  it("rejects when university is missing", () => {
    const r = validateIdentity({ yearOfStudy: 2, term: "Fall" });
    expect(r.valid).toBe(false);
    expect(r.errors.university).toBeDefined();
  });

  it("rejects out-of-range and non-integer years", () => {
    expect(validateIdentity({ universityId: "u", yearOfStudy: 0, term: "Fall" }).valid).toBe(false);
    expect(validateIdentity({ universityId: "u", yearOfStudy: 9, term: "Fall" }).valid).toBe(false);
    expect(validateIdentity({ universityId: "u", yearOfStudy: "2.5", term: "Fall" }).valid).toBe(false);
    expect(validateIdentity({ universityId: "u", yearOfStudy: "abc", term: "Fall" }).valid).toBe(false);
  });

  it("rejects a missing term", () => {
    const r = validateIdentity({ universityId: "u", yearOfStudy: 2, term: "   " });
    expect(r.valid).toBe(false);
    expect(r.errors.term).toBeDefined();
  });

  it("rejects an unsupported term kind but accepts the valid ones", () => {
    expect(
      validateIdentity({ universityId: "u", yearOfStudy: 2, term: "Fall", termKind: "weekly" }).valid
    ).toBe(false);
    for (const kind of VALID_TERM_KINDS) {
      expect(
        validateIdentity({ universityId: "u", yearOfStudy: 2, term: "Fall", termKind: kind }).valid
      ).toBe(true);
    }
  });

  it("property: valid iff university present AND year in [1,8] AND term present", () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
        fc.integer({ min: -5, max: 15 }),
        fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
        (uni, year, term) => {
          const r = validateIdentity({
            universityNameRaw: uni ?? null,
            yearOfStudy: year,
            term: term ?? null,
          });

          const uniOk = !!(uni && uni.trim().length > 0);
          const yearOk = year >= MIN_YEAR_OF_STUDY && year <= MAX_YEAR_OF_STUDY;
          const cleanedTerm = term ? term.replace(/\s+/g, " ").trim() : "";
          const termOk = cleanedTerm.length > 0 && cleanedTerm.length <= 60;

          expect(r.valid).toBe(uniOk && yearOk && termOk);
        }
      )
    );
  });
});
