"use client";

import { useEffect, useState, useRef, type CSSProperties } from "react";
import { useToast, type ToastVariant } from "./toast-provider";
import { playLevelUp } from "@/lib/sfx";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToastProps {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number; // ms, default 3000
  onDismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Variant styling
// ---------------------------------------------------------------------------

const VARIANT_BORDER_COLORS: Record<ToastVariant, string> = {
  success: "var(--pixel-success)",
  warning: "var(--pixel-warning)",
  error: "var(--pixel-error)",
  info: "var(--pixel-bg-secondary)",
  "level-up": "var(--pixel-accent)",
};

const VARIANT_PROGRESS_COLORS: Record<ToastVariant, string> = {
  success: "var(--pixel-success)",
  warning: "var(--pixel-warning)",
  error: "var(--pixel-error)",
  info: "var(--pixel-border-light)",
  "level-up": "var(--pixel-accent)",
};

// ---------------------------------------------------------------------------
// Individual Toast Component
// ---------------------------------------------------------------------------

export function ToastItem({
  id,
  variant,
  message,
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(duration);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Level-up variant triggers SFX on mount
  useEffect(() => {
    if (variant === "level-up") {
      playLevelUp();
    }
  }, [variant]);

  // Auto-dismiss timer with pause/resume support
  useEffect(() => {
    if (paused) {
      // On pause, calculate remaining time and clear the timer
      const elapsed = Date.now() - startRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // On resume (or initial), start timer with remaining duration
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(id);
    }, remainingRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [paused, id, onDismiss]);

  const isLevelUp = variant === "level-up";

  const wrapperStyle: CSSProperties = {
    maxWidth: "320px",
    width: "100%",
    padding: "10px 12px",
    borderImageSource: `url('/sprites/travel-book/UI_TravelBook_Slot01${isLevelUp ? "b" : "a"}.png')`,
  };

  const progressBarStyle: CSSProperties = {
    height: "4px",
    backgroundColor: VARIANT_PROGRESS_COLORS[variant],
    animation: `toast-progress ${duration}ms linear forwards`,
    animationPlayState: paused ? "paused" : "running",
    imageRendering: "pixelated",
  };

  return (
    <div
      className={`pixel-panel ${isLevelUp ? "pixel-panel-lg" : ""} animate-pixel-slide-in`}
      style={wrapperStyle}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Header: accent strip + close button */}
      <div className="flex items-center justify-between mb-2">
        <div
          className="flex-1"
          style={{
            height: "4px",
            backgroundColor: VARIANT_BORDER_COLORS[variant],
          }}
        />
        <button
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className="ml-2 shrink-0 p-0.5 transition-opacity hover:opacity-100 opacity-60"
          style={{ color: "var(--pixel-text-muted)" }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Message */}
      <p
        className={isLevelUp ? "animate-pixel-wiggle" : undefined}
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: isLevelUp ? "16px" : "13px",
          letterSpacing: "1px",
          color: "var(--pixel-text-primary)",
          margin: 0,
          marginBottom: "8px",
        }}
      >
        {message}
      </p>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "var(--pixel-bg-secondary)",
          overflow: "hidden",
        }}
      >
        <div style={progressBarStyle} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast Container (renders list of active toasts)
// ---------------------------------------------------------------------------

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          variant={toast.variant}
          message={toast.message}
          duration={toast.duration ?? 3000}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
}
