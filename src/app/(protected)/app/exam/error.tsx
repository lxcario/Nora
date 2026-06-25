"use client";

import { DialogFrame, PixelButton } from "@/components/pixel-ui";

export default function ExamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-12">
      <DialogFrame title="SOMETHING WENT WRONG">
        <div className="space-y-4 text-center">
          <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
            The exam page couldn&apos;t load. This usually means the feature is still
            being set up for your account.
          </p>
          <p className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
            {error.digest ? `Error: ${error.digest}` : "Try refreshing or come back in a moment."}
          </p>
          <div className="flex justify-center gap-3">
            <PixelButton variant="secondary" onClick={reset}>
              Try Again
            </PixelButton>
            <PixelButton variant="primary" onClick={() => window.location.assign("/app")}>
              Go Home
            </PixelButton>
          </div>
        </div>
      </DialogFrame>
    </div>
  );
}
