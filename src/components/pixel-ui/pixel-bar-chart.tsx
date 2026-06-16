"use client";

import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelBarChartProps {
  /** Array of data points with labels and values */
  data: { label: string; value: number }[];
  /** Optional maximum value for scaling bars (defaults to largest value in data) */
  maxValue?: number;
}

// ---------------------------------------------------------------------------
// PixelBarChart Component (Client Component)
// ---------------------------------------------------------------------------

/**
 * Pixel-art styled bar chart using solid Color_Palette fills.
 * No gradients — solid bars with 1px borders and pixel font axis labels.
 * Hover tooltip shows value in a simple styled div.
 */
export function PixelBarChart({ data, maxValue }: PixelBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const computedMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  const handleMouseEnter = useCallback(
    (index: number, event: React.MouseEvent) => {
      setHoveredIndex(index);
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    },
    [],
  );

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Chart dimensions
  const chartHeight = 160;
  const barGap = 8;

  return (
    <div className="relative" style={{ userSelect: "none" }}>
      {/* Chart area */}
      <div
        className="flex items-end justify-center"
        style={{
          height: chartHeight,
          gap: `${barGap}px`,
          padding: "0 8px",
        }}
      >
        {data.map((item, index) => {
          const barHeight = Math.max(
            4,
            (item.value / computedMax) * (chartHeight - 24),
          );

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex flex-col items-center justify-end"
              style={{ flex: 1, height: "100%", maxWidth: 48 }}
            >
              {/* Bar */}
              <div
                className="relative w-full"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: "var(--pixel-accent)",
                  border: "1px solid var(--pixel-border)",
                  imageRendering: "pixelated",
                  minWidth: 16,
                }}
                onMouseEnter={(e) => handleMouseEnter(index, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div
        className="flex justify-center"
        style={{
          gap: `${barGap}px`,
          padding: "4px 8px 0",
          borderTop: "1px solid var(--pixel-border-light)",
          marginTop: 4,
        }}
      >
        {data.map((item, index) => (
          <div
            key={`label-${item.label}-${index}`}
            className="text-center"
            style={{
              flex: 1,
              maxWidth: 48,
              fontFamily: "var(--font-pixel)",
              fontSize: 10,
              letterSpacing: "0.5px",
              color: "var(--pixel-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && (
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
          {data[hoveredIndex].label}: {data[hoveredIndex].value}
        </div>
      )}
    </div>
  );
}
