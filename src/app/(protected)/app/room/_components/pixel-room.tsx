"use client";

import { type RoomState } from "@/app/(protected)/app/_actions/room";
import { type DailyQuote } from "@/app/(protected)/app/_actions/quotes";
import { type PartyPresenceMember } from "@/app/(protected)/app/_actions/party-presence";
import {
  Heart,
  CheckSquare,
  Square,
  PenLine,
  Layers,
  Timer,
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

// A small furniture sprite placed in the room
function Furniture({
  icon,
  size = 36,
  className,
  style,
  label,
}: {
  icon: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) {
  return (
    <div className={`absolute flex flex-col items-center ${className ?? ""}`} style={style}>
      <img
        src={`/sprites/travel-book/icons/${icon}.png`}
        alt={label ?? ""}
        width={size}
        height={size}
        className="pixel-art animate-pixel-float"
        draggable={false}
      />
    </div>
  );
}

export function PixelRoom({
  state,
  quote,
  studyingMembers,
}: {
  state: RoomState;
  quote: DailyQuote;
  studyingMembers: PartyPresenceMember[];
}) {
  const completedMissions = state.missions.filter((m) => m.done).length;
  const totalMissions = state.missions.length;

  return (
    <div className="space-y-4">
      {/* ═══ Room viewport ═══ */}
      <div className="pixel-panel pixel-panel-lg relative overflow-hidden p-0">
        <PartyPresenceIndicator members={studyingMembers} />

        {/* Scene */}
        <div className="relative h-[360px] w-full overflow-hidden">
          {/* ── Wall ── */}
          <div
            className="absolute inset-x-0 top-0 h-[48%]"
            style={{
              backgroundColor: "var(--pixel-room-wall, #3a2a1c)",
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 18px)",
              imageRendering: "pixelated",
            }}
          >
            {/* Window — slot-framed sky */}
            <div
              className="pixel-panel absolute left-[8%] top-[18%] h-[60%] w-[18%] overflow-hidden p-0"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #6fb7d6 0%, #a9d8e6 60%, #cdeaf0 100%)",
              }}
            >
              {/* sun */}
              <img
                src="/sprites/travel-book/icons/Sun.png"
                alt=""
                width={20}
                height={20}
                className="pixel-art absolute right-1 top-1 animate-pixel-float"
              />
              {/* a cloud */}
              <img
                src="/sprites/travel-book/icons/Cloud.png"
                alt=""
                width={22}
                height={22}
                className="pixel-art absolute left-1 bottom-2 opacity-90"
              />
            </div>

            {/* Framed picture */}
            <div
              className="pixel-panel absolute right-[10%] top-[20%] flex h-12 w-12 items-center justify-center p-0"
            >
              <img
                src="/sprites/travel-book/icons/Flower.png"
                alt=""
                width={22}
                height={22}
                className="pixel-art"
              />
            </div>

            {/* Wall shelf with books */}
            <div
              className="absolute right-[26%] top-[40%] h-2 w-[24%]"
              style={{ backgroundColor: "var(--pixel-room-shelf, #5a3d2e)" }}
            >
              <img src="/sprites/travel-book/icons/Book.png" alt="" width={16} height={16} className="pixel-art absolute -top-4 left-1" />
              <img src="/sprites/travel-book/icons/Book.png" alt="" width={16} height={16} className="pixel-art absolute -top-4 left-6" style={{ filter: "hue-rotate(120deg)" }} />
              <img src="/sprites/travel-book/icons/CD.png" alt="" width={16} height={16} className="pixel-art absolute -top-4 left-12" />
            </div>
          </div>

          {/* ── Floor ── */}
          <div
            className="absolute inset-x-0 bottom-0 h-[52%]"
            style={{
              backgroundColor: "var(--pixel-room-floor, #5a3d24)",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 30px), repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 72px)",
              imageRendering: "pixelated",
            }}
          >
            {/* Rug */}
            <div
              className="absolute left-1/2 top-[34%] h-[42%] w-[44%] -translate-x-1/2"
              style={{
                backgroundColor: "color-mix(in srgb, var(--pixel-accent) 30%, var(--pixel-room-floor, #5a3d24))",
                border: "3px solid var(--pixel-border-light)",
                imageRendering: "pixelated",
              }}
            />
          </div>

          {/* Warm hearth glow */}
          <div
            className="pointer-events-none absolute left-1/2 top-[30%] h-48 w-48 -translate-x-1/2 opacity-25"
            style={{ background: "radial-gradient(circle, var(--pixel-accent) 0%, transparent 70%)" }}
          />

          {/* ── Furniture ── */}
          <Furniture icon="FlowerPot" size={40} style={{ left: "8%", bottom: "8%" }} label="Plant" />
          <Furniture icon="Piano" size={44} style={{ right: "10%", bottom: "10%" }} label="Piano" />
          <Furniture icon="Monitor" size={34} style={{ right: "30%", bottom: "30%" }} label="Computer" />

          {/* ── Avatar ── */}
          <div className="absolute bottom-[14%] left-[34%] flex flex-col items-center">
            <div className="pixel-panel flex h-12 w-12 items-center justify-center p-0">
              <img
                src="/sprites/travel-book/icons/CatHead.png"
                alt="You"
                width={28}
                height={28}
                className="pixel-art"
              />
            </div>
            <span className="font-pixel mt-1 text-[10px] text-[var(--pixel-text-secondary)]">
              You
            </span>
          </div>

          {/* ── Pet centerpiece ── */}
          <div className="absolute bottom-[14%] left-[52%] flex flex-col items-center">
            <div className={state.pet.canEvolve ? "animate-pixel-wiggle" : "animate-pixel-float"}>
              {state.pet.sprite ? (
                <Image
                  src={state.pet.sprite}
                  alt={state.pet.name}
                  width={72}
                  height={72}
                  className="pixel-art"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center text-2xl">?</div>
              )}
            </div>
            <span className="font-pixel mt-1 text-[10px] capitalize text-[var(--pixel-text-primary)]">
              {state.pet.name}
            </span>
            {state.pet.canEvolve && (
              <span className="font-pixel mt-0.5 flex items-center gap-0.5 text-[8px] text-[var(--pixel-accent)]">
                <Zap className="h-2.5 w-2.5" /> Ready to evolve!
              </span>
            )}
          </div>

          {/* ── HUD overlay ── */}
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-black/55 px-4 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-xs text-white">
              <span className="flex items-center gap-1">
                <img src="/sprites/travel-book/icons/Sun.png" alt="" width={12} height={12} className="pixel-art" />
                <span className="font-pixel">Lv.{state.profile.level}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-pixel">{state.profile.xp} XP</span>
              </span>
              <span className="flex items-center gap-1">
                <img src="/sprites/travel-book/icons/Coin.png" alt="" width={12} height={12} className="pixel-art" />
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
            Next evolution:{" "}
            <span className="capitalize font-medium">{state.pet.nextEvolution}</span>{" "}
            (at level {state.profile.level < 5 ? 5 : 15})
          </p>
        )}
      </div>

      {/* Daily Quote */}
      <div className="pixel-panel">
        <div className="flex items-start gap-2">
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pixel-text-secondary)]" />
          <div>
            <p className="text-sm italic text-[var(--pixel-text-secondary)]">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="font-pixel mt-1 text-xs text-[var(--pixel-text-secondary)]">
              — {quote.author}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Missions */}
      <div className="pixel-panel">
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
        <div className="mb-3 h-2 overflow-hidden bg-[var(--pixel-bg-primary)] border border-[var(--pixel-border)]">
          <div
            className="h-full"
            style={{
              width: `${(completedMissions / totalMissions) * 100}%`,
              backgroundColor: "var(--pixel-success)",
            }}
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
                <Icon
                  className={`h-4 w-4 ${mission.done ? "text-[var(--pixel-success)]" : "text-[var(--pixel-text-secondary)]"}`}
                />
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
