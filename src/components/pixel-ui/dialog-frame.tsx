import { NineSlice } from "./nine-slice";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogFrameProps {
  /** Optional title rendered as a pixel-font header at the top of the panel */
  title?: string;
  /** Nine-slice dialog variant */
  variant?: "standard" | "large";
  /** Visual state treatment applied via data-state attribute */
  state?: "default" | "success" | "warning" | "error";
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Content rendered inside the panel */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// DialogFrame Component (Server Component)
// ---------------------------------------------------------------------------

/**
 * Card wrapper that composes a NineSlice panel with optional title header
 * and state-based styling. Uses the 8px grid for internal padding.
 *
 * - Wraps a NineSlice in an outer container that carries the `data-state` attribute
 * - If `title` is provided, displays a pixel-font header at the top of the content
 * - Applies state-based border/outline styling when state !== "default"
 * - Internal padding of 16px (2 × spacing-pixel) for children content
 */
export function DialogFrame({
  title,
  variant = "standard",
  state = "default",
  className,
  children,
}: DialogFrameProps) {
  // Build data attributes for state-based CSS styling
  const stateProps =
    state !== "default" ? { "data-state": state } : undefined;

  return (
    <div
      className={className}
      {...stateProps}
      style={{ border: "2px solid transparent", borderRadius: "4px" }}
    >
      <NineSlice variant={variant}>
        <div style={{ padding: "16px" }}>
          {title && (
            <header
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "14px",
                letterSpacing: "1px",
                color: "var(--pixel-text-primary)",
                paddingBottom: "8px",
                marginBottom: "8px",
                borderBottom: "2px solid var(--pixel-border-light)",
              }}
            >
              {title}
            </header>
          )}
          {children}
        </div>
      </NineSlice>
    </div>
  );
}
