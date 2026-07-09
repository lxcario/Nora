/**
 * Tests for src/lib/calibration.ts — pure JOL calibration math (Req 4).
 *
 * Covers the classification thresholds (well-calibrated / over / under),
 * the <20-review gate, the sparse-level curve filter, and the per-topic
 * breakdown — all without a database.
 */

import { describe, it, expect } from "vitest";
import {
  computeCalibration,
  MIN_CALIBRATION_REVIEWS,
  type CalibrationReview,
} from "./calibration";

// `total` reviews at one confidence level; `successes` recalled (grade 4),
// the rest failed (grade 1).
function reviewsAt(
  confidence: number,
  successes: number,
  total: number,
  topicName = "T"
): CalibrationReview[] {
  const out: CalibrationReview[] = [];
  for (let i = 0; i < total; i++) {
    out.push({ confidence, grade: i < successes ? 4 : 1, topicName });
  }
  return out;
}

describe("computeCalibration — the <20-review gate", () => {
  it("returns insufficient-data with the 'at least 20' insight below the threshold", () => {
    const r = computeCalibration(reviewsAt(3, 5, 19)); // 19 < 20
    expect(r.classification).toBe("insufficient-data");
    expect(r.totalReviewsWithJol).toBe(19);
    expect(r.curve).toHaveLength(0);
    expect(r.overallDeviation).toBe(0);
    expect(r.insight).toMatch(/at least 20/i);
  });

  it("gate constant is 20", () => {
    expect(MIN_CALIBRATION_REVIEWS).toBe(20);
  });

  it(">=20 reviews but fewer than 3 dense levels → insufficient-data with the default insight (not the <20 message)", () => {
    const r = computeCalibration([...reviewsAt(1, 5, 10), ...reviewsAt(2, 5, 10)]);
    expect(r.totalReviewsWithJol).toBe(20);
    expect(r.classification).toBe("insufficient-data");
    expect(r.insight).not.toMatch(/at least 20/i);
    expect(r.curve).toHaveLength(2);
  });
});

describe("computeCalibration — classification thresholds", () => {
  it("matching confidence and recall → well-calibrated (deviation < 10)", () => {
    // actual success rate == perfect rate at every level (c → c*20%)
    const reviews = [1, 2, 3, 4, 5].flatMap((c) => reviewsAt(c, c * 2, 10));
    const r = computeCalibration(reviews);
    expect(r.classification).toBe("well-calibrated");
    expect(r.overallDeviation).toBeLessThan(10);
    expect(r.curve).toHaveLength(5);
  });

  it("recall far below stated confidence → overconfident", () => {
    const reviews = [1, 2, 3, 4, 5].flatMap((c) => reviewsAt(c, 1, 10)); // ~10% everywhere
    const r = computeCalibration(reviews);
    expect(r.classification).toBe("overconfident");
    expect(r.overallDeviation).toBeGreaterThanOrEqual(10);
  });

  it("recall far above stated confidence → underconfident", () => {
    const reviews = [1, 2, 3, 4, 5].flatMap((c) => reviewsAt(c, 10, 10)); // 100% everywhere
    const r = computeCalibration(reviews);
    expect(r.classification).toBe("underconfident");
    expect(r.overallDeviation).toBeGreaterThanOrEqual(10);
  });
});

describe("computeCalibration — curve construction", () => {
  it("skips sparse confidence levels (<3 reviews) from the curve", () => {
    const reviews = [
      ...reviewsAt(1, 2, 10),
      ...reviewsAt(2, 4, 10),
      ...reviewsAt(4, 8, 10),
      ...reviewsAt(5, 10, 10),
      ...reviewsAt(3, 1, 2), // only 2 reviews at confidence 3 → dropped
    ];
    const r = computeCalibration(reviews);
    expect(r.curve.find((p) => p.confidence === 3)).toBeUndefined();
    expect(r.curve).toHaveLength(4);
  });

  it("rounds the per-level success rate and records the count", () => {
    const r = computeCalibration([
      ...reviewsAt(3, 2, 3), // 66.67% → 67
      ...reviewsAt(1, 4, 10),
      ...reviewsAt(5, 9, 10),
    ]);
    const p3 = r.curve.find((p) => p.confidence === 3);
    expect(p3?.actualSuccessRate).toBe(67);
    expect(p3?.count).toBe(3);
  });
});

describe("computeCalibration — per-topic breakdown", () => {
  it("lists topics with enough data, worst-calibrated first", () => {
    const reviews = [
      // Topic A — well aligned (deviation ~0)
      ...reviewsAt(2, 2, 5, "A"),
      ...reviewsAt(4, 4, 5, "A"),
      // Topic B — badly miscalibrated (high deviation)
      ...reviewsAt(2, 5, 5, "B"),
      ...reviewsAt(4, 0, 5, "B"),
      // Topic C — single level only (excluded from breakdown), pads the gate
      ...reviewsAt(3, 6, 10, "C"),
    ];
    const r = computeCalibration(reviews);
    const names = r.topicBreakdown.map((t) => t.topicName);
    expect(names).toContain("A");
    expect(names).toContain("B");
    expect(names).not.toContain("C"); // only one dense level → excluded
    expect(names.indexOf("B")).toBeLessThan(names.indexOf("A")); // worst first
  });
});
