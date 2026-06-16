"use client";

import { DialogFrame } from "./dialog-frame";
import { IconSprite } from "./icon-sprite";
import { PixelButton } from "./pixel-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Descriptive message explaining why the view is empty */
  message: string;
  /** Label for the optional action button */
  actionLabel?: string;
  /** Click handler for the action button */
  onAction?: () => void;
  /** Link href for link-based actions (renders an anchor wrapper) */
  actionHref?: string;
  /** Sprite icon name to display (uses IconSprite) */
  icon?: string;
}

// ---------------------------------------------------------------------------
// EmptyState Component
// ---------------------------------------------------------------------------

/**
 * Pixel-art styled empty state placeholder.
 * Displays within a DialogFrame when a list or view has no data.
 *
 * - If `icon` prop is provided, renders an IconSprite
 * - Otherwise renders a default dimmed stacked-cards visual (overlapping div borders)
 * - Descriptive message in pixel font
 * - Optional action button or link
 */
export function EmptyState({
  message,
  actionLabel,
  onAction,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <DialogFrame variant="standard">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px 16px",
        }}
      >
        {/* Illustration area */}
        {icon ? (
          <IconSprite name={icon} size={3} aria-label={message} />
        ) : (
          <DefaultEmptyVisual />
        )}

        {/* Message */}
        <p
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "14px",
            letterSpacing: "1px",
            color: "var(--pixel-text-secondary)",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        {/* Optional action */}
        {actionLabel && (actionHref || onAction) && (
          <ActionButton
            label={actionLabel}
            href={actionHref}
            onClick={onAction}
          />
        )}
      </div>
    </DialogFrame>
  );
}

// ---------------------------------------------------------------------------
// DefaultEmptyVisual — stacked card outlines suggesting emptiness
// ---------------------------------------------------------------------------

function DefaultEmptyVisual() {
  const cardStyle: React.CSSProperties = {
    width: "48px",
    height: "36px",
    border: "2px solid var(--pixel-border-light)",
    borderRadius: "2px",
    backgroundColor: "transparent",
    imageRendering: "pixelated",
  };

  return (
    <div
      style={{ position: "relative", width: "60px", height: "52px" }}
      aria-hidden="true"
    >
      {/* Back card (offset) */}
      <div
        style={{
          ...cardStyle,
          position: "absolute",
          top: 0,
          left: "12px",
          opacity: 0.3,
        }}
      />
      {/* Middle card (offset) */}
      <div
        style={{
          ...cardStyle,
          position: "absolute",
          top: "6px",
          left: "6px",
          opacity: 0.5,
        }}
      />
      {/* Front card */}
      <div
        style={{
          ...cardStyle,
          position: "absolute",
          top: "12px",
          left: "0px",
          opacity: 0.7,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionButton — renders a PixelButton, optionally wrapped in an anchor
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        <PixelButton size="small" variant="primary" onClick={onClick}>
          {label}
        </PixelButton>
      </a>
    );
  }

  return (
    <PixelButton size="small" variant="primary" onClick={onClick}>
      {label}
    </PixelButton>
  );
}
