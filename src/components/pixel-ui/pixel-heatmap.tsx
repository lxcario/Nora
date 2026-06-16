"use client";

import { useState, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelHeatmapProps {
  /** Array of data points with date strings and activity count */
  data: { date: string; count: number }[];
  /** Number of weeks to display (columns); default 12 */
  weeks?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map an activity count to a color intensity band.
 * 0 = secondary background (no activity)
 * low = light green (#a8c97a)
 * mid = success green (var(--pixel-success))
 * high = dark green (#3d6b2d)
 */
function getIntensityColor(count: number, maxCount: number): string {
  if (count === 0) return "var(--pixel-bg-secondary)";
  if (maxCount === 0) return "var(--pixel-bg-secondary)";

  const ratio = count / maxCount;

  if (ratio <= 0.33) return "#a8c97a"; // light green
  if (ratio <= 0.66) return "var(--pixel-success)"; // sage green
  return "#3d6b2d"; // dark green
}

// ---------------------------------------------------------------------------
// PixelHeatmap Component (Client Component)
// ---------------------------------------------------------------------------

/**
 * Consistency heatmap rendered as a grid of small pixel squares.
 * 7 rows (days of week) × N columns (weeks), with color intensity
 * mapping from cream (no activity) to dark green (high activity).
 * Hover tooltip shows date + count.
 */
export function PixelHeatmap({ data, weeks = 12 }: PixelHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    count: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Build a lookup map for quick access by date
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data) {
      map.set(item.date, item.count);
    }
    return map;
  }, [data]);

  // Compute max count for intensity scaling
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data],
  );

  // Build grid cells: 7 rows (days) × weeks columns
  // Each cell represents a day, ordered column-first (week by week)
  const totalCells = 7 * weeks;

  // Generate dates working backwards from today to fill the grid
  const cells = useMemo(() => {
    const result: { date: string; count: number }[] = [];
    const today = new Date();

    // Start from the most recent Sunday to align the grid
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const startOffset = totalCells - 1 - dayOfWeek;

    for (let i = 0; i < totalCells; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (startOffset - i));
      const dateStr = date.toISOString().split("T")[0];
      const count = dataMap.get(dateStr) ?? 0;
      result.push({ date: dateStr, count });
    }

    return result;
  }, [dataMap, totalCells]);

  const handleMouseEnter = useCallback(
    (cell: { date: string; count: number }, event: React.MouseEvent) => {
      setHoveredCell(cell);
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Grid dimensions
  const cellSize = 12;
  const cellGap = 2;

  return (
    <div className="relative" style={{ userSelect: "none" }}>
      {/* Heatmap grid: CSS Grid with 7 rows, auto-fill columns */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: `repeat(7, ${cellSize}px)`,
          gridAutoFlow: "column",
          gridAutoColumns: `${cellSize}px`,
          gap: `${cellGap}px`,
        }}
        role="img"
        aria-label="Activity heatmap"
      >
        {cells.map((cell, index) => (
          <div
            key={`${cell.date}-${index}`}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: getIntensityColor(cell.count, maxCount),
              border: "1px solid var(--pixel-border-light)",
              imageRendering: "pixelated",
            }}
            onMouseEnter={(e) => handleMouseEnter(cell, e)}
            onMouseLeave={handleMouseLeave}
            aria-label={`${cell.date}: ${cell.count} activities`}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
            backgroundColor: "var(--pixel-bg-surface)",
            border: "2px solid var(--pixel-border)",
            padding: "4px 8px",
            fontFamily: "var(--font-pixel)",
            fontSize: 12,
            color: "var(--pixel-text-primary)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 50,
            imageRendering: "pixelated",
          }}
          role="tooltip"
        >
          {hoveredCell.date}: {hoveredCell.count}
        </div>
      )}
    </div>
  );
}

/**
 * Export the intensity color helper for use in property tests.
 */
export { getIntensityColor };
