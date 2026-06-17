import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  normalizeMonth,
  classifyEventType,
  parseDateRange,
  isGroundedInSource,
  detectTermSeason,
  isWithinTermWindow,
  validateExtractedEvent,
} from "./academic-extract";

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const pad = (n: number) => String(n).padStart(2, "0");

describe("normalizeMonth (locale normalization, Requirement 7.2)", () => {
  it("maps English and Turkish month names to the same number", () => {
    for (let m = 1; m <= 12; m++) {
      expect(normalizeMonth(EN_MONTHS[m - 1])).toBe(m);
      expect(normalizeMonth(TR_MONTHS[m - 1])).toBe(m);
    }
  });
  it("handles abbreviations and trailing dots", () => {
    expect(normalizeMonth("Jan")).toBe(1);
    expect(normalizeMonth("Sept.")).toBe(9);
  });
  it("returns null for non-months", () => {
    expect(normalizeMonth("Vize")).toBeNull();
    expect(normalizeMonth("")).toBeNull();
  });
});

describe("classifyEventType (locale normalization, Requirement 7.2)", () => {
  const cases: [string, string, string][] = [
    ["Final Exams", "Final Sınavları", "final_period"],
    ["Midterm Week", "Vize Haftası", "midterm_period"],
    ["Make-up Exams", "Bütünleme Sınavları", "makeup_period"],
    ["Course Registration", "Ders Kayıtları", "registration"],
    ["Add/Drop", "Ekle-Sil", "add_drop"],
    ["Course Withdrawal", "Dersten Çekilme", "withdrawal_deadline"],
  ];
  it("maps Turkish and English vocabulary to the same canonical type", () => {
    for (const [en, tr, expected] of cases) {
      expect(classifyEventType(en)).toBe(expected);
      expect(classifyEventType(tr)).toBe(expected);
    }
  });
  it("returns null for unrecognized labels", () => {
    expect(classifyEventType("Lorem ipsum")).toBeNull();
  });
});

describe("parseDateRange", () => {
  it("parses single English and Turkish dates", () => {
    expect(parseDateRange("Classes begin 12 January 2026")).toEqual({
      startDate: "2026-01-12",
      endDate: null,
    });
    expect(parseDateRange("Dersler 12 Ocak 2026 başlar")).toEqual({
      startDate: "2026-01-12",
      endDate: null,
    });
  });
  it("parses numeric DMY and ISO forms", () => {
    expect(parseDateRange("12.01.2026")).toEqual({ startDate: "2026-01-12", endDate: null });
    expect(parseDateRange("2026-01-12")).toEqual({ startDate: "2026-01-12", endDate: null });
  });
  it("parses ranges (same month, cross-month, en dash, Turkish)", () => {
    expect(parseDateRange("Finals: 12-16 January 2026")).toEqual({
      startDate: "2026-01-12",
      endDate: "2026-01-16",
    });
    expect(parseDateRange("30 January - 2 February 2026")).toEqual({
      startDate: "2026-01-30",
      endDate: "2026-02-02",
    });
    expect(parseDateRange("13–17 Ağustos 2026")).toEqual({
      startDate: "2026-08-13",
      endDate: "2026-08-17",
    });
  });
  it("returns null for impossible or absent dates", () => {
    expect(parseDateRange("32 January 2026")).toBeNull();
    expect(parseDateRange("31 February 2026")).toBeNull();
    expect(parseDateRange("no date in this text")).toBeNull();
  });

  it("property: round-trips any valid day/month/year (EN or TR)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.boolean(),
        (y, m, d, turkish) => {
          const name = (turkish ? TR_MONTHS : EN_MONTHS)[m - 1];
          const parsed = parseDateRange(`Event on ${d} ${name} ${y}`);
          expect(parsed?.startDate).toBe(`${y}-${pad(m)}-${pad(d)}`);
        }
      )
    );
  });

  it("property: a returned range is well-formed and ordered", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const parsed = parseDateRange(text);
        if (parsed) {
          expect(parsed.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          if (parsed.endDate) {
            expect(parsed.endDate >= parsed.startDate).toBe(true);
          }
        }
      })
    );
  });
});

describe("term window", () => {
  it("detects seasons from EN/TR labels", () => {
    expect(detectTermSeason("2025-2026 Fall")).toBe("fall");
    expect(detectTermSeason("Güz")).toBe("fall");
    expect(detectTermSeason("Bahar")).toBe("spring");
    expect(detectTermSeason("Yaz")).toBe("summer");
    expect(detectTermSeason("")).toBeNull();
  });
  it("checks month membership", () => {
    expect(isWithinTermWindow("2026-10-15", "fall")).toBe(true);
    expect(isWithinTermWindow("2026-07-15", "fall")).toBe(false);
  });
});

describe("validateExtractedEvent (grounding + term window, Requirements 7.1, 7.3, 7.6)", () => {
  const source =
    "ACADEMIC CALENDAR 2025-2026\nFinal Exams: 12-16 January 2026\nMake-up Exams: 26-30 January 2026\nSummer school registration: 15 July 2026";

  it("emits a grounded, in-window event", () => {
    const res = validateExtractedEvent(
      { eventType: "final_period", sourceLine: "Final Exams: 12-16 January 2026" },
      { sourceText: source, season: "fall", sourceTier: 1 }
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.event.startDate).toBe("2026-01-12");
      expect(res.event.endDate).toBe("2026-01-16");
      expect(res.event.eventType).toBe("final_period");
    }
  });

  it("drops a line that is not present in the source (ungrounded)", () => {
    const res = validateExtractedEvent(
      { eventType: "final_period", sourceLine: "Final Exams: 1-5 March 2027" },
      { sourceText: source, season: "fall", sourceTier: 1 }
    );
    expect(res).toEqual({ ok: false, reason: "ungrounded" });
  });

  it("drops an out-of-window date from a non-Tier-1 source, but keeps it for Tier-1", () => {
    const line = "Summer school registration: 15 July 2026";
    const nonTier1 = validateExtractedEvent(
      { label: "registration", sourceLine: line },
      { sourceText: source, season: "fall", sourceTier: 3 }
    );
    expect(nonTier1).toEqual({ ok: false, reason: "out_of_window" });

    const tier1 = validateExtractedEvent(
      { label: "registration", sourceLine: line },
      { sourceText: source, season: "fall", sourceTier: 1 }
    );
    expect(tier1.ok).toBe(true);
  });

  it("property: an ungrounded source line is NEVER emitted (Requirement 7.1)", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (sourceText, sourceLine) => {
        const res = validateExtractedEvent(
          { sourceLine },
          { sourceText, season: null, sourceTier: 2 }
        );
        // ungrounded ⇒ dropped, and emitted ⇒ grounded (contrapositive)
        if (!isGroundedInSource(sourceText, sourceLine)) {
          expect(res.ok).toBe(false);
        }
        if (res.ok) {
          expect(isGroundedInSource(sourceText, sourceLine)).toBe(true);
        }
      })
    );
  });
});
