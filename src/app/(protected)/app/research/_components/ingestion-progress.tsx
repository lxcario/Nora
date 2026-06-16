"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { getIngestionStatus } from "../../_actions/rag";

interface IngestionProgressProps {
  paperId: string;
  onComplete?: () => void;
}

type ParseStatus = "pending" | "processing" | "ready" | "partial" | "failed";

interface StatusData {
  parseStatus: ParseStatus;
  parseError: string | null;
  chunkCount: number;
}

export function IngestionProgress({ paperId, onComplete }: IngestionProgressProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref in sync without triggering re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fetchStatus = useCallback(async () => {
    const result = await getIngestionStatus(paperId);
    if (result.error) {
      setError(result.error);
      return "stop" as const;
    }
    if (result.data) {
      setStatus({
        parseStatus: result.data.parseStatus,
        parseError: result.data.parseError,
        chunkCount: result.data.chunkCount,
      });

      // Stop polling for terminal states
      if (
        result.data.parseStatus === "ready" ||
        result.data.parseStatus === "partial" ||
        result.data.parseStatus === "failed"
      ) {
        if (result.data.parseStatus === "ready") {
          onCompleteRef.current?.();
        }
        return "stop" as const;
      }
    }
    return "continue" as const;
  }, [paperId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    // Initial fetch
    fetchStatus().then((result) => {
      if (cancelled) return;
      if (result === "continue") {
        intervalId = setInterval(async () => {
          const pollResult = await fetchStatus();
          if (pollResult === "stop" && intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }, 3000);
      }
    });

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchStatus]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-900/20">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-500">Loading status...</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <StatusDisplay status={status} />
      {(status.parseStatus === "pending" || status.parseStatus === "processing") && (
        <IndeterminateProgressBar />
      )}
    </div>
  );
}

function StatusDisplay({ status }: { status: StatusData }) {
  switch (status.parseStatus) {
    case "pending":
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Queued for processing...
          </span>
        </div>
      );

    case "processing":
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          <span className="text-sm text-indigo-600 dark:text-indigo-400">
            Processing your paper
            <AnimatedDots />
          </span>
        </div>
      );

    case "ready":
      return (
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            Paper indexed! {status.chunkCount} chunks created
          </span>
        </div>
      );

    case "partial":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Partially indexed: {status.chunkCount} chunks
            </span>
          </div>
          {status.parseError && (
            <p className="pl-6 text-xs text-amber-500 dark:text-amber-400/80">
              {status.parseError.length > 200
                ? `${status.parseError.slice(0, 200)}…`
                : status.parseError}
            </p>
          )}
        </div>
      );

    case "failed":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Processing failed
            </span>
          </div>
          {status.parseError && (
            <p className="pl-6 text-xs text-red-500 dark:text-red-400/80">
              {status.parseError.length > 200
                ? `${status.parseError.slice(0, 200)}…`
                : status.parseError}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function AnimatedDots() {
  return (
    <span className="inline-flex w-6">
      <span className="animate-pulse">...</span>
    </span>
  );
}

function IndeterminateProgressBar() {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
      <div
        className="h-full w-1/3 rounded-full bg-indigo-500"
        style={{
          animation: "indeterminate 1.5s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
