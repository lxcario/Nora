"use server";

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Metacognition — JOL Calibration server action
// ---------------------------------------------------------------------------
// Computes the correlation between the student's confidence ratings (1-5)
// and their actual recall success (grade >= 3 = success). Returns a
// calibration curve, overall deviation, and per-topic breakdown.
// Spec: .kiro/specs/metacognition (Requirements 1–6)
// ---------------------------------------------------------------------------

export interface CalibrationPoint {
  confidence: number;        // 1-5
  actualSuccessRate: number; // 0-100%
  count: number;             // how many reviews at this confidence level
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
  classification: "well-calibrated" | "overconfident" | "underconfident" | "insufficient-data";
  /** Per-topic deviation (worst first) */
  topicBreakdown: TopicCalibration[];
  /** Total reviews with JOL data */
  totalReviewsWithJol: number;
  /** Insight text for the student */
  insight: string;
}

/**
 * Perfect calibration mapping: confidence 1→20%, 2→40%, 3→60%, 4→80%, 5→100%
 */
const PERFECT_RATE: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

export async function getCalibrationData(): Promise<{
  data?: CalibrationData;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch all reviews that have JOL confidence + a grade
  const { data: reviews, error } = await supabase
    .from("card_reviews")
    .select("jol_confidence, grade, cards(topics(name))")
    .eq("user_id", user.id)
    .not("jol_confidence", "is", null)
    .not("grade", "is", null);

  if (error) return { error: error.message };

  const allReviews = (reviews ?? []).filter(
    (r) => typeof r.jol_confidence === "number" && typeof r.grade === "number"
  );

  if (allReviews.length < 20) {
    return {
      data: {
        curve: [],
        overallDeviation: 0,
        classification: "insufficient-data",
        topicBreakdown: [],
        totalReviewsWithJol: allReviews.length,
        insight: `You need at least 20 reviews with confidence ratings to see calibration data. You have ${allReviews.length} so far — keep reviewing!`,
      },
    };
  }

  // Compute per-confidence-level success rates
  const buckets = new Map<number, { total: number; successes: number }>();
  for (let c = 1; c <= 5; c++) buckets.set(c, { total: 0, successes: 0 });

  // Per-topic aggregation
  const topicBuckets = new Map<string, Map<number, { total: number; successes: number }>>();

  for (const r of allReviews) {
    const conf = r.jol_confidence as number;
    const grade = r.grade as number;
    const success = grade >= 3;

    const bucket = buckets.get(conf);
    if (bucket) {
      bucket.total++;
      if (success) bucket.successes++;
    }

    // Topic breakdown
    const topicName = ((r.cards as unknown as { topics: { name: string } | null })?.topics?.name) ?? "Unknown";
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

  // Build calibration curve
  const curve: CalibrationPoint[] = [];
  let totalDeviation = 0;
  let deviationPoints = 0;

  for (const [conf, bucket] of buckets) {
    if (bucket.total < 3) continue; // skip very sparse levels
    const actual = (bucket.successes / bucket.total) * 100;
    const expected = PERFECT_RATE[conf] ?? 50;
    const dev = actual - expected;
    totalDeviation += Math.abs(dev);
    deviationPoints++;
    curve.push({ confidence: conf, actualSuccessRate: Math.round(actual), count: bucket.total });
  }

  const overallDeviation = deviationPoints > 0
    ? Math.round((totalDeviation / deviationPoints) * 100) / 100
    : 0;

  // Classify
  let classification: CalibrationData["classification"];
  if (deviationPoints < 3) {
    classification = "insufficient-data";
  } else if (overallDeviation < 10) {
    classification = "well-calibrated";
  } else {
    // Determine direction: are actual rates above or below expected on average?
    const signedSum = curve.reduce(
      (sum, p) => sum + (p.actualSuccessRate - (PERFECT_RATE[p.confidence] ?? 50)),
      0
    );
    classification = signedSum < 0 ? "overconfident" : "underconfident";
  }

  // Insight text
  let insight: string;
  switch (classification) {
    case "well-calibrated":
      insight = "Your confidence ratings closely match your actual recall — excellent metacognition! You reliably know what you know.";
      break;
    case "overconfident":
      insight = "You tend to be overconfident — you rate your confidence higher than your actual success rate. Try being more conservative on the 4-5 range, especially on topics you reviewed less recently.";
      break;
    case "underconfident":
      insight = "You're underconfident — you actually recall better than you think! Trust your preparation more when rating confidence.";
      break;
    default:
      insight = "Keep reviewing with confidence ratings and this chart will reveal your calibration patterns.";
  }

  // Per-topic breakdown (only topics with >= 10 reviews)
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
    data: {
      curve,
      overallDeviation,
      classification,
      topicBreakdown: topicBreakdown.slice(0, 10),
      totalReviewsWithJol: allReviews.length,
      insight,
    },
  };
}
