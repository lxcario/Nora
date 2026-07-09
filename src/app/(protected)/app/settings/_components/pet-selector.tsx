"use client";

import { useState, useTransition } from "react";
import { STARTER_POKEMON, petSpriteUrl } from "@/lib/pokeapi";
import { choosePet } from "@/app/(protected)/app/_actions/gamification";
import { Loader2, Check } from "lucide-react";
import Image from "next/image";

export function PetSelector({ currentPetType }: { currentPetType: string | null }) {
  const [selected, setSelected] = useState<number | null>(
    currentPetType ? parseInt(currentPetType, 10) : null
  );
  const [nickname, setNickname] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      const result = await choosePet(
        selected,
        nickname || STARTER_POKEMON.find((p) => p.id === selected)?.name || "Buddy"
      );
      if (result.success) setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
        Choose your study companion — they grow and evolve as you level up.
        {currentPetType && (
          <span className="ml-1" style={{ color: "var(--pixel-text-muted)" }}>
            (Current: ID #{currentPetType})
          </span>
        )}
      </p>

      {/* Companion grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {STARTER_POKEMON.map((pokemon) => {
          const isSelected = selected === pokemon.id;
          return (
            <button
              key={pokemon.id}
              type="button"
              onClick={() => { setSelected(pokemon.id); setSaved(false); }}
              className="flex flex-col items-center gap-1 rounded-md p-2 transition-all"
              style={{
                border: `2px solid ${isSelected ? "var(--pixel-accent)" : "var(--pixel-border)"}`,
                backgroundColor: isSelected
                  ? "color-mix(in srgb, var(--pixel-accent) 12%, var(--pixel-bg-surface))"
                  : "var(--pixel-bg-secondary)",
              }}
            >
              <Image
                src={petSpriteUrl(pokemon.id)}
                alt={pokemon.name}
                width={40}
                height={40}
                className="pixel-art"
                unoptimized
              />
              <span
                className="font-pixel capitalize"
                style={{
                  fontSize: "9px",
                  color: isSelected ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
                }}
              >
                {pokemon.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Nickname + save */}
      {selected && (
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1 space-y-1.5">
            <label
              className="font-pixel text-xs tracking-wide"
              style={{ color: "var(--pixel-text-primary)" }}
            >
              Nickname (optional)
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={STARTER_POKEMON.find((p) => p.id === selected)?.name ?? "Buddy"}
              maxLength={20}
              className="w-full"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className="inline-flex items-center gap-2 !bg-[var(--pixel-accent)] !text-[var(--pixel-bg-primary)] hover:!brightness-110 font-pixel text-xs"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : null}
            {saved ? "Saved!" : "Choose Pet"}
          </button>
        </div>
      )}
    </div>
  );
}
