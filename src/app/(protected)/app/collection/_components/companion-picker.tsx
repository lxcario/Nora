"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { petSpriteUrl } from "@/lib/pokeapi";
import { choosePet } from "@/app/(protected)/app/_actions/gamification";

type Companion = { id: number; name: string };

const COMPANIONS: Companion[] = [
  { id: 25, name: "Nim" },
  { id: 133, name: "Pip" },
  { id: 39, name: "Luma" },
  { id: 52, name: "Mews" },
  { id: 175, name: "Dew" },
  { id: 196, name: "Pipglow" },
  { id: 197, name: "Pipshade" },
  { id: 393, name: "Pebble" },
  { id: 447, name: "Nova" },
  { id: 700, name: "Ribbon" },
];

export function CompanionPicker({ currentPetType }: { currentPetType?: string | null }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [chosenId, setChosenId] = useState<number | null>(
    currentPetType ? parseInt(currentPetType, 10) || null : null
  );
  const [isPending, startTransition] = useTransition();

  function pick(c: Companion) {
    if (isPending) return;
    setPendingId(c.id);
    startTransition(async () => {
      const res = await choosePet(c.id, c.name);
      if (res.success) {
        setChosenId(c.id);
        router.refresh(); // update sidebar + room to the new companion
      }
      setPendingId(null);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {COMPANIONS.map((c) => {
          const isChosen = chosenId === c.id;
          const isLoading = isPending && pendingId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              disabled={isPending}
              aria-pressed={isChosen}
              aria-label={`Choose ${c.name} as your companion`}
              className="pixel-panel pixel-panel-inset relative flex flex-col items-center gap-1 py-2 px-1 pixel-hover-brighten disabled:opacity-60"
              style={{
                borderColor: isChosen ? "var(--pixel-accent)" : undefined,
                boxShadow: isChosen ? "0 0 0 2px var(--pixel-accent) inset" : undefined,
              }}
            >
              {isChosen && (
                <span
                  className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--pixel-accent)" }}
                >
                  <Check className="h-2.5 w-2.5 text-[var(--pixel-bg-primary)]" />
                </span>
              )}
              {isLoading ? (
                <span className="flex h-10 w-10 items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--pixel-accent)]" />
                </span>
              ) : (
                <Image
                  src={petSpriteUrl(c.id)}
                  alt={c.name}
                  width={40}
                  height={40}
                  className="pixel-art"
                  unoptimized
                />
              )}
              <span
                className="font-pixel text-[8px] text-center"
                style={{ color: isChosen ? "var(--pixel-accent)" : "var(--pixel-text-primary)" }}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[9px] font-pixel" style={{ color: "var(--pixel-text-muted)" }}>
        {chosenId
          ? "Companion set — see them in your sidebar and Pixel Room. They evolve as you level up."
          : "Tap a companion to set them as your study buddy. They evolve as you level up."}
      </p>
    </div>
  );
}
