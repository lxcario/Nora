import { spriteMap } from "./sprite-map";
import type { SpriteCoord } from "./sprite-map";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NineSliceProps {
  /** Dialog variant: "standard" uses dialog-box.png, "large" uses dialog-box-big.png */
  variant?: "standard" | "large";
  /** Integer scale multiplier (default: 2) */
  scale?: 2 | 3;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Region keys for each nine-slice position
// ---------------------------------------------------------------------------

const REGION_SUFFIXES = [
  "tl",
  "top",
  "tr",
  "left",
  "center",
  "right",
  "bl",
  "bottom",
  "br",
] as const;

type RegionSuffix = (typeof REGION_SUFFIXES)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the sheet dimensions for a given spritesheet path by scanning
 * all sprite map entries that reference that sheet.
 */
function getSheetDimensions(sheetPath: string): {
  width: number;
  height: number;
} {
  let maxW = 0;
  let maxH = 0;

  for (const coord of Object.values(spriteMap)) {
    if (coord.sheet === sheetPath) {
      const extentX = coord.x + coord.width;
      const extentY = coord.y + coord.height;
      if (extentX > maxW) maxW = extentX;
      if (extentY > maxH) maxH = extentY;
    }
  }

  return { width: maxW, height: maxH };
}

/**
 * Determine the background-repeat value for a given region position.
 */
function getRepeat(suffix: RegionSuffix): string {
  switch (suffix) {
    case "tl":
    case "tr":
    case "bl":
    case "br":
      return "no-repeat";
    case "top":
    case "bottom":
      return "repeat-x";
    case "left":
    case "right":
      return "repeat-y";
    case "center":
      return "repeat";
  }
}

/**
 * Determine the grid area placement for a given region position.
 */
function getGridArea(suffix: RegionSuffix): string {
  const map: Record<RegionSuffix, string> = {
    tl: "1 / 1 / 2 / 2",
    top: "1 / 2 / 2 / 3",
    tr: "1 / 3 / 2 / 4",
    left: "2 / 1 / 3 / 2",
    center: "2 / 2 / 3 / 3",
    right: "2 / 3 / 3 / 4",
    bl: "3 / 1 / 4 / 2",
    bottom: "3 / 2 / 4 / 3",
    br: "3 / 3 / 4 / 4",
  };
  return map[suffix];
}

/**
 * Build inline styles for a single nine-slice cell.
 * For edges and center, the background is set to tile (repeat).
 * For corners, the background is no-repeat with fixed dimensions.
 */
function buildCellStyle(
  coord: SpriteCoord,
  suffix: RegionSuffix,
  scale: number,
  sheetDims: { width: number; height: number },
): React.CSSProperties {
  const scaledW = coord.width * scale;
  const scaledH = coord.height * scale;

  // Background position — offset to show the correct region
  const bgPosX = -(coord.x * scale);
  const bgPosY = -(coord.y * scale);

  const bgSizeW = sheetDims.width * scale;
  const bgSizeH = sheetDims.height * scale;

  const repeat = getRepeat(suffix);

  const style: React.CSSProperties = {
    gridArea: getGridArea(suffix),
    backgroundImage: `url(${coord.sheet})`,
    backgroundPosition: `${bgPosX}px ${bgPosY}px`,
    backgroundSize: `${bgSizeW}px ${bgSizeH}px`,
    backgroundRepeat: repeat,
    imageRendering: "pixelated" as const,
  };

  // Set explicit dimensions for corners (fixed size)
  if (suffix === "tl" || suffix === "tr" || suffix === "bl" || suffix === "br") {
    style.width = scaledW;
    style.height = scaledH;
  }

  // Top and bottom edges: fixed height, stretch width
  if (suffix === "top" || suffix === "bottom") {
    style.height = scaledH;
  }

  // Left and right edges: fixed width, stretch height
  if (suffix === "left" || suffix === "right") {
    style.width = scaledW;
  }

  // Center: use solid fill as fallback background
  if (suffix === "center") {
    style.backgroundColor = "var(--pixel-bg-surface)";
  }

  return style;
}

// ---------------------------------------------------------------------------
// NineSlice Component (Server Component)
// ---------------------------------------------------------------------------

/**
 * Scalable pixel-art panel using CSS Grid 3×3 nine-slice technique.
 *
 * Corners maintain fixed pixel dimensions, edges tile along their axis,
 * and the center stretches to accommodate children content.
 */
export function NineSlice({
  variant = "standard",
  scale = 2,
  className,
  style,
  children,
}: NineSliceProps) {
  const prefix = variant === "large" ? "dialog-large" : "dialog-standard";

  // Look up the top-left corner to get the sheet path and corner size
  const tlCoord = spriteMap[`${prefix}-tl`];

  if (!tlCoord) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[NineSlice] Missing sprite map entry for "${prefix}-tl". ` +
          `Ensure the sprite map includes nine-slice regions for variant "${variant}".`,
      );
    }
    return <div className={className} style={style}>{children}</div>;
  }

  const sheetDims = getSheetDimensions(tlCoord.sheet);

  // Corner size determines the fixed row/column sizes in the grid
  const cornerW = tlCoord.width * scale;
  const cornerH = tlCoord.height * scale;

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplate: `${cornerH}px 1fr ${cornerH}px / ${cornerW}px 1fr ${cornerW}px`,
    ...style,
  };

  return (
    <div className={className} style={gridStyle}>
      {REGION_SUFFIXES.map((suffix) => {
        const regionName = `${prefix}-${suffix}`;
        const coord = spriteMap[regionName];

        if (!coord) {
          // Render an empty cell if sprite data is missing
          return (
            <div
              key={suffix}
              style={{ gridArea: getGridArea(suffix) }}
            />
          );
        }

        const cellStyle = buildCellStyle(coord, suffix, scale, sheetDims);

        if (suffix === "center") {
          // Center cell contains children
          return (
            <div key={suffix} style={cellStyle}>
              {children}
            </div>
          );
        }

        return <div key={suffix} style={cellStyle} aria-hidden="true" />;
      })}
    </div>
  );
}
