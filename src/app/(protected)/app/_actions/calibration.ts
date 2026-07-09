"use server";

import { createClient } from "@/lib/supabase/server";
import { computeCalibration, type CalibrationData } from "@/lib/calibration";

// ---------------------------------------------------------------------------
// Metacognition — JOL Calibration server action
// ---------------------------------------------------------------------------
// Fetches the user's confidence-rated reviews and delegates the calibration
// math to the pure computeCalibration() helper (unit-tested in
// src/lib/calibration.test.ts — thresholds and the <20-review gate).
// Spec: .kiro/specs/metacognition (Requirements 1–6).
// ---------------------------------------------------------------------------

export async function getCalibrationData(): Promise<{
  data?: CalibrationData;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch all reviews that have JOL confidence + a grade.
  const { data: reviews, error } = await supabase
    .from("card_reviews")
    .select("jol_confidence, grade, cards(topics(name))")
    .eq("user_id", user.id)
    .not("jol_confidence", "is", null)
    .not("grade", "is", null);

  if (error) return { error: error.message };

  const mapped = (reviews ?? [])
    .filter((r) => typeof r.jol_confidence === "number" && typeof r.grade === "number")
    .map((r) => ({
      confidence: r.jol_confidence as number,
      grade: r.grade as number,
      topicName:
        ((r.cards as unknown as { topics: { name: string } | null })?.topics?.name) ??
        "Unknown",
    }));

  return { data: computeCalibration(mapped) };
}
