"use client";

import { DialogFrame } from "./dialog-frame";
import { PixelButton } from "./pixel-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  /** Description of the failure */
  message: string;
  /** Callback to retry the failed operation */
  onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// ErrorState Component
// ---------------------------------------------------------------------------

/**
 * Pixel-art styled error state panel.
 * Renders inside a DialogFrame with `state="error"` (muted red border).
 *
 * - Shows an error icon and failure description
 * - Always shows a "Retry" PixelButton if onRetry is provided
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <DialogFrame variant="standard" state="error">
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
        {/* Error icon */}
        <ErrorIcon />

        {/* Error message */}
        <p
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "14px",
            letterSpacing: "1px",
            color: "var(--pixel-error)",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        {/* Retry button */}
        {onRetry && (
          <PixelButton size="small" variant="danger" onClick={onRetry}>
            Retry
          </PixelButton>
        )}
      </div>
    </DialogFrame>
  );
}

// ---------------------------------------------------------------------------
// ErrorIcon — pixel-art "X" error indicator
// ---------------------------------------------------------------------------

function ErrorIcon() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid var(--pixel-error)",
        borderRadius: "2px",
        backgroundColor: "transparent",
        imageRendering: "pixelated",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: "18px",
          color: "var(--pixel-error)",
          lineHeight: 1,
        }}
      >
        ✕
      </span>
    </div>
  );
}
