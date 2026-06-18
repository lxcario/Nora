"use client";

import { DialogFrame, PixelButton } from "@/components/pixel-ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md">
        <DialogFrame state="error">
          <div className="flex flex-col items-center gap-4 text-center py-4">
            {/* Pixel error icon */}
            <div
              style={{
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid var(--pixel-error)",
                borderRadius: "2px",
                imageRendering: "pixelated",
              }}
              aria-hidden="true"
            >
              <span
                style={{
                  fontFamily: "var(--font-pixel)",
                  fontSize: "22px",
                  color: "var(--pixel-error)",
                  lineHeight: 1,
                }}
              >
                ✕
              </span>
            </div>

            <h2
              className="font-pixel text-lg"
              style={{ color: "var(--pixel-text-primary)" }}
            >
              Something went wrong
            </h2>

            <p
              className="text-sm"
              style={{ color: "var(--pixel-text-secondary)", lineHeight: 1.5 }}
            >
              {error.message || "An unexpected error occurred. This isn't your fault — try refreshing."}
            </p>

            <PixelButton variant="danger" onClick={reset}>
              Try again
            </PixelButton>
          </div>
        </DialogFrame>
      </div>
    </div>
  );
}
