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
 * Dark pixel-art panel with subtle border styling.
 * Uses CSS borders and background to create a clean dark panel
 * that fits the cozy dark theme without visible sprite tiling artifacts.
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
      className={`pixel-panel ${variant === "large" ? "pixel-panel-lg" : ""} ${className ?? ""}`.trim()}
      {...stateProps}
    >
      <div style={{ padding: variant === "large" ? "20px" : "16px" }}>
        {title && (
          <header
            style={{
              fontFamily: "var(--font-pixel)",
              fontSize: "14px",
              letterSpacing: "1px",
              color: "var(--pixel-accent)",
              paddingBottom: "8px",
              marginBottom: "12px",
              borderBottom: "2px solid var(--pixel-border)",
            }}
          >
            {title}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
