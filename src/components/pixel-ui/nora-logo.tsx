"use client";

/**
 * NORA Logo — 3D extruded pixel-art text
 * Rendered as a pure CSS grid of blocks matching the reference:
 * White face, dark shadow/depth on bottom and right edges.
 *
 * Each letter is a 5×7 grid with 1px extrusion offset.
 * Scale controlled by `size` prop (px per pixel-block).
 */

interface NoraLogoProps {
  /** Size of each pixel block in CSS px */
  size?: number;
  className?: string;
}

// Letter matrices (5 wide × 7 tall) — 1 = filled, 0 = empty
const LETTERS: Record<string, number[][]> = {
  N: [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,1,1,0,1],
    [1,0,1,1,1],
    [1,0,0,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  O: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  R: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1],
  ],
  A: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
};

function PixelLetter({ letter, size }: { letter: string; size: number }) {
  const matrix = LETTERS[letter];
  if (!matrix) return null;

  const shadowOffset = Math.max(1, Math.round(size * 0.35));

  return (
    <div
      className="relative"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(5, ${size}px)`,
        gridTemplateRows: `repeat(7, ${size}px)`,
        gap: "0px",
      }}
    >
      {matrix.flatMap((row, y) =>
        row.map((cell, x) => {
          if (!cell) return <div key={`${y}-${x}`} />;
          return (
            <div
              key={`${y}-${x}`}
              style={{
                backgroundColor: "#ffffff",
                boxShadow: `${shadowOffset}px ${shadowOffset}px 0 #2a2a2a, ${shadowOffset}px 0 0 #3a3a3a, 0 ${shadowOffset}px 0 #3a3a3a`,
                imageRendering: "pixelated",
              }}
            />
          );
        })
      )}
    </div>
  );
}

export function NoraLogo({ size = 4, className = "" }: NoraLogoProps) {
  const gap = Math.max(2, size);

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: `${gap}px` }}
      aria-label="NORA"
      role="img"
    >
      <PixelLetter letter="N" size={size} />
      <PixelLetter letter="O" size={size} />
      <PixelLetter letter="R" size={size} />
      <PixelLetter letter="A" size={size} />
    </div>
  );
}
