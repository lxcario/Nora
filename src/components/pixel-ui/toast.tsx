"use client";

import { useEffect, type CSSProperties } from "react";
import { useToast, type ToastVariant } from "./toast-provider";
import { playLevelUp } from "@/lib/sfx";

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
  // Level-up variant triggers SFX on mount
  useEffect(() => {
    if (variant === "level-up") {
      playLevelUp();
    }
  }, [variant]);

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
    imageRendering: "pixelated",
  };

  return (
    <div
      className={`pixel-panel ${isLevelUp ? "pixel-panel-lg" : ""} animate-pixel-slide-in`}
      style={wrapperStyle}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Variant accent strip */}
      <div
        style={{
          height: "4px",
          backgroundColor: VARIANT_BORDER_COLORS[variant],
          marginBottom: "8px",
        }}
      />
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
