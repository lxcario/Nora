"use client";

import { forwardRef, type ReactNode } from "react";
import { playClick } from "@/lib/sfx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelButtonProps {
  size?: "small" | "default";
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// PixelButton — sprite 9-slice button (border-image from cropped button sprite)
// ---------------------------------------------------------------------------

/**
 * Pixel-art button rendered with a real sprite 9-slice border (border-image
 * from the Sprout Lands button sheet). Interior color conveys the variant; the
 * sprite supplies the beveled highlight/shadow caps. Press = 2px down offset.
 *
 * Native <button> for full keyboard support (Enter/Space) and 44×44 min target.
 * Supports ref forwarding for focus management.
 */
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  function PixelButton(
    {
      size = "default",
      variant = "primary",
      disabled = false,
      loading = false,
      onClick,
      type = "button",
      className = "",
      children,
    },
    ref
  ) {
    const classes = [
      "pixel-btn",
      `pixel-btn-${variant}`,
      size === "small" ? "pixel-btn-sm" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    function handleClick() {
      if (disabled || loading) return;
      playClick();
      onClick?.();
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        data-state={disabled ? "disabled" : loading ? "loading" : undefined}
        onClick={handleClick}
        className={classes}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <span className="animate-pixel-blink">...</span>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
