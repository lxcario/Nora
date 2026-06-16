"use client";

import { type RoomState } from "@/app/(protected)/app/_actions/room";
import { type DailyQuote } from "@/app/(protected)/app/_actions/quotes";
import { type PartyPresenceMember } from "@/app/(protected)/app/_actions/party-presence";
import {
  Star,
  Coins,
  Heart,
  User,
  CheckSquare,
  Square,
  PenLine,
  Layers,
  Timer,
  Sparkles,
  TrendingUp,
  Zap,
  Quote,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PartyPresenceIndicator } from "./party-presence-indicator";

const PET_MESSAGES: Record<string, string> = {
  happy: "is happy! Keep studying consistently.",
  neutral: "misses you. Study a bit more to cheer them up!",
  sad: "is sad... Complete a session to start improving their mood.",
  forest_rescue: "has retreated. Complete a restorative quest!",
};

const MISSION_ICONS: Record<string, typeof PenLine> = {
  feynman: PenLine,
  review: Layers,
  session: Timer,
};

const STATE_BORDER: Record<string, string> = {
  happy: "border-emerald-500 shadow-emerald-500/20",
  neutral: "border-amber-500 shadow-amber-500/20",
  sad: "border-red-500 shadow-red-500/20",
  forest_rescue: "border-zinc-500 shadow-zinc-500/20",
};

export function PixelRoom({ state, quote, studyingMembers }: { state: RoomState; quote: DailyQuote; studyingMembers: PartyPresenceMember[] }) {
  const completedMissions = state.missions.filter((m) => m.done).length;
  const totalMissions = state.missions.length;

  return (
    <div className="space-y-4">
      {/* Room viewport */}
      <div className="relative overflow-hidden rounded-sm bg-[#2a1f15]" style={{ border: "3px solid #5a3d2e" }}>
        {/* Party presence indicators — bottom-right of room viewport */}
        <PartyPresenceIndicator members={studyingMembers} />
        {/* Room scene */}
        <div className="relative mx-auto flex h-[360px] w-full max-w-[640px] items-end justify-center gap-8 px-8 pb-16">
          {/* Room background elements */}
          <div className="absolute inset-0">
            {/* Wall */}
            <div className="absolute left-0 right-0 top-0 h-[45%] bg-gradient-to-b from-[#2a1f15] to-[#3d2817]">
              {/* Window */}
              <div className="absolute left-[12%] top-[15%] h-[65%] w-[16%] rounded-t-lg border-2 border-[#5a3d2e] bg-gradient-to-b from-[#87ceeb] to-[#4a9abb]">
                <div className="absolute inset-[3px] grid grid-cols-2 grid-rows-2 gap-[2px]">
                  <div className="rounded-tl bg-white/10" />
                  <div className="rounded-tr bg-white/10" />
                  <div className="bg-white/5" />
                  <div className="bg-white/5" />
                </div>
              </div>
              {/* Shelf with books */}
              <div className="absolute right-[10%] top-[25%] h-[6%] w-[22%] bg-[#5a3d2e] shadow-md">
                <div className="absolute -top-4 left-2 h-4 w-2.5 rounded-sm bg-[#e74c3c]" />
                <div className="absolute -top-5 left-6 h-5 w-2 rounded-sm bg-[#3498db]" />
                <div className="absolute -top-4 left-10 h-4 w-3 rounded-sm bg-[#2ecc71]" />
                <div className="absolute -top-3 left-14 h-3 w-2 rounded-sm bg-[#f1c40f]" />
              </div>
            </div>
            {/* Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-[55%] bg-[#4a3520]">
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent, transparent 39px, #000 39px, #000 40px), repeating-linear-gradient(0deg, transparent, transparent 39px, #000 39px, #000 40px)",
                }}
              />
            </div>
            {/* Warm lamp glow */}
            <div className="absolute top-[20%] left-[30%] w-32 h-32 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #d4a526 0%, transparent 70%)" }}
            />
            {/* Cozy rug */}
            <div className="absolute bottom-[25%] left-[30%] w-[25%] h-[8%] rounded-sm opacity-80"
              style={{ backgroundColor: "#8b4513", border: "2px solid #5a3d2e" }}
            />
            {/* Desk */}
            <div className="absolute bottom-[20%] right-[6%] h-[15%] w-[28%] rounded-t bg-[#6b4423]">
              <div className="absolute -top-8 left-[25%] h-8 w-10 rounded-t border-2 border-zinc-600 bg-zinc-800" />
              <div className="absolute -top-1 left-[28%] h-1 w-6 bg-zinc-600" />
            </div>
          </div>

          {/* Avatar */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex h-20 w-14 flex-col items-center justify-center rounded-t-lg border-2 border-zinc-600 bg-zinc-700/80">
              <User className="h-8 w-8 text-zinc-400" />
            </div>
            <div className="h-2 w-12 rounded-b bg-zinc-800" />
            <span className="font-pixel mt-1 text-[10px] text-zinc-400">You</span>
          </div>

          {/* Pokémon Pet */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`rounded-full border-2 bg-zinc-800/60 p-2 shadow-lg ${STATE_BORDER[state.pet.state]}`}
              style={state.pet.state === "happy" ? { boxShadow: "0 0 20px rgba(212, 165, 38, 0.3)" } : undefined}
            >
              {state.pet.sprite ? (
                <Image
                  src={state.pet.sprite}
                  alt={state.pet.name}
                  width={64}
                  height={64}
                  className="pixel-art"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center text-2xl">
                  ?
                </div>
              )}
            </div>
            <span className="font-pixel mt-1 text-[10px] text-zinc-300 capitalize">
              {state.pet.name}
            </span>
            {state.pet.canEvolve && (
              <span className="font-pixel mt-0.5 flex items-center gap-0.5 text-[8px] text-amber-400">
                <Zap className="h-2.5 w-2.5" /> Ready to evolve!
              </span>
            )}
          </div>
        </div>

        {/* HUD overlay */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-black/60 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-xs text-white">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-400" />
              <span className="font-pixel">Lv.{state.profile.level}</span>
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span className="font-pixel">{state.profile.xp} XP</span>
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-400" />
              <span className="font-pixel">{state.profile.coins}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white">
            <span className="font-pixel capitalize">{state.pet.name}</span>
            <span className="flex items-center gap-1">
              <Heart
                className={`h-3 w-3 ${
                  state.pet.affinity > 70
                    ? "text-red-400"
                    : state.pet.affinity > 40
                      ? "text-amber-400"
                      : "text-zinc-400"
                }`}
              />
              <span className="font-pixel">{state.pet.affinity}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pet status */}
      <div
        className="rounded-sm p-3 text-sm"
        style={{
          border: `2px solid ${
            state.pet.state === "happy"
              ? "var(--pixel-success)"
              : state.pet.state === "neutral"
                ? "var(--pixel-warning)"
                : "var(--pixel-error)"
          }`,
          backgroundColor:
            state.pet.state === "happy"
              ? "color-mix(in srgb, var(--pixel-success) 10%, transparent)"
              : state.pet.state === "neutral"
                ? "color-mix(in srgb, var(--pixel-warning) 10%, transparent)"
                : "color-mix(in srgb, var(--pixel-error) 10%, transparent)",
          color:
            state.pet.state === "happy"
              ? "var(--pixel-success)"
              : state.pet.state === "neutral"
                ? "var(--pixel-warning)"
                : "var(--pixel-error)",
        }}
      >
        <div className="flex items-center gap-2">
          {state.pet.sprite && (
            <Image src={state.pet.sprite} alt="" width={24} height={24} className="pixel-art" unoptimized />
          )}
          <span className="font-pixel font-medium capitalize">
            {state.pet.name} {PET_MESSAGES[state.pet.state]}
          </span>
        </div>
        {state.pet.nextEvolution && (
          <p className="mt-1 text-xs opacity-80">
            Next evolution: <span className="capitalize font-medium">{state.pet.nextEvolution}</span> (at level {state.profile.level < 5 ? 5 : 15})
          </p>
        )}
      </div>

      {/* Daily Quote */}
      <div className="rounded-sm p-4" style={{
        border: "2px solid var(--pixel-border-light)",
        backgroundColor: "var(--pixel-bg-surface)",
      }}>
        <div className="flex items-start gap-2">
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pixel-text-secondary)]" />
          <div>
            <p className="text-sm italic text-[var(--pixel-text-secondary)]">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="font-pixel mt-1 text-xs text-[var(--pixel-text-secondary)]">— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* Today's Missions */}
      <div className="rounded-sm p-4" style={{
        border: "2px solid var(--pixel-border-light)",
        backgroundColor: "var(--pixel-bg-surface)",
      }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-pixel flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-[var(--pixel-text-secondary)]" />
            Today&apos;s Missions
          </h2>
          <span className="font-pixel text-xs text-[var(--pixel-text-secondary)]">
            {completedMissions}/{totalMissions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--pixel-bg-secondary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(completedMissions / totalMissions) * 100}%`, backgroundColor: "var(--pixel-success)" }}
          />
        </div>

        <div className="space-y-2">
          {state.missions.map((mission, i) => {
            const Icon = MISSION_ICONS[mission.mode] ?? Timer;
            const href =
              mission.mode === "feynman"
                ? "/app/feynman"
                : mission.mode === "review"
                  ? "/app/review"
                  : "/app/planner";

            return (
              <Link
                key={i}
                href={href}
                className="flex items-center gap-3 rounded-sm px-3 py-2 transition-colors"
                style={{
                  backgroundColor: mission.done
                    ? "color-mix(in srgb, var(--pixel-success) 10%, transparent)"
                    : "var(--pixel-bg-secondary)",
                }}
              >
                <Icon className={`h-4 w-4 ${mission.done ? "text-[var(--pixel-success)]" : "text-[var(--pixel-text-secondary)]"}`} />
                <span
                  className={`flex-1 text-sm ${
                    mission.done
                      ? "line-through text-[var(--pixel-text-secondary)]"
                      : "text-[var(--pixel-text-primary)]"
                  }`}
                >
                  {mission.label}
                </span>
                {mission.done ? (
                  <CheckSquare className="h-4 w-4 text-[var(--pixel-success)]" />
                ) : (
                  <Square className="h-4 w-4 text-[var(--pixel-text-secondary)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
