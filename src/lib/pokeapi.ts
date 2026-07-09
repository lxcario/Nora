/**
 * Local companion data for Nora's pet system.
 *
 * The exported function names are kept stable because the room and settings
 * flows already depend on them, but the data is now fully local: no external
 * character metadata or sprite service is needed at runtime.
 */

export interface PokemonData {
  id: number;
  name: string;
  sprite: string;
  spriteStatic: string;
  types: string[];
  evolutionChainId?: number;
}

type CompanionType =
  | "spark"
  | "leaf"
  | "ember"
  | "water"
  | "moon"
  | "stone"
  | "bloom"
  | "cloud";

type CompanionInfo = {
  id: number;
  name: string;
  types: CompanionType[];
};

const COMPANIONS: Record<number, CompanionInfo> = {
  25: { id: 25, name: "Nim", types: ["spark"] },
  26: { id: 26, name: "Nimbolt", types: ["spark"] },
  172: { id: 172, name: "Nimlet", types: ["spark"] },

  133: { id: 133, name: "Pip", types: ["cloud"] },
  134: { id: 134, name: "Pipstream", types: ["water"] },
  196: { id: 196, name: "Pipglow", types: ["moon"] },
  197: { id: 197, name: "Pipshade", types: ["moon"] },
  700: { id: 700, name: "Ribbon", types: ["bloom"] },

  1: { id: 1, name: "Moss", types: ["leaf"] },
  2: { id: 2, name: "Mossbud", types: ["leaf"] },
  3: { id: 3, name: "Mossbloom", types: ["leaf", "bloom"] },

  4: { id: 4, name: "Ember", types: ["ember"] },
  5: { id: 5, name: "Emberling", types: ["ember"] },
  6: { id: 6, name: "Emberwing", types: ["ember", "cloud"] },

  7: { id: 7, name: "Brook", types: ["water"] },
  8: { id: 8, name: "Brooklet", types: ["water"] },
  9: { id: 9, name: "Brookguard", types: ["water", "stone"] },

  152: { id: 152, name: "Clover", types: ["leaf"] },
  153: { id: 153, name: "Cloverleaf", types: ["leaf"] },
  154: { id: 154, name: "Cloverbloom", types: ["leaf", "bloom"] },

  155: { id: 155, name: "Kindle", types: ["ember"] },
  156: { id: 156, name: "Kindlepaw", types: ["ember"] },
  157: { id: 157, name: "Kindleflame", types: ["ember", "spark"] },

  258: { id: 258, name: "Ripple", types: ["water"] },
  259: { id: 259, name: "Ripplefin", types: ["water"] },
  260: { id: 260, name: "Rippletide", types: ["water", "stone"] },

  393: { id: 393, name: "Pebble", types: ["stone"] },
  394: { id: 394, name: "Pebblecoat", types: ["stone"] },
  395: { id: 395, name: "Pebblecrest", types: ["stone", "water"] },

  447: { id: 447, name: "Nova", types: ["spark"] },
  448: { id: 448, name: "Novafang", types: ["spark", "stone"] },

  175: { id: 175, name: "Dew", types: ["bloom"] },
  176: { id: 176, name: "Dewwing", types: ["bloom", "cloud"] },
  468: { id: 468, name: "Dewstar", types: ["bloom", "spark"] },

  39: { id: 39, name: "Luma", types: ["moon"] },
  40: { id: 40, name: "Lumapuff", types: ["moon", "cloud"] },
  174: { id: 174, name: "Luma Jr.", types: ["moon"] },

  52: { id: 52, name: "Mews", types: ["cloud"] },
  53: { id: 53, name: "Mewsly", types: ["cloud", "moon"] },
};

const EVOLUTION_CHAINS: Record<number, number[]> = {
  25: [25, 172, 26],
  133: [133, 196, 197],
  1: [1, 2, 3],
  4: [4, 5, 6],
  7: [7, 8, 9],
  152: [152, 153, 154],
  155: [155, 156, 157],
  258: [258, 259, 260],
  393: [393, 394, 395],
  447: [447, 448],
  175: [175, 176, 468],
  39: [39, 174, 40],
  52: [52, 53],
  700: [700],
};

const EVOLUTION_LEVELS = [1, 5, 15];

export const STARTER_POKEMON = [
  COMPANIONS[25],
  COMPANIONS[133],
  COMPANIONS[1],
  COMPANIONS[4],
  COMPANIONS[7],
  COMPANIONS[152],
  COMPANIONS[155],
  COMPANIONS[258],
  COMPANIONS[393],
  COMPANIONS[447],
  COMPANIONS[175],
  COMPANIONS[39],
];

export function petSpriteUrl(id: number | string): string {
  return `/sprites/pets/${id}.gif`;
}

export async function getPokemon(idOrName: number | string): Promise<PokemonData | null> {
  const id = typeof idOrName === "number" ? idOrName : parseInt(idOrName, 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  const companion = COMPANIONS[id] ?? {
    id,
    name: `Companion ${id}`,
    types: ["cloud"] as CompanionType[],
  };

  return {
    id: companion.id,
    name: companion.name,
    sprite: petSpriteUrl(companion.id),
    spriteStatic: petSpriteUrl(companion.id),
    types: companion.types,
  };
}

export async function getEvolutionChain(companionId: number): Promise<{
  currentStage: number;
  evolutions: { id: number; name: string; minLevel: number }[];
} | null> {
  const chain =
    EVOLUTION_CHAINS[companionId] ??
    Object.values(EVOLUTION_CHAINS).find((ids) => ids.includes(companionId));

  if (!chain) return null;

  return {
    currentStage: Math.max(0, chain.indexOf(companionId)),
    evolutions: chain.map((id, index) => ({
      id,
      name: COMPANIONS[id]?.name ?? `Companion ${id}`,
      minLevel: EVOLUTION_LEVELS[index] ?? index * 10,
    })),
  };
}

export function getEvolutionForLevel(
  evolutions: { id: number; name: string; minLevel: number }[],
  userLevel: number
): { id: number; name: string } {
  let current = evolutions[0];
  for (const evolution of evolutions) {
    if (userLevel >= evolution.minLevel) current = evolution;
  }
  return current;
}
