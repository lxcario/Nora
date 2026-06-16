import { spriteMap } from "./sprite-map";
import { SpriteRegion } from "./sprite-region";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconSpriteProps {
  /** Logical icon name (e.g. "book", "settings"). Automatically prefixed with "icon-" if needed. */
  name: string;
  /** Integer scale factor (default: 2) */
  size?: 1 | 2 | 3;
  /** Accessible label for screen readers */
  "aria-label"?: string;
  /** Lucide icon component to render when the sprite name is not found */
  fallback?: React.ComponentType<{ className?: string }>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Size map — maps scale factor to a Tailwind-friendly pixel size for fallback icons
// Base icon is 16px native, so scale produces 16, 32, 48
// ---------------------------------------------------------------------------

const FALLBACK_SIZE_CLASS: Record<1 | 2 | 3, string> = {
  1: "h-4 w-4",
  2: "h-8 w-8",
  3: "h-12 w-12",
};

// ---------------------------------------------------------------------------
// IconSprite Component
// ---------------------------------------------------------------------------

/**
 * Renders a single icon from the sprite map.
 * Server Component — no client-side JS required.
 *
 * Usage:
 * ```tsx
 * <IconSprite name="book" size={2} aria-label="Open book" />
 * <IconSprite name="unknown" fallback={BookIcon} aria-label="Book" />
 * ```
 */
export function IconSprite({
  name,
  size = 2,
  "aria-label": ariaLabel,
  fallback: FallbackIcon,
  className,
}: IconSpriteProps) {
  // Normalize the name — prefix with "icon-" if not already prefixed
  const spriteName = name.startsWith("icon-") ? name : `icon-${name}`;

  // Check if the sprite exists in the map
  const spriteExists = spriteName in spriteMap;

  if (spriteExists) {
    return (
      <SpriteRegion
        name={spriteName}
        scale={size}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
        className={`inline-block ${className ?? ""}`.trim()}
      />
    );
  }

  // Sprite not found — attempt fallback
  if (FallbackIcon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[IconSprite] Unknown sprite name: "${spriteName}". Falling back to Lucide icon.`
      );
    }

    return (
      <span
        className={`inline-flex items-center justify-center ${className ?? ""}`.trim()}
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
      >
        <FallbackIcon className={FALLBACK_SIZE_CLASS[size]} />
      </span>
    );
  }

  // No fallback — render nothing, log warning in dev
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[IconSprite] Unknown sprite name: "${spriteName}" and no fallback provided. Rendering nothing.`
    );
  }

  return null;
}
