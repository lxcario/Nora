import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  proximityFactor,
  eventLoad,
  computeLoad,
  loadPhase,
  assessLoad,
  loadIntensityMultiplier,
  EVENT_WEIGHT,
  PROXIMITY_HORIZON_DAYS,
  ESCALATION_THRESHOLD,
  MITIGATION_THRESHOLD,
  type LoadEvent,
} from "./academic-load";
import type { AcademicEventType } from "@/lib/supabase/database.types";

const EVENT_TYPES = Object.keys(EVENT_WEIGHT) as AcademicEventType[];

describe("proximityFactor", () => {
  it("is 1 on the day, ~0 at the horizon, 0 past/beyond", () => {
    expect(proximityFactor(0)).toBe(1);
    expect(proximityFactor(PROXIMITY_HORIZON_DAYS)).toBe(0);
    expect(proximityFactor(-1)).toBe(0);
    expect(proximityFactor(PROXIMITY_HORIZON_DAYS + 5)).toBe(0);
  });
});

describe("loadPhase thresholds (Requirement 14.2–14.4)", () => {
  it("maps the documented bands", () => {
    expect(loadPhase(0)).toBe("baseline");
    expect(loadPhase(ESCALATION_THRESHOLD - 0.01)).toBe("baseline");
    expect(loadPhase(ESCALATION_THRESHOLD)).toBe("escalation");
    expect(loadPhase(MITIGATION_THRESHOLD - 0.01)).toBe("escalation");
    expect(loadPhase(MITIGATION_THRESHOLD)).toBe("mitigation");
    expect(loadPhase(1)).toBe("mitigation");
  });
});

describe("event weighting", () => {
  it("ranks finals above midterms above registration on the same day", () => {
    const day = 0;
    expect(eventLoad({ eventType: "final_period", daysUntil: day })).toBeGreaterThan(
      eventLoad({ eventType: "midterm_period", daysUntil: day })
    );
    expect(eventLoad({ eventType: "midterm_period", daysUntil: day })).toBeGreaterThan(
      eventLoad({ eventType: "registration", daysUntil: day })
    );
  });
});

describe("properties (Requirements 14.1–14.4)", () => {
  it("property: load is non-decreasing as a deadline nears (fixed weight)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EVENT_TYPES),
        fc.integer({ min: 0, max: PROXIMITY_HORIZON_DAYS }),
        fc.integer({ min: 0, max: PROXIMITY_HORIZON_DAYS }),
        (type, a, b) => {
          const near = Math.min(a, b);
          const far = Math.max(a, b);
          const loadNear = computeLoad([{ eventType: type, daysUntil: near }]);
          const loadFar = computeLoad([{ eventType: type, daysUntil: far }]);
          expect(loadNear).toBeGreaterThanOrEqual(loadFar - 1e-9);
        }
      )
    );
  });

  it("property: load stays within [0,1] for any set of events", () => {
    const eventArb = fc.record({
      eventType: fc.constantFrom(...EVENT_TYPES),
      daysUntil: fc.integer({ min: -30, max: 60 }),
    });
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        const load = computeLoad(events as LoadEvent[]);
        expect(load).toBeGreaterThanOrEqual(0);
        expect(load).toBeLessThanOrEqual(1);
      })
    );
  });

  it("property: adding an event never decreases load (monotonic in set)", () => {
    const eventArb = fc.record({
      eventType: fc.constantFrom(...EVENT_TYPES),
      daysUntil: fc.integer({ min: -5, max: 30 }),
    });
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 10 }), eventArb, (events, extra) => {
        const before = computeLoad(events as LoadEvent[]);
        const after = computeLoad([...(events as LoadEvent[]), extra as LoadEvent]);
        expect(after).toBeGreaterThanOrEqual(before - 1e-9);
      })
    );
  });
});

describe("assessLoad + intensity", () => {
  it("identifies the dominant imminent assessment", () => {
    const events: LoadEvent[] = [
      { eventType: "registration", daysUntil: 1 },
      { eventType: "final_period", daysUntil: 3 },
      { eventType: "holiday", daysUntil: 0 },
    ];
    const a = assessLoad(events);
    expect(a.dominant?.eventType).toBe("final_period");
    expect(a.phase).toBe(loadPhase(a.load));
  });

  it("scales intensity up with phase", () => {
    expect(loadIntensityMultiplier("baseline")).toBe(1);
    expect(loadIntensityMultiplier("escalation")).toBeGreaterThan(1);
    expect(loadIntensityMultiplier("mitigation")).toBeGreaterThan(
      loadIntensityMultiplier("escalation")
    );
  });
});
