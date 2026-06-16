"use server";

import { createClient } from "@/lib/supabase/server";
import { getPokemon, getEvolutionChain, getEvolutionForLevel } from "@/lib/pokeapi";

export interface RoomState {
  avatar: {
    body: string;
    head: string;
    hair: string;
    outfit: string;
    accessory: string | null;
  };
  pet: {
    pokemonId: number;
    name: string;
    sprite: string;
    types: string[];
    state: "happy" | "neutral" | "sad" | "forest_rescue";
    affinity: number;
    canEvolve: boolean;
    nextEvolution: string | null;
  };
  profile: {
    xp: number;
    coins: number;
    level: number;
  };
  missions: {
    label: string;
    mode: string;
    done: boolean;
  }[];
}

/**
 * Fetches the user's pixel room state with PokéAPI pet data.
 */
export async function getRoomState(): Promise<{
  data?: RoomState;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level")
    .eq("id", user.id)
    .single();

  // Fetch avatar (or defaults)
  const { data: avatar } = await supabase
    .from("avatars")
    .select("body, head, hair, outfit, accessory")
    .eq("user_id", user.id)
    .single();

  // Fetch pet (pet_type stores the base pokemon ID)
  const { data: pet } = await supabase
    .from("pets")
    .select("pet_type, name, state, affinity")
    .eq("user_id", user.id)
    .single();

  // Get base pokemon ID (default to Pikachu = 25)
  const basePokemonId = parseInt(pet?.pet_type ?? "25") || 25;
  const userLevel = profile?.level ?? 1;

  // Check evolution chain
  let currentPokemonId = basePokemonId;
  let canEvolve = false;
  let nextEvolution: string | null = null;

  const evoChain = await getEvolutionChain(basePokemonId);
  if (evoChain && evoChain.evolutions.length > 1) {
    const evolved = getEvolutionForLevel(evoChain.evolutions, userLevel);
    currentPokemonId = evolved.id;

    // Check if next evolution is close
    const currentIdx = evoChain.evolutions.findIndex((e) => e.id === currentPokemonId);
    if (currentIdx < evoChain.evolutions.length - 1) {
      const next = evoChain.evolutions[currentIdx + 1];
      nextEvolution = next.name;
      // Can evolve if within 2 levels
      canEvolve = userLevel >= (currentIdx + 1) * 5 - 2;
    }
  }

  // Fetch Pokemon sprite from PokeAPI
  const pokemonData = await getPokemon(currentPokemonId);

  // Compute pet state from recent activity (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const { count: recentSessions } = await supabase
    .from("study_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", threeDaysAgo.toISOString());

  let petState: RoomState["pet"]["state"] = "happy";
  const sessionCount = recentSessions ?? 0;
  if (sessionCount === 0) petState = "sad";
  else if (sessionCount < 2) petState = "neutral";

  // Count due cards for missions
  const today = new Date().toISOString().split("T")[0];
  const { count: dueCards } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("next_review_at", today);

  const { count: feynmanToday } = await supabase
    .from("feynman_explanations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00`);

  const { count: sessionsToday } = await supabase
    .from("study_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", `${today}T00:00:00`);

  const missions: RoomState["missions"] = [
    {
      label: "Complete 1 Feynman explanation",
      mode: "feynman",
      done: (feynmanToday ?? 0) > 0,
    },
    {
      label: `Review ${Math.min(dueCards ?? 0, 20)} flashcards`,
      mode: "review",
      done: (dueCards ?? 0) === 0,
    },
    {
      label: "Complete a 25-minute focus session",
      mode: "session",
      done: (sessionsToday ?? 0) > 0,
    },
  ];

  return {
    data: {
      avatar: avatar ?? {
        body: "base_male",
        head: "default",
        hair: "short_brown",
        outfit: "casual",
        accessory: null,
      },
      pet: {
        pokemonId: currentPokemonId,
        name: pet?.name ?? pokemonData?.name ?? "Pikachu",
        sprite: pokemonData?.sprite ?? "",
        types: pokemonData?.types ?? [],
        state: petState,
        affinity: pet?.affinity ?? 50,
        canEvolve,
        nextEvolution,
      },
      profile: {
        xp: profile?.xp ?? 0,
        coins: profile?.coins ?? 0,
        level: profile?.level ?? 1,
      },
      missions,
    },
  };
}
