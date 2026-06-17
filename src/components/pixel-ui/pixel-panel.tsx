import type { CSSProperties, ElementType, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelPanelProps {
  /** Element to render as (default: div) */
  as?: ElementType;
  /** Visual treatment */
  variant?: "panel" | "inset" | "selected";
  /** Larger 8px border for hero panels */
  large?: boolean;
  /** Optional themed interior background color (CSS value or var) */
  tone?: string;
  /** Optional pixel-font title rendered in the top border region */
  title?: string;
  /** UI state — drives border color tint via data-state */
  state?: "default" | "success" | "warning" | "error";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// PixelPanel — sprite 9-slice container (Server Component friendly)
// ---------------------------------------------------------------------------

/**
 * Real pixel-art panel rendered with CSS `border-image` from the Travel Book
 * Slot01a sprite (border-image-slice: 2, verified exact). The interior color is
 * themeable via `tone`, and rounded corners reveal the background behind.
 */
export function PixelPanel({
  as: Tag = "div",
  variant = "panel",
  large = false,
  tone,
  title,
  state = "default",
  className = "",
  style,
  children,
}: PixelPanelProps) {
  const classes = [
    "pixel-panel",
    variant === "inset" ? "pixel-panel-inset" : "",
    variant === "selected" ? "pixel-panel-selected" : "",
    large ? "pixel-panel-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      className={classes}
      data-state={state !== "default" ? state : undefined}
      style={{ ...(tone ? { backgroundColor: tone } : null), ...style }}
    >
      {title && (
        <header
          className="font-pixel"
          style={{
            fontSize: "13px",
            letterSpacing: "1px",
            color: "var(--pixel-accent)",
            padding: "10px 16px",
            borderBottom: "2px solid var(--pixel-border)",
          }}
        >
          {title}
        </header>
      )}
      <div style={{ padding: large ? "20px" : "16px" }}>{children}</div>
    </Tag>
  );
}
