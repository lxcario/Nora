"use client";

import { useState, useTransition } from "react";
import { STARTER_POKEMON } from "@/lib/pokeapi";
import { choosePet } from "@/app/(protected)/app/_actions/gamification";
import { Loader2, Check } from "lucide-react";
import Image from "next/image";

export function PetSelector({ currentPetType }: { currentPetType: string | null }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      const result = await choosePet(selected, nickname || STARTER_POKEMON.find(p => p.id === selected)?.name || "Buddy");
      if (result.success) setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Choose your study companion! They&apos;ll grow and evolve as you level up.
        {currentPetType && (
          <span className="ml-1 text-zinc-400">
            (Current: ID #{currentPetType})
          </span>
        )}
      </p>

      {/* Pokemon grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {STARTER_POKEMON.map((pokemon) => (
          <button
            key={pokemon.id}
            onClick={() => { setSelected(pokemon.id); setSaved(false); }}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
              selected === pokemon.id
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
            }`}
          >
            <Image
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.id}.gif`}
              alt={pokemon.name}
              width={40}
              height={40}
              className="pixel-art"
              unoptimized
            />
            <span className="text-[10px] capitalize">{pokemon.name}</span>
          </button>
        ))}
      </div>

      {/* Nickname + save */}
      {selected && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-zinc-500">Nickname (optional)</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={STARTER_POKEMON.find(p => p.id === selected)?.name}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? "Saved!" : "Choose Pet"}
          </button>
        </div>
      )}
    </div>
  );
}
