"use client";

import { useEffect, useRef, useCallback } from "react";
import { DialogFrame } from "./dialog-frame";
import { PixelButton } from "./pixel-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelConfirmDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Dialog title (pixel font) */
  title?: string;
  /** Descriptive message explaining the consequence */
  message: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual variant for the confirm button */
  variant?: "danger" | "warning";
  /** Called when user confirms the action */
  onConfirm: () => void;
  /** Called when user cancels (Escape, backdrop click, or Cancel button) */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// PixelConfirmDialog
// ---------------------------------------------------------------------------

/**
 * Pixel-art themed confirmation modal for destructive actions.
 *
 * - Renders a fixed overlay with a centered DialogFrame
 * - Focus traps between Cancel and Confirm buttons
 * - Escape and backdrop click call onCancel
 * - Accessible: role="alertdialog", aria-modal, aria-labelledby, aria-describedby
 */
export function PixelConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: PixelConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is painted
      const timer = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  // Focus trap: Tab cycles between Cancel and Confirm only
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = [cancelRef.current, confirmRef.current].filter(
        Boolean
      ) as HTMLElement[];
      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLElement
      );

      if (e.shiftKey) {
        // Shift+Tab: go backward
        e.preventDefault();
        const prev =
          currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
        focusable[prev].focus();
      } else {
        // Tab: go forward
        e.preventDefault();
        const next =
          currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1;
        focusable[next].focus();
      }
    },
    []
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pixel-confirm-title"
        aria-describedby="pixel-confirm-message"
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <DialogFrame>
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Title */}
            <h2
              id="pixel-confirm-title"
              className="font-pixel text-base"
              style={{ color: "var(--pixel-text-primary)", letterSpacing: "1px" }}
            >
              {title}
            </h2>

            {/* Message */}
            <p
              id="pixel-confirm-message"
              className="text-sm"
              style={{ color: "var(--pixel-text-secondary)", lineHeight: 1.5 }}
            >
              {message}
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <PixelButton
                ref={cancelRef}
                variant="secondary"
                size="small"
                onClick={onCancel}
              >
                {cancelLabel}
              </PixelButton>
              <PixelButton
                ref={confirmRef}
                variant={variant === "warning" ? "primary" : "danger"}
                size="small"
                onClick={onConfirm}
              >
                {confirmLabel}
              </PixelButton>
            </div>
          </div>
        </DialogFrame>
      </div>
    </div>
  );
}
