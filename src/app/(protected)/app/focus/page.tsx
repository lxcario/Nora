import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { FocusTimer } from "./_components/focus-timer";
import {
  computeRecommendation,
  type FocusSessionRecord,
} from "@/lib/focus-adaptive";

export const metadata = {
  title: "Focus Timer — Nora",
};

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch focus history + pet data in parallel
  const [historyResult, petResult] = await Promise.all([
    (async () => {
      if (!user) return [];
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from("study_sessions")
        .select("duration_minutes, started_at, ended_at")
        .eq("user_id", user!.id)
        .eq("mode", "focus")
        .gte("started_at", fourteenDaysAgo.toISOString());

      return (data ?? [])
        .filter((s) => typeof s.duration_minutes === "number")
        .map((s) => ({
          durationMinutes: s.duration_minutes as number,
          completedFull: Boolean(s.ended_at),
          createdAt: new Date(s.started_at as string),
        }));
    })(),
    (async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("pets")
        .select("pet_type, name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    })(),
  ]);

  const history: FocusSessionRecord[] = historyResult;
  const recommendation = computeRecommendation(history);

  // Build pet sprite URL (matches layout.tsx pattern)
  const pokemonId = parseInt(petResult?.pet_type ?? "25") || 25;
  const petSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`;
  const petName = petResult?.name ?? "Buddy";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Focus Timer"
        description="Light the candle, settle in, and let the blocks carry you through."
      />
      <FocusTimer
        recommendation={recommendation}
        petSprite={petSprite}
        petName={petName}
      />
    </div>
  );
}
