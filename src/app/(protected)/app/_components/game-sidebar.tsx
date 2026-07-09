"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { playNavigate } from "@/lib/sfx";
import { usePreferences } from "@/components/pixel-ui/preferences-provider";
import { MusicPlayer } from "./music-player";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PetSidebarData {
  pokemonId: number;
  name: string;
  state: "happy" | "neutral" | "sad" | "forest_rescue";
  spriteUrl: string;
}

// ---------------------------------------------------------------------------
// PetWidget — persistent sidebar companion
// ---------------------------------------------------------------------------

const MOOD_CONFIG: Record<
  PetSidebarData["state"],
  { emoji: string; label: string; color: string; icon: string }
> = {
  happy:         { emoji: "", label: "Happy",   color: "var(--pixel-success)", icon: "Flower" },
  neutral:       { emoji: "", label: "Neutral",  color: "var(--pixel-warning)", icon: "Sleep" },
  sad:           { emoji: "", label: "Sad",      color: "var(--pixel-error)", icon: "PotionRed" },
  forest_rescue: { emoji: "", label: "Lost in forest", color: "var(--pixel-warning)", icon: "FlowerPot" },
};

// Sprite render box (CSS px). The frozen canvas and live GIF share this size.
const PET_SIZE = 48;
// How far the companion may shift when looking around / at the cursor. Small,
// integer-pixel offsets only — snapped in code so stepped motion stays crisp.
const PET_MAX_SHIFT = 3;
// Idle → sleep after this long with no user activity anywhere in the shell.
const SLEEP_AFTER_MS = 10_000;

type PetBehavior = "idle" | "sleeping" | "excited";

/**
 * True when decorative motion is allowed. Combines the app-wide animation
 * kill switch (Settings → data-animations="off") with the OS
 * prefers-reduced-motion setting. When false, the companion renders as a calm,
 * still image with no timers, blinking, bobbing, sleeping, or cursor tracking.
 */
function useMotionEnabled(): boolean {
  const { animations } = usePreferences();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return animations && !reduced;
}

function PetWidget({ pet }: { pet: PetSidebarData | null }) {
  if (!pet) {
    return (
      <Link
        href="/app/collection"
        className="pixel-panel mx-2 mb-1 flex flex-col items-center gap-1 px-2 py-3 pixel-hover-brighten group"
        style={{ textDecoration: "none" }}
      >
        <span className="font-pixel text-xl animate-pulse group-hover:animate-none">🥚</span>
        <span className="font-pixel text-[10px] text-[var(--pixel-text-primary)] text-center leading-tight">
          Choose your
        </span>
        <span className="font-pixel text-[10px] text-[var(--pixel-accent)] text-center">
          companion →
        </span>
      </Link>
    );
  }

  return <LivelyPet pet={pet} />;
}

/**
 * The sidebar companion, brought to life with a small, context-aware behavior
 * layer instead of a constant loop.
 *
 * Rest is CALM: the GIF's first frame is captured to a <canvas> once on load
 * and shown as a still pose, so the busy ~1s face-swap loop does NOT run while
 * the user reads. The live GIF is only mounted for the brief EXCITED window
 * (route change), then we settle back to the frozen pose. Expression happens on
 * meaningful triggers — a randomized-with-jitter blink/look-around at idle, a
 * nap after inactivity, a hop on navigation, and a subtle look-toward-cursor on
 * hover. If canvas capture ever fails we fall back to the live GIF so the pet is
 * never blank. Timers pause when the tab is hidden and are all cleaned up on
 * unmount. Decorative only: the accessible name stays stable, no aria-live.
 */
function LivelyPet({ pet }: { pet: PetSidebarData }) {
  const mood = MOOD_CONFIG[pet.state];
  const motionOn = useMotionEnabled();
  const pathname = usePathname();

  const [imgError, setImgError] = useState(false);
  const [frozenReady, setFrozenReady] = useState(false);
  const [behavior, setBehavior] = useState<PetBehavior>("idle");
  const [blinking, setBlinking] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLImageElement>(null);
  const behaviorRef = useRef<PetBehavior>("idle");
  const hiddenRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const offsetRef = useRef({ x: 0, y: 0 });

  behaviorRef.current = behavior;

  // ── Capture the GIF's first frame to a canvas (the calm resting pose) ──
  const captureFrozenFrame = useCallback(() => {
    const img = loaderRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    try {
      const w = img.naturalWidth || PET_SIZE;
      const h = img.naturalHeight || PET_SIZE;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      setFrozenReady(true);
    } catch {
      // Canvas tainted / draw failed — leave frozenReady false so we fall back
      // to the live GIF rather than showing a blank box.
      setFrozenReady(false);
    }
  }, []);

  // ── Recapture whenever the companion sprite changes (e.g. after evolving or
  //    picking a new companion) so the frozen pose matches the current pet. ──
  useEffect(() => {
    setFrozenReady(false);
  }, [pet.spriteUrl]);

  // ── Cached-GIF safety net: `onLoad` may not fire for an already-decoded
  //    (warm-cache) sprite, which would leave the pet on the live loop this
  //    task exists to kill. If the loader image is already complete, capture
  //    the first frame directly instead of waiting for the event. ──
  useEffect(() => {
    if (frozenReady || imgError) return;
    const img = loaderRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      captureFrozenFrame();
    }
  }, [frozenReady, imgError, pet.spriteUrl, captureFrozenFrame]);

  // ── Track tab visibility: pause all behavior work in a background tab ──
  useEffect(() => {
    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      if (!document.hidden) lastActivityRef.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── Global activity → keep awake / wake softly from a nap ──
  useEffect(() => {
    if (!motionOn) return;
    const onActivity = () => {
      lastActivityRef.current = Date.now();
      if (behaviorRef.current === "sleeping") setBehavior("idle");
    };
    const opts = { passive: true } as const;
    window.addEventListener("mousemove", onActivity, opts);
    window.addEventListener("keydown", onActivity, opts);
    window.addEventListener("scroll", onActivity, opts);
    window.addEventListener("click", onActivity, opts);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [motionOn]);

  // ── Sleep check: a light 1s poll (cheap) instead of per-event timers ──
  useEffect(() => {
    if (!motionOn) return;
    const id = window.setInterval(() => {
      if (hiddenRef.current) return;
      if (behaviorRef.current !== "idle") return;
      if (Date.now() - lastActivityRef.current >= SLEEP_AFTER_MS) {
        setBehavior("sleeping");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [motionOn]);

  // ── Idle micro-behaviors: blink (~4–9s) + look-around (~12–25s), jittered ──
  useEffect(() => {
    if (!motionOn || behavior !== "idle") return;
    let blinkTimer: number;
    let lookTimer: number;
    let clearBlink: number;
    let clearLook: number;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        if (!hiddenRef.current && behaviorRef.current === "idle") {
          setBlinking(true);
          clearBlink = window.setTimeout(() => setBlinking(false), rand(120, 180));
        }
        scheduleBlink();
      }, rand(4000, 9000));
    };

    const scheduleLook = () => {
      lookTimer = window.setTimeout(() => {
        if (!hiddenRef.current && behaviorRef.current === "idle") {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const dx = dir * Math.round(rand(1, PET_MAX_SHIFT));
          setOffset({ x: dx, y: 0 });
          offsetRef.current = { x: dx, y: 0 };
          // Hold the glance briefly, then settle back to center.
          clearLook = window.setTimeout(() => {
            setOffset({ x: 0, y: 0 });
            offsetRef.current = { x: 0, y: 0 };
          }, rand(700, 1400));
        }
        scheduleLook();
      }, rand(12000, 25000));
    };

    scheduleBlink();
    scheduleLook();
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(lookTimer);
      window.clearTimeout(clearBlink);
      window.clearTimeout(clearLook);
    };
  }, [motionOn, behavior]);

  // ── Excite on route change (sidebar persists across navigation) ──
  const firstPathRef = useRef(true);
  useEffect(() => {
    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }
    lastActivityRef.current = Date.now();
    if (!motionOn || hiddenRef.current) return;
    setBehavior("excited");
    const id = window.setTimeout(() => {
      // Only return to idle if we're still in the excite window (activity may
      // have already moved us elsewhere).
      if (behaviorRef.current === "excited") setBehavior("idle");
    }, 450);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── When motion is turned off, settle immediately into the calm pose ──
  useEffect(() => {
    if (!motionOn) {
      setBehavior("idle");
      setBlinking(false);
      setOffset({ x: 0, y: 0 });
      offsetRef.current = { x: 0, y: 0 };
    }
  }, [motionOn]);

  // ── Look toward the cursor while it's over the widget ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!motionOn || behaviorRef.current === "sleeping") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      const next = {
        x: Math.round(nx * PET_MAX_SHIFT),
        y: Math.round(ny * PET_MAX_SHIFT),
      };
      if (next.x !== offsetRef.current.x || next.y !== offsetRef.current.y) {
        offsetRef.current = next;
        setOffset(next);
      }
    },
    [motionOn]
  );

  const handleMouseLeave = useCallback(() => {
    offsetRef.current = { x: 0, y: 0 };
    setOffset({ x: 0, y: 0 });
  }, []);

  // Show the live (animated) GIF only during the brief excite window. At rest
  // we show the frozen first-frame canvas so the loop doesn't run. If the
  // freeze never became ready, fall back to the GIF so the pet isn't blank.
  const showLiveGif = imgError
    ? false
    : motionOn && behavior === "excited"
      ? true
      : !frozenReady;

  return (
    <Link
      href="/app/room"
      onClick={() => playNavigate()}
      data-tour="pet-widget"
      className="pixel-panel mx-2 mb-1 flex flex-col items-center gap-1 px-2 py-3 pixel-hover-brighten"
      style={{ textDecoration: "none" }}
      title={`${pet.name} — ${mood.label}`}
    >
      {/* Sprite stage — fixed box so nothing shifts layout as the pet moves */}
      <div
        className="relative"
        style={{ width: PET_SIZE, height: PET_SIZE }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hidden loader used purely to capture the first frame to canvas.
            Unmounted once the frame is frozen so it stops animating in the
            background (re-mounts if the sprite changes and we recapture). */}
        {!imgError && !frozenReady && (
          <img
            ref={loaderRef}
            src={pet.spriteUrl}
            alt=""
            aria-hidden="true"
            width={PET_SIZE}
            height={PET_SIZE}
            className="pixel-art"
            draggable={false}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            onLoad={captureFrozenFrame}
            onError={() => setImgError(true)}
          />
        )}

        {/* Position layer — look-around + cursor offset (stepped, integer px) */}
        <div
          style={{
            width: PET_SIZE,
            height: PET_SIZE,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: motionOn ? "transform 120ms steps(3)" : "none",
            opacity: behavior === "sleeping" ? 0.85 : 1,
          }}
        >
          {/* Expression layer — one-shot excite hop / blink squash */}
          <div className={behavior === "excited" && motionOn ? "pet-excite" : undefined}>
            <div className={blinking ? "pet-blink" : undefined} style={{ position: "relative", width: PET_SIZE, height: PET_SIZE }}>
              {imgError ? (
                <span className="font-pixel text-2xl text-[var(--pixel-text-secondary)]">?</span>
              ) : (
                <>
                  {/* Resting pose — always mounted so it's available as the
                      draw target at capture time. Hidden (and removed from the
                      a11y tree) while the live GIF is showing. */}
                  <canvas
                    ref={canvasRef}
                    role={showLiveGif ? undefined : "img"}
                    aria-label={showLiveGif ? undefined : pet.name}
                    aria-hidden={showLiveGif ? true : undefined}
                    className="pixel-art"
                    style={{
                      width: PET_SIZE,
                      height: PET_SIZE,
                      imageRendering: "pixelated",
                      display: showLiveGif ? "none" : "block",
                    }}
                  />
                  {/* Live animated GIF — overlaid only during EXCITED (and as
                      the fallback before/if the freeze isn't ready). */}
                  {showLiveGif && (
                    <img
                      src={pet.spriteUrl}
                      alt={pet.name}
                      width={PET_SIZE}
                      height={PET_SIZE}
                      className="pixel-art"
                      draggable={false}
                      style={{ position: "absolute", inset: 0 }}
                      onError={() => setImgError(true)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zzz nap overlay (decorative). Soft opacity fade is the permitted
            exception; the drift itself is stepped. */}
        {behavior === "sleeping" && motionOn && (
          <span
            aria-hidden="true"
            className="pet-zzz font-pixel absolute -top-1 -right-1 text-[10px]"
            style={{ color: "var(--pixel-text-secondary)" }}
          >
            Zzz
          </span>
        )}

        {/* Excite spark (decorative) */}
        {behavior === "excited" && motionOn && (
          <span
            aria-hidden="true"
            className="animate-pixel-pop font-pixel absolute -top-1 -right-1 text-[12px]"
            style={{ color: "var(--pixel-accent)" }}
          >
            !
          </span>
        )}
      </div>

      {/* Name */}
      <span
        className="font-pixel text-[10px] capitalize"
        style={{ color: "var(--pixel-text-primary)" }}
      >
        {pet.name}
      </span>

      {/* Mood badge */}
      <span
        className="font-pixel text-[10px] flex items-center gap-1"
        style={{ color: mood.color }}
      >
        <img
          src={`/sprites/travel-book/icons/${mood.icon}.png`}
          alt=""
          width={10}
          height={10}
          className="pixel-art"
        />
        {mood.label}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PixelIcon({ src, alt, size = 18 }: { src: string; alt: string; size?: number }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="pixel-art"
      draggable={false}
    />
  );
}

/**
 * Precise route-active check.
 * Avoids false positives like /app/study matching /app/study-room.
 */
function isRouteActive(href: string, pathname: string): boolean {
  if (href === "/app") return pathname === "/app";
  return (
    pathname === href ||
    pathname.startsWith(href + "/") ||
    pathname.startsWith(href + "?")
  );
}

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

const STUDY_CHILDREN = [
  { href: "/app/review",     icon: "/sprites/travel-book/icons/Book.png",           label: "Today's Memories" },
  { href: "/app/study",      icon: "/sprites/travel-book/icons/Restart.png",         label: "Study Mix"     },
  { href: "/app/feynman",    icon: "/sprites/travel-book/icons/Microphone.png",      label: "Feynman Mode"  },
  { href: "/app/error-spotter", icon: "/sprites/travel-book/icons/Eye.png",          label: "Error Spotter" },
  { href: "/app/exam",       icon: "/sprites/travel-book/icons/Document.png",        label: "Practice Exam" },
  { href: "/app/research",   icon: "/sprites/travel-book/icons/MagnifyingGlass.png", label: "Research Desk" },
  { href: "/app/listen",     icon: "/sprites/travel-book/icons/MusicNotes.png",      label: "Listen Mode"   },
  { href: "/app/study-room", icon: "/sprites/travel-book/icons/Monitor.png",         label: "Study Room"    },
  { href: "/app/planner",    icon: "/sprites/travel-book/icons/Pencil.png",          label: "Study Planner" },
  { href: "/app/academic",   icon: "/sprites/travel-book/icons/Backpack.png",        label: "My University" },
];

const ROOM_CHILDREN = [
  { href: "/app/room",          icon: "/sprites/travel-book/icons/Gamepad.png",         label: "Pixel Room"      },
  { href: "/app/memory-map",    icon: "/sprites/travel-book/icons/Flower.png",          label: "Memory Garden"   },
  { href: "/app/eureka",        icon: "/sprites/travel-book/icons/Lightbulb.png",       label: "Eureka!"         },
  { href: "/app/card-market",   icon: "/sprites/travel-book/icons/ChestTreasure.png",   label: "Card Market"     },
  { href: "/app/collection",    icon: "/sprites/travel-book/icons/Briefcase.png",       label: "Collection"      },
  { href: "/app/analytics",     icon: "/sprites/travel-book/icons/Trophy.png",          label: "Analytics"       },
  { href: "/app/history",       icon: "/sprites/travel-book/icons/FloppyDisk.png",      label: "History"         },
];

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const LS_KEY = "nora_sidebar_state";

interface SidebarState {
  study: boolean;
  myRoom: boolean;
}

function loadSidebarState(): SidebarState {
  // First-time default is OPEN for both groups: with only two accordions and a
  // scrollable nav, hiding destinations (Analytics, Collection, History, Pixel
  // Room) behind a collapsed group hurts discoverability. An explicit collapse
  // by the user is still persisted and respected below.
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { study: true, myRoom: true };
    const parsed = JSON.parse(raw) as Partial<SidebarState>;
    return {
      study: parsed?.study ?? true,
      myRoom: parsed?.myRoom ?? true,
    };
  } catch {
    return { study: true, myRoom: true };
  }
}

// ---------------------------------------------------------------------------
// NavLink — top-level direct link (unchanged style from original)
// ---------------------------------------------------------------------------

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={() => playNavigate()}
      data-state={active ? "selected" : undefined}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "pixel-panel pixel-panel-selected group flex items-center gap-3 px-2.5 py-2 text-[13px] font-pixel"
          : "group flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2.5 text-[13px] font-pixel transition-colors hover:bg-[var(--pixel-bg-elevated)]"
      }
      style={
        active
          ? {
              backgroundColor: "color-mix(in srgb, var(--pixel-accent) 16%, var(--pixel-bg-surface))",
              color: "var(--pixel-accent)",
            }
          : { color: "var(--pixel-text-secondary)" }
      }
    >
      <span className="shrink-0">
        <PixelIcon src={icon} alt={label} size={18} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SubNavLink — indented child link inside an accordion group
// ---------------------------------------------------------------------------

function SubNavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  // Track page visits for progressive disclosure (localStorage-based).
  // A "NEW" badge shows on pages the user hasn't visited yet.
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    try {
      const visited = localStorage.getItem("nora_visited_pages");
      const set = new Set<string>(visited ? JSON.parse(visited) : []);
      if (!set.has(href)) {
        setIsNew(true);
      }
      if (active && !set.has(href)) {
        set.add(href);
        localStorage.setItem("nora_visited_pages", JSON.stringify([...set]));
        setIsNew(false);
      }
    } catch {
      // localStorage unavailable
    }
  }, [href, active]);

  return (
    <Link
      href={href}
      onClick={() => playNavigate()}
      aria-current={active ? "page" : undefined}
      className="group flex items-center gap-2.5 rounded-md py-1.5 pl-8 pr-2 text-[11px] font-pixel transition-colors"
      style={{
        color: active ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
        backgroundColor: active
          ? "color-mix(in srgb, var(--pixel-accent) 10%, var(--pixel-bg-surface))"
          : undefined,
        borderLeft: active
          ? "2px solid var(--pixel-accent)"
          : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "var(--pixel-bg-elevated)";
          e.currentTarget.style.color = "var(--pixel-text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "";
          e.currentTarget.style.color = "var(--pixel-text-secondary)";
        }
      }}
    >
      <PixelIcon src={icon} alt={label} size={14} />
      <span className="truncate">{label}</span>
      {isNew && (
        <span
          className="ml-auto font-pixel text-[10px] px-1 py-0.5 shrink-0 leading-none"
          style={{
            color: "var(--pixel-accent)",
            border: "1px solid var(--pixel-accent)",
            backgroundColor: "color-mix(in srgb, var(--pixel-accent) 15%, transparent)",
          }}
        >
          NEW
        </span>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// AccordionGroup — expandable section with keyboard support
// ---------------------------------------------------------------------------

function AccordionGroup({
  icon,
  label,
  open,
  anyChildActive,
  onToggle,
  children,
}: {
  icon: string;
  label: string;
  open: boolean;
  anyChildActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2.5 text-[13px] font-pixel transition-colors hover:bg-[var(--pixel-bg-elevated)]"
        style={{
          color: anyChildActive ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
          backgroundColor:
            anyChildActive && !open
              ? "color-mix(in srgb, var(--pixel-accent) 8%, var(--pixel-bg-surface))"
              : undefined,
        }}
      >
        <span className="shrink-0">
          <PixelIcon src={icon} alt={label} size={18} />
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        {/* Pixel chevron */}
        <span
          className="shrink-0 font-pixel text-[10px]"
          style={{
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            color: "var(--pixel-text-secondary)",
          }}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>

      {open && (
        <div className="mt-0.5 mb-1 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GameSidebar
// ---------------------------------------------------------------------------

export function GameSidebar({
  profile,
  pet,
}: {
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
  pet: PetSidebarData | null;
}) {
  const pathname = usePathname();

  const studyActive = STUDY_CHILDREN.some((c) => isRouteActive(c.href, pathname));
  const roomActive  = ROOM_CHILDREN.some((c)  => isRouteActive(c.href, pathname));

  // Start with both groups OPEN as the server-safe default (deterministic, so
  // it matches the client's first render — no hydration mismatch). The mount
  // effect below refines this from the user's persisted preference.
  const [openGroups, setOpenGroups] = useState<SidebarState>({
    study: true,
    myRoom: true,
  });

  // After mount: merge with localStorage-persisted open/close state
  useEffect(() => {
    const saved = loadSidebarState();
    setOpenGroups({
      study: saved.study || studyActive,
      myRoom: saved.myRoom || roomActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever the state changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(openGroups));
    } catch {
      // storage unavailable — silent
    }
  }, [openGroups]);

  // Auto-expand when navigating to a child route (e.g., deep-link from outside)
  useEffect(() => {
    setOpenGroups((prev) => ({
      study:  prev.study  || studyActive,
      myRoom: prev.myRoom || roomActive,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleStudy  = useCallback(() => setOpenGroups((p) => ({ ...p, study:  !p.study  })), []);
  const toggleMyRoom = useCallback(() => setOpenGroups((p) => ({ ...p, myRoom: !p.myRoom })), []);

  return (
    <aside className="hidden md:flex flex-col w-[240px] h-screen sticky top-0 flex-shrink-0 bg-[var(--pixel-sidebar-bg)] border-r-2 border-[var(--pixel-border)]">

      {/* ─── Logo ─── */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-center shrink-0">
        <img
          src="/noralogo.png"
          alt="NORA"
          className="pixel-art"
          style={{ height: "44px", width: "auto" }}
          draggable={false}
        />
      </div>

      {/* ─── Pet Widget ─── */}
      <div className="shrink-0">
        <PetWidget pet={pet} />
      </div>

      {/* ─── Navigation (scrollable) ─── */}
      <nav
        className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-hide min-h-0"
        aria-label="Main navigation"
      >
        {/* 1. Home */}
        <NavLink
          href="/app"
          icon="/sprites/travel-book/icons/Home.png"
          label="Home"
          active={pathname === "/app"}
        />

        {/* 2. Study (accordion) */}
        <div data-tour="sidebar-study">
        <AccordionGroup
          icon="/sprites/travel-book/icons/Book.png"
          label="Study"
          open={openGroups.study}
          anyChildActive={studyActive}
          onToggle={toggleStudy}
        >
          {STUDY_CHILDREN.map((child) => (
            <SubNavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              active={isRouteActive(child.href, pathname)}
            />
          ))}
        </AccordionGroup>
        </div>

        {/* 3. Friends (was "Party") */}
        <NavLink
          href="/app/party"
          icon="/sprites/travel-book/icons/Team.png"
          label="Friends"
          active={isRouteActive("/app/party", pathname)}
        />

        {/* 4. My Room (accordion) */}
        <AccordionGroup
          icon="/sprites/travel-book/icons/Gamepad.png"
          label="My Room"
          open={openGroups.myRoom}
          anyChildActive={roomActive}
          onToggle={toggleMyRoom}
        >
          {ROOM_CHILDREN.map((child) => (
            <SubNavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              active={isRouteActive(child.href, pathname)}
            />
          ))}
        </AccordionGroup>

        {/* 5. Settings */}
        <div className="pt-1">
          <NavLink
            href="/app/settings"
            icon="/sprites/travel-book/icons/Gear.png"
            label="Settings"
            active={isRouteActive("/app/settings", pathname)}
          />
        </div>
      </nav>

      {/* ─── Music Player (stays pinned at bottom) ─── */}
      <div className="shrink-0">
        <MusicPlayer />
      </div>
    </aside>
  );
}
