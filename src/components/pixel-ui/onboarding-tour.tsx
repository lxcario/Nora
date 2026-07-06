"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Onboarding Tour — pixel-art styled, zero-dependency product tour
//
// Research-backed design decisions:
//   - 5 steps max (Appcues: "best tours involve 3-5 steps")
//   - Focuses on first "aha moment" (GuideJar: "help them feel that first win")
//   - SVG spotlight cutout (GPU-composited, no layout shift)
//   - Skip always visible (never trap users)
//   - localStorage persistence (one-time only)
//   - Keyboard: Escape=skip, Enter/→=next, ←=back
//   - Respects prefers-reduced-motion (no animation)
//
// Sources: Appcues product tour guide, flows.sh React tour patterns,
// react-spotlight-onboard (zero-dependency SVG approach), Sentry engineering
// blog on building product tours in React.
// Content was rephrased for compliance with licensing restrictions.
// ---------------------------------------------------------------------------

const TOUR_STORAGE_KEY = "nora_onboarding_tour_completed";

export interface TourStep {
  /** CSS selector for the element to highlight */
  target: string;
  /** Step title (pixel font, short) */
  title: string;
  /** Step description (1-2 sentences) */
  description: string;
  /** Optional sprite icon path */
  icon?: string;
  /** Tooltip position relative to the highlighted element */
  position?: "top" | "bottom" | "left" | "right";
}

const DEFAULT_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard-cta"]',
    title: "Start here",
    description: "This shows your most important action — review due cards or start explaining a concept.",
    icon: "/sprites/travel-book/icons/Sun.png",
    position: "bottom",
  },
  {
    target: '[data-tour="quests"]',
    title: "Daily quests",
    description: "Complete these to earn XP, coins, and keep your pet happy. Three small goals each day.",
    icon: "/sprites/travel-book/icons/Trophy.png",
    position: "top",
  },
  {
    target: '[data-tour="sidebar-study"]',
    title: "Study tools",
    description: "Review cards, explain concepts, research papers, watch videos — all your study modes are here.",
    icon: "/sprites/travel-book/icons/Book.png",
    position: "right",
  },
  {
    target: '[data-tour="pet-widget"]',
    title: "Your companion",
    description: "Your pet's mood reflects your study habits. Study regularly and they'll stay happy!",
    icon: "/sprites/travel-book/icons/PetBowl.png",
    position: "right",
  },
  {
    target: '[data-tour="topbar-xp"]',
    title: "Level up",
    description: "Earn XP by studying. Level up to unlock new pets, themes, and room decorations. You got this!",
    icon: "/sprites/travel-book/icons/Coin.png",
    position: "left",
  },
];

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getElementRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Skip elements that are hidden (zero dimensions)
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function getTooltipPosition(
  rect: Rect,
  position: TourStep["position"] = "bottom"
): { top: number; left: number } {
  const OFFSET = 16;
  switch (position) {
    case "top":
      return { top: rect.y - OFFSET, left: rect.x + rect.width / 2 };
    case "bottom":
      return { top: rect.y + rect.height + OFFSET, left: rect.x + rect.width / 2 };
    case "left":
      return { top: rect.y + rect.height / 2, left: rect.x - OFFSET };
    case "right":
      return { top: rect.y + rect.height / 2, left: rect.x + rect.width + OFFSET };
    default:
      return { top: rect.y + rect.height + OFFSET, left: rect.x + rect.width / 2 };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingTour({ steps = DEFAULT_STEPS }: { steps?: TourStep[] }) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  // Check if tour should show (first visit after onboarding)
  // Suppressed in automated runners (navigator.webdriver = true, set by Playwright/headless)
  // and when ?skip_tour=1 is in the URL (explicit opt-out for CI/testing).
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if ((navigator as { webdriver?: boolean }).webdriver) return;
        if (new URLSearchParams(window.location.search).get("skip_tour") === "1") return;
      }
      if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
        // Small delay so the page renders first
        const timer = setTimeout(() => setActive(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Track the target element's position (handles scroll/resize)
  useEffect(() => {
    if (!active) return;

    function updateRect() {
      const step = steps[currentStep];
      if (step) {
        const rect = getElementRect(step.target);
        setTargetRect(rect);
      }
      rafRef.current = requestAnimationFrame(updateRect);
    }
    updateRect();

    return () => cancelAnimationFrame(rafRef.current);
  }, [active, currentStep, steps]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        completeTour();
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, currentStep]);

  const completeTour = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      completeTour();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length, completeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  if (!active) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Spotlight padding around the highlighted element
  const PAD = 8;
  const spotRect = targetRect
    ? {
        x: targetRect.x - PAD,
        y: targetRect.y - PAD,
        width: targetRect.width + PAD * 2,
        height: targetRect.height + PAD * 2,
      }
    : null;

  const tooltipPos = targetRect
    ? getTooltipPosition(targetRect, step?.position)
    : { top: window.innerHeight / 2, left: window.innerWidth / 2 };

  // Tooltip transform based on position (center it relative to the element)
  const tooltipTransform = (() => {
    switch (step?.position) {
      case "top":
        return "translate(-50%, -100%)";
      case "bottom":
        return "translate(-50%, 0)";
      case "left":
        return "translate(-100%, -50%)";
      case "right":
        return "translate(0, -50%)";
      default:
        return "translate(-50%, 0)";
    }
  })();

  return (
    <div className="fixed inset-0 z-[200]" aria-modal="true" role="dialog" aria-label="Welcome tour">
      {/* SVG overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transition: "opacity 300ms ease" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotRect && (
              <rect
                x={spotRect.x}
                y={spotRect.y}
                width={spotRect.width}
                height={spotRect.height}
                rx="4"
                fill="black"
                style={{ transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)" }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Spotlight border glow */}
        {spotRect && (
          <rect
            x={spotRect.x}
            y={spotRect.y}
            width={spotRect.width}
            height={spotRect.height}
            rx="4"
            fill="none"
            stroke="var(--pixel-accent)"
            strokeWidth="2"
            className="animate-pulse"
            style={{
              transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              filter: "drop-shadow(0 0 8px var(--pixel-accent))",
            }}
          />
        )}
      </svg>

      {/* Click-through area on the backdrop to skip */}
      <div
        className="absolute inset-0"
        onClick={completeTour}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        className="absolute z-10 animate-pixel-pop"
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
          transform: tooltipTransform,
          maxWidth: "320px",
          width: "max-content",
          transition: "top 400ms cubic-bezier(0.4, 0, 0.2, 1), left 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        key={currentStep} // re-mount for animate-pixel-pop per step
      >
        <div
          className="pixel-panel pixel-panel-lg"
          style={{
            padding: "16px",
            backgroundColor: "var(--pixel-bg-surface)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {step?.icon && (
                <img
                  src={step.icon}
                  alt=""
                  width={18}
                  height={18}
                  className="pixel-art"
                />
              )}
              <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <button
              onClick={completeTour}
              aria-label="Skip tour"
              className="p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--pixel-text-muted)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <h3
            className="font-pixel text-sm mb-2"
            style={{ color: "var(--pixel-accent)" }}
          >
            {step?.title}
          </h3>
          <p
            className="text-xs leading-relaxed mb-4"
            style={{ color: "var(--pixel-text-secondary)" }}
          >
            {step?.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-200"
                  style={{
                    width: i === currentStep ? "16px" : "6px",
                    height: "6px",
                    backgroundColor:
                      i === currentStep
                        ? "var(--pixel-accent)"
                        : i < currentStep
                          ? "var(--pixel-success)"
                          : "var(--pixel-border-light)",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-0.5 font-pixel text-[10px] px-2 py-1 transition-colors"
                  style={{ color: "var(--pixel-text-secondary)" }}
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex items-center gap-1 font-pixel text-[10px] px-3 py-1.5"
                style={{
                  backgroundColor: "var(--pixel-accent)",
                  color: "#1a1410",
                  border: "2px solid var(--pixel-border)",
                }}
              >
                {isLast ? (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Let&apos;s go!
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
