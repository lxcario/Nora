"use client";

import { useState, useCallback } from "react";
import { spriteMap } from "./sprite-map";
import type { SpriteCoord } from "./sprite-map";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelButtonProps {
  size?: "small" | "default";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the sheet dimensions for a given spritesheet path by scanning the
 * sprite map (same logic as SpriteRegion).
 */
function getSheetDimensions(sheet: string): { width: number; height: number } {
  let maxW = 0;
  let maxH = 0;
  for (const coord of Object.values(spriteMap)) {
    if (coord.sheet === sheet) {
      const extentX = coord.x + coord.width;
      const extentY = coord.y + coord.height;
      if (extentX > maxW) maxW = extentX;
      if (extentY > maxH) maxH = extentY;
    }
  }
  return { width: maxW, height: maxH };
}

/**
 * Build CSS background properties for a sprite coordinate at a given scale.
 */
function spriteBackground(
  coord: SpriteCoord,
  scale: number,
): React.CSSProperties {
  const sheetDims = getSheetDimensions(coord.sheet);
  const bgPosX = -(coord.x * scale);
  const bgPosY = -(coord.y * scale);
  const bgSizeW = sheetDims.width * scale;
  const bgSizeH = sheetDims.height * scale;

  return {
    backgroundImage: `url(${coord.sheet})`,
    backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    backgroundSize: `${bgSizeW}px ${bgSizeH}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
  };
}

/**
 * Resolve the sprite map key for a given variant and interaction state.
 * Danger variant maps to secondary sprites (hue-rotate applied via CSS).
 */
function getSpriteKey(
  variant: "primary" | "secondary" | "danger",
  state: "idle" | "hover" | "active" | "disabled",
): string {
  const spriteVariant = variant === "danger" ? "danger" : variant;
  return `button-${spriteVariant}-${state}`;
}

// ---------------------------------------------------------------------------
// PixelButton Component
// ---------------------------------------------------------------------------

/**
 * Pixel-art styled button using Sprout Lands spritesheet.
 * Renders idle/hover/active/disabled states from the buttons-26x26.png sheet.
 * Uses native <button> for full keyboard accessibility (Enter/Space).
 */
export function PixelButton({
  size = "default",
  variant = "primary",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  children,
}: PixelButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Determine current interaction state for sprite selection
  const interactionState: "idle" | "hover" | "active" | "disabled" =
    disabled || loading
      ? "disabled"
      : isActive
        ? "active"
        : isHovered
          ? "hover"
          : "idle";

  // Resolve sprite
  const spriteKey = getSpriteKey(variant, interactionState);
  const coord = spriteMap[spriteKey];

  // Scale factor: "small" = 1x, "default" = 2x
  const scale = size === "small" ? 1 : 2;

  // Native sprite dimensions at scale
  const spriteWidth = coord ? coord.width * scale : 52;
  const spriteHeight = coord ? coord.height * scale : 56;

  // Build background style for the sprite
  const bgStyle: React.CSSProperties = coord
    ? spriteBackground(coord, scale)
    : {};

  // Compute data-state attribute
  const dataState = disabled
    ? "disabled"
    : loading
      ? "loading"
      : undefined;

  // Active press offset (1-2px downward shift)
  const pressOffset = isActive && !disabled && !loading ? 2 : 0;

  // Danger variant: apply hue-rotate to shift secondary sprite to red
  const dangerFilter = variant === "danger" ? "hue-rotate(-50deg) saturate(1.5)" : undefined;

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsActive(false);
  }, []);
  const handleMouseDown = useCallback(() => setIsActive(true), []);
  const handleMouseUp = useCallback(() => setIsActive(false), []);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      data-state={dataState}
      className={`
        relative inline-flex items-center justify-center
        border-none bg-transparent
        font-pixel text-pixel-text
        select-none
        transition-transform duration-75
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pixel-accent
        ${className}
      `.trim()}
      style={{
        // Ensure minimum 44×44 touch target
        minWidth: 44,
        minHeight: 44,
        // Allow the button to be larger than the sprite for touch target
        padding: 0,
        cursor: disabled || loading ? "not-allowed" : undefined,
      }}
      aria-busy={loading || undefined}
      aria-disabled={disabled || undefined}
    >
      {/* Sprite background layer */}
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
        style={{
          ...bgStyle,
          width: spriteWidth,
          height: spriteHeight,
          // Center the sprite within the touch-target area
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateY(${pressOffset}px)`,
          filter: dangerFilter,
        }}
      />

      {/* Label text */}
      <span
        className="relative z-10 font-pixel px-2 leading-none"
        style={{
          fontSize: size === "small" ? 10 : 14,
          letterSpacing: "1px",
          transform: `translateY(${pressOffset}px)`,
          color: disabled ? "var(--pixel-disabled)" : "var(--pixel-text-primary)",
        }}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <span className="animate-pulse">⏳</span>
            {children}
          </span>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
