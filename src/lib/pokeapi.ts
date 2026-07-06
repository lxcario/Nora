/**
 * PokéAPI integration for the pet system.
 * Uses free PokeAPI v2 — no API key needed.
 * Sprites are served from raw.githubusercontent.com.
 */

export interface PokemonData {
  id: number;
  name: string;
  sprite: string; // animated pixel sprite URL
  spriteStatic: string; // static fallback
  types: string[];
  evolutionChainId?: number;
}

// Starter Pokémon options for pet selection (Gen 1-3, cute ones)
export const STARTER_POKEMON = [
  { id: 25, name: "Pikachu" },
  { id: 133, name: "Eevee" },
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 7, name: "Squirtle" },
  { id: 152, name: "Chikorita" },
  { id: 155, name: "Cyndaquil" },
  { id: 258, name: "Mudkip" },
  { id: 393, name: "Piplup" },
  { id: 447, name: "Riolu" },
  { id: 175, name: "Togepi" },
  { id: 39, name: "Jigglypuff" },
];

/**
 * Resolves a Pokémon id to its self-hosted animated sprite.
 * Sprites live in `public/sprites/pets/` so the pet system never depends on a
 * flaky third-party image host (raw.githubusercontent rate-limits hotlinks).
 */
export function petSpriteUrl(id: number | string): string {
  return `/sprites/pets/${id}.gif`;
}

/**
 * Fetches Pokémon metadata (name, types) from PokeAPI for the given id.
 * The sprite is always served locally via {@link petSpriteUrl}, so the pet
 * still renders even when the PokeAPI JSON endpoint is unreachable.
 */
export async function getPokemon(idOrName: number | string): Promise<PokemonData | null> {
  const numericHint = typeof idOrName === "number" ? idOrName : parseInt(idOrName, 10);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`, {
      next: { revalidate: 86400 }, // cache for 24h
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        sprite: petSpriteUrl(data.id),
        spriteStatic: petSpriteUrl(data.id),
        types: data.types?.map((t: { type: { name: string } }) => t.type.name) ?? [],
      };
    }
  } catch {
    // fall through to the offline-safe fallback below
  }

  // Offline / not-found fallback: still show the local sprite if we have an id.
  if (Number.isFinite(numericHint) && numericHint > 0) {
    return {
      id: numericHint,
      name: typeof idOrName === "string" ? idOrName : `pokemon-${numericHint}`,
      sprite: petSpriteUrl(numericHint),
      spriteStatic: petSpriteUrl(numericHint),
      types: [],
    };
  }
  return null;
}

/**
 * Gets the evolution chain for a Pokémon to determine next evolution.
 */
export async function getEvolutionChain(pokemonId: number): Promise<{
  currentStage: number;
  evolutions: { id: number; name: string; minLevel: number }[];
} | null> {
  try {
    // First get the species to find evolution chain URL
    const speciesRes = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`,
      { next: { revalidate: 86400 } }
    );
    if (!speciesRes.ok) return null;
    const speciesData = await speciesRes.json();

    const chainUrl = speciesData.evolution_chain?.url;
    if (!chainUrl) return null;

    const chainRes = await fetch(chainUrl, { next: { revalidate: 86400 } });
    if (!chainRes.ok) return null;
    const chainData = await chainRes.json();

    // Parse evolution chain
    const evolutions: { id: number; name: string; minLevel: number }[] = [];
    let currentStage = 0;

    function parseChain(chain: Record<string, unknown>, stage: number) {
      const species = chain.species as { name: string; url: string };
      const speciesId = parseInt(species.url.split("/").filter(Boolean).pop() ?? "0");
      const evolveDetails = (chain.evolution_details as { min_level: number }[]) ?? [];
      const minLevel = evolveDetails[0]?.min_level ?? stage * 15;

      evolutions.push({ id: speciesId, name: species.name, minLevel });

      if (speciesId === pokemonId) {
        currentStage = stage;
      }

      const evolvesTo = chain.evolves_to as Record<string, unknown>[];
      if (evolvesTo?.length > 0) {
        parseChain(evolvesTo[0], stage + 1);
      }
    }

    parseChain(chainData.chain, 0);
    return { currentStage, evolutions };
  } catch {
    return null;
  }
}

/**
 * Determines which Pokémon the user should have based on their level.
 * Evolution at level 5 and level 15.
 */
export function getEvolutionForLevel(
  evolutions: { id: number; name: string; minLevel: number }[],
  userLevel: number
): { id: number; name: string } {
  // Map user levels to evolution stages
  // Stage 0: level 1-4, Stage 1: level 5-14, Stage 2: level 15+
  if (userLevel >= 15 && evolutions.length >= 3) {
    return evolutions[2];
  }
  if (userLevel >= 5 && evolutions.length >= 2) {
    return evolutions[1];
  }
  return evolutions[0];
}
