"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Feature Hint — first-visit contextual hint (spec UX-AUDIT #16, #19)
// ---------------------------------------------------------------------------

/**
 * A collapsible one-time hint panel that appears on a feature page the first
 * time a user visits it. Stores dismissal in localStorage so it never shows
 * again. Renders as a pixel-panel with a subtle accent border.
 *
 * Usage:
 * ```tsx
 * <FeatureHint
 *   id="feynman-mode"
 *   title="How Feynman Mode works"
 *   description="Explain a concept in your own words. The AI will probe gaps in your understanding and suggest flashcards."
 * />
 * ```
 */
export function FeatureHint({
  id,
  title,
  description,
  icon,
}: {
  /** Unique ID for localStorage persistence */
  id: string;
  /** Short title for the hint */
  title: string;
  /** 1-2 sentence explanation */
  description: string;
  /** Optional sprite icon path */
  icon?: string;
}) {
  const storageKey = `nora_hint_dismissed_${id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if never dismissed before
    try {
      if (!localStorage.getItem(storageKey)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — don't show
    }
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  return (
    <div
      className="pixel-panel animate-pixel-pop flex items-start gap-3 relative"
      style={{
        padding: "12px 16px",
        borderColor: "var(--pixel-accent)",
        backgroundColor: "color-mix(in srgb, var(--pixel-accent) 6%, var(--pixel-bg-surface))",
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          width={20}
          height={20}
          className="pixel-art shrink-0 mt-0.5"
        />
      )}
      <div className="flex-1 min-w-0">
        <p
          className="font-pixel text-[11px] mb-1"
          style={{ color: "var(--pixel-accent)" }}
        >
          {title}
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--pixel-text-secondary)" }}
        >
          {description}
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss hint"
        className="shrink-0 p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: "var(--pixel-text-muted)" }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
