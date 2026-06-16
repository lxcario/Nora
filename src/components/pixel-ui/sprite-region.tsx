import { spriteMap } from "./sprite-map";
import type { SpriteCoord } from "./sprite-map";

// ---------------------------------------------------------------------------
// Sheet dimensions — derived from max extent of sprites in each sheet
// ---------------------------------------------------------------------------

function computeSheetDimensions(): Record<string, { width: number; height: number }> {
  const dims: Record<string, { width: number; height: number }> = {};

  for (const coord of Object.values(spriteMap)) {
    const current = dims[coord.sheet];
    const extentX = coord.x + coord.width;
    const extentY = coord.y + coord.height;

    if (!current) {
      dims[coord.sheet] = { width: extentX, height: extentY };
    } else {
      if (extentX > current.width) current.width = extentX;
      if (extentY > current.height) current.height = extentY;
    }
  }

  return dims;
}

const SHEET_DIMENSIONS = computeSheetDimensions();

// ---------------------------------------------------------------------------
// SpriteRegion Component
// ---------------------------------------------------------------------------

export interface SpriteRegionProps {
  /** Logical sprite name from sprite-map */
  name: string;
  /** Integer scaling factor (default: 2) */
  scale?: 1 | 2 | 3;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}

/**
 * Base sprite rendering utility — Server Component.
 *
 * Renders a `<div>` with CSS background-image, background-position, and
 * background-size to extract a single sprite region from a spritesheet.
 * Uses integer scaling via explicit width/height to prevent sub-pixel blur.
 */
export function SpriteRegion({
  name,
  scale = 2,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: SpriteRegionProps) {
  const coord: SpriteCoord | undefined = spriteMap[name];

  if (!coord) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[SpriteRegion] Unknown sprite name: "${name}". ` +
          `Available names: ${Object.keys(spriteMap).slice(0, 10).join(", ")}…`
      );
    }
    return null;
  }

  const renderedWidth = coord.width * scale;
  const renderedHeight = coord.height * scale;

  // Scale the background position and sheet size by the scale factor
  const bgPosX = -(coord.x * scale);
  const bgPosY = -(coord.y * scale);

  const sheetDims = SHEET_DIMENSIONS[coord.sheet];
  const bgSizeW = sheetDims ? sheetDims.width * scale : "auto";
  const bgSizeH = sheetDims ? sheetDims.height * scale : "auto";

  const inlineStyle: React.CSSProperties = {
    width: renderedWidth,
    height: renderedHeight,
    backgroundImage: `url(${coord.sheet})`,
    backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    backgroundSize: `${bgSizeW}px ${bgSizeH}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
    ...style,
  };

  return (
    <div
      className={className}
      style={inlineStyle}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaLabel ? "img" : undefined}
    />
  );
}
