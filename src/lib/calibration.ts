/**
 * Pure JOL (Judgment-of-Learning) calibration math.
 *
 * Extracted from the getCalibrationData server action so the classification
 * thresholds and the <20-review gate are unit-testable without a database.
 * No I/O — the server action fetches rows and hands the reduced reviews here.
 *
 * Spec: .kiro/specs/metacognition (Requirements 1–6).
 */

export interface CalibrationPoint {
  confidence: number; // 1-5
  actualSuccessRate: number; // 0-100%
  count: number; // how many reviews at this confidence level
}

export interface TopicCalibration {
  topicName: string;
  deviation: number; // mean absolute deviation from perfect
  count: number;
}

export interface CalibrationData {
  /** One point per confidence level (1-5) with enough data */
  curve: CalibrationPoint[];
  /** Overall calibration score: lower = better calibrated (0 = perfect) */
  overallDeviation: number;
  /** Classification */
  classification:
    | "well-calibrated"
    | "overconfident"
    | "underconfident"
    | "insufficient-data";
  /** Per-topic deviation (worst first) */
  topicBreakdown: TopicCalibration[];
  /** Total reviews with JOL data */
  totalReviewsWithJol: number;
  /** Insight text for the student */
  insight: string;
}

/** A single review reduced to what calibration needs. */
export interface CalibrationReview {
  confidence: number; // 1-5 (JOL rating)
  grade: number; // FSRS grade; >= 3 counts as a successful recall
  topicName: string;
}

/**
 * Perfect calibration mapping: confidence 1→20%, 2→40%, 3→60%, 4→80%, 5→100%
 */
export const PERFECT_RATE: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

/** Minimum JOL-rated reviews before a calibration curve is shown. */
export const MIN_CALIBRATION_REVIEWS = 20;

/**
 * Compute the calibration curve, overall deviation, classification, and
 * per-topic breakdown from confidence-rated reviews.
 *
 * Deterministic and side-effect free.
 */
export function computeCalibration(reviews: CalibrationReview[]): CalibrationData {
  const total = reviews.length;

  if (total < MIN_CALIBRATION_REVIEWS) {
    return {
      curve: [],
      overallDeviation: 0,
      classification: "insufficient-data",
      topicBreakdown: [],
      totalReviewsWithJol: total,
      insight: `You need at least 20 reviews with confidence ratings to see calibration data. You have ${total} so far — keep reviewing!`,
    };
  }

  // Per-confidence-level success rates.
  const buckets = new Map<number, { total: number; successes: number }>();
  for (let c = 1; c <= 5; c++) buckets.set(c, { total: 0, successes: 0 });

  // Per-topic aggregation.
  const topicBuckets = new Map<string, Map<number, { total: number; successes: number }>>();

  for (const r of reviews) {
    const conf = r.confidence;
    const success = r.grade >= 3;

    const bucket = buckets.get(conf);
    if (bucket) {
      bucket.total++;
      if (success) bucket.successes++;
    }

    const topicName = r.topicName || "Unknown";
    if (!topicBuckets.has(topicName)) {
      const m = new Map<number, { total: number; successes: number }>();
      for (let c = 1; c <= 5; c++) m.set(c, { total: 0, successes: 0 });
      topicBuckets.set(topicName, m);
    }
    const tb = topicBuckets.get(topicName)!.get(conf);
    if (tb) {
      tb.total++;
      if (success) tb.successes++;
    }
  }

  // Build calibration curve (skip very sparse levels).
  const curve: CalibrationPoint[] = [];
  let totalDeviation = 0;
  let deviationPoints = 0;

  for (const [conf, bucket] of buckets) {
    if (bucket.total < 3) continue;
    const actual = (bucket.successes / bucket.total) * 100;
    const expected = PERFECT_RATE[conf] ?? 50;
    totalDeviation += Math.abs(actual - expected);
    deviationPoints++;
    curve.push({ confidence: conf, actualSuccessRate: Math.round(actual), count: bucket.total });
  }

  const overallDeviation =
    deviationPoints > 0 ? Math.round((totalDeviation / deviationPoints) * 100) / 100 : 0;

  // Classify.
  let classification: CalibrationData["classification"];
  if (deviationPoints < 3) {
    classification = "insufficient-data";
  } else if (overallDeviation < 10) {
    classification = "well-calibrated";
  } else {
    // Direction: are actual rates above or below expected on average?
    const signedSum = curve.reduce(
      (sum, p) => sum + (p.actualSuccessRate - (PERFECT_RATE[p.confidence] ?? 50)),
      0
    );
    classification = signedSum < 0 ? "overconfident" : "underconfident";
  }

  // Insight text.
  let insight: string;
  switch (classification) {
    case "well-calibrated":
      insight =
        "Your confidence ratings closely match your actual recall — excellent metacognition! You reliably know what you know.";
      break;
    case "overconfident":
      insight =
        "You tend to be overconfident — you rate your confidence higher than your actual success rate. Try being more conservative on the 4-5 range, especially on topics you reviewed less recently.";
      break;
    case "underconfident":
      insight =
        "You're underconfident — you actually recall better than you think! Trust your preparation more when rating confidence.";
      break;
    default:
      insight =
        "Keep reviewing with confidence ratings and this chart will reveal your calibration patterns.";
  }

  // Per-topic breakdown (only topics with >= 10 reviews across >= 2 levels).
  const topicBreakdown: TopicCalibration[] = [];
  for (const [topicName, confMap] of topicBuckets) {
    let tDev = 0;
    let tCount = 0;
    let tTotal = 0;
    for (const [conf, bucket] of confMap) {
      if (bucket.total < 2) continue;
      tTotal += bucket.total;
      const actual = (bucket.successes / bucket.total) * 100;
      tDev += Math.abs(actual - (PERFECT_RATE[conf] ?? 50));
      tCount++;
    }
    if (tTotal >= 10 && tCount >= 2) {
      topicBreakdown.push({
        topicName,
        deviation: Math.round((tDev / tCount) * 100) / 100,
        count: tTotal,
      });
    }
  }
  topicBreakdown.sort((a, b) => b.deviation - a.deviation);

  return {
    curve,
    overallDeviation,
    classification,
    topicBreakdown: topicBreakdown.slice(0, 10),
    totalReviewsWithJol: total,
    insight,
  };
}
