"use client";

import { usePreferences, type CursorPack } from "./preferences-provider";
import { playToggle } from "@/lib/sfx";

// ---------------------------------------------------------------------------
// Cursor pack catalog
// ---------------------------------------------------------------------------

const PACKS: {
  id: CursorPack;
  name: string;
  blurb: string;
  default: string;
  pointer: string;
}[] = [
  {
    id: "travelbook",
    name: "Travel Book",
    blurb: "Clean journal arrow + pointing hand.",
    default: "/sprites/travel-book/cursors/cursor-default.png",
    pointer: "/sprites/travel-book/cursors/cursor-pointer.png",
  },
  {
    id: "catpaw",
    name: "Cat Paw",
    blurb: "Cozy kitten paw that points as you hover.",
    default: "/sprites/cursors/catpaw/default.png",
    pointer: "/sprites/cursors/catpaw/pointer.png",
  },
];

// ---------------------------------------------------------------------------
// CursorPicker
// ---------------------------------------------------------------------------

export function CursorPicker() {
  const { cursorPack, setCursorPack } = usePreferences();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {PACKS.map((pack) => {
        const active = cursorPack === pack.id;
        return (
          <button
            key={pack.id}
            type="button"
            onClick={() => {
              setCursorPack(pack.id);
              playToggle(true);
            }}
            className={`pixel-panel ${active ? "pixel-panel-selected" : ""} text-left`}
            style={{
              backgroundColor: active
                ? "color-mix(in srgb, var(--pixel-accent) 14%, var(--pixel-bg-surface))"
                : "var(--pixel-bg-surface)",
            }}
          >
            <div className="flex items-center gap-3 p-1">
              <div className="flex items-center gap-2">
                <img
                  src={pack.default}
                  alt=""
                  width={32}
                  height={32}
                  className="pixel-art"
                  style={{ imageRendering: "pixelated" }}
                />
                <img
                  src={pack.pointer}
                  alt=""
                  width={32}
                  height={32}
                  className="pixel-art"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-pixel text-sm"
                  style={{
                    color: active
                      ? "var(--pixel-accent)"
                      : "var(--pixel-text-primary)",
                  }}
                >
                  {pack.name}
                </p>
                <p className="text-[11px] text-[var(--pixel-text-secondary)] leading-snug">
                  {pack.blurb}
                </p>
              </div>
              {pack.id === "travelbook" && (
                <span className="font-pixel text-[10px] text-[var(--pixel-text-secondary)] flex items-center gap-0.5">
                  🪙 150
                </span>
              )}
              {active && (
                <span className="font-pixel text-[10px] text-[var(--pixel-accent)]">
                  ✓ ON
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
