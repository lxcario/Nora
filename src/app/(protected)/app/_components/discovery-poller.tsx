"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processNextJob, type JobProgress } from "@/app/(protected)/app/_actions/academic/jobs";

/**
 * Drives the durable job queue from the client while the onboarding/review UI
 * is open (Requirement 12.3): repeatedly calls `processNextJob()` until no work
 * remains, then refreshes the route to surface newly discovered data. A closed
 * tab simply stops polling; the optional pg_cron sweeper (Task 12) resumes work.
 */
export function DiscoveryPoller({ initialProgress }: { initialProgress: JobProgress }) {
  const [progress, setProgress] = useState<JobProgress>(initialProgress);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      if (cancelled) return;
      try {
        const { progress: p } = await processNextJob();
        if (cancelled) return;
        setProgress(p);
        if (p.active) {
          timer = setTimeout(tick, 1500);
        } else {
          router.refresh();
        }
      } catch {
        if (!cancelled) timer = setTimeout(tick, 5000);
      }
    }

    if (initialProgress.active) {
      timer = setTimeout(tick, 600);
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total =
    progress.pending + progress.running + progress.succeeded + progress.failed + progress.skipped;
  const done = progress.succeeded + progress.failed + progress.skipped;

  if (total === 0) return null;

  return (
    <div className="rounded-lg border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-pixel text-[11px] text-[var(--pixel-accent)]">
          {progress.active ? "FINDING YOUR OFFICIAL SOURCES…" : "SOURCE COLLECTION DONE"}
        </span>
        <span className="text-xs text-[var(--pixel-text-secondary)]">
          {done}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden border border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)]">
        <div
          className="h-full transition-all"
          style={{
            width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%`,
            backgroundColor: progress.failed > 0 ? "var(--pixel-warning)" : "var(--pixel-accent)",
          }}
        />
      </div>
      {progress.active && (
        <p className="mt-1 text-[10px] text-[var(--pixel-text-secondary)]">
          You can keep using the app — this continues in the background.
        </p>
      )}
    </div>
  );
}
