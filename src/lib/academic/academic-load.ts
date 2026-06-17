/**
 * Cognitive-load model — pure helpers (Requirements 14.1–14.4).
 *
 * Load is a value in [0,1] computed from upcoming academic events, each
 * weighted by its type (final > midterm > …) and its proximity in time. The
 * value maps to a phase that the planner uses to adjust study suggestions:
 *   baseline    → standard spacing
 *   escalation  → shift focus toward the imminent assessment
 *   mitigation  → emphasize test-prep + surface a warning
 *
 * No side effects; covered by property tests.
 */

import type { AcademicEventType } from "@/lib/supabase/database.types";

export type LoadPhase = "baseline" | "escalation" | "mitigation";

export interface LoadEvent {
  eventType: AcademicEventType;
  /** Whole days from "now" to the event start. Negative = already passed. */
  daysUntil: number;
}

/** Relative weight of each event type (finals dominate). */
export const EVENT_WEIGHT: Record<AcademicEventType, number> = {
  final_period: 1.0,
  makeup_period: 0.7,
  midterm_period: 0.7,
  withdrawal_deadline: 0.4,
  add_drop: 0.35,
  registration: 0.3,
  semester_end: 0.2,
  semester_start: 0.1,
  other: 0.2,
  holiday: 0,
  break: 0,
};

/** Beyond this horizon an event contributes no load. */
export const PROXIMITY_HORIZON_DAYS = 21;

export const ESCALATION_THRESHOLD = 0.34;
export const MITIGATION_THRESHOLD = 0.67;

/**
 * Proximity factor in [0,1]: 1 the day of the event, decaying linearly to 0 at
 * the horizon. Past events (daysUntil < 0) contribute nothing.
 */
export function proximityFactor(daysUntil: number): number {
  if (daysUntil < 0 || daysUntil > PROXIMITY_HORIZON_DAYS) return 0;
  return 1 - daysUntil / PROXIMITY_HORIZON_DAYS;
}

/** A single event's load contribution = weight × proximity, clamped to [0,1]. */
export function eventLoad(e: LoadEvent): number {
  const w = EVENT_WEIGHT[e.eventType] ?? 0.2;
  const c = w * proximityFactor(e.daysUntil);
  return Math.max(0, Math.min(1, c));
}

/**
 * Aggregate load via a saturating combination: 1 − ∏(1 − cᵢ). This stays in
 * [0,1), is monotonic in each contribution, and never overflows regardless of
 * how many events pile up.
 */
export function computeLoad(events: LoadEvent[]): number {
  let inv = 1;
  for (const e of events) {
    inv *= 1 - eventLoad(e);
  }
  return 1 - inv;
}

export function loadPhase(load: number): LoadPhase {
  if (load >= MITIGATION_THRESHOLD) return "mitigation";
  if (load >= ESCALATION_THRESHOLD) return "escalation";
  return "baseline";
}

export interface LoadAssessment {
  load: number;
  phase: LoadPhase;
  /** The single event contributing the most load right now (for messaging). */
  dominant: LoadEvent | null;
}

export function assessLoad(events: LoadEvent[]): LoadAssessment {
  const load = computeLoad(events);
  let dominant: LoadEvent | null = null;
  let best = 0;
  for (const e of events) {
    const c = eventLoad(e);
    if (c > best) {
      best = c;
      dominant = e;
    }
  }
  return { load, phase: loadPhase(load), dominant };
}

/**
 * A suggested per-session study-minute multiplier for the current phase, so the
 * planner can lengthen test-prep sessions as load rises (Requirement 14.3, 14.4).
 */
export function loadIntensityMultiplier(phase: LoadPhase): number {
  switch (phase) {
    case "mitigation":
      return 1.5;
    case "escalation":
      return 1.25;
    case "baseline":
      return 1;
  }
}
