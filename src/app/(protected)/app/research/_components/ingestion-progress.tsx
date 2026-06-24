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
      <div
        className="flex items-center gap-2 rounded-sm border-l-4 px-3 py-2"
        style={{ borderLeftColor: "var(--pixel-error)", backgroundColor: "var(--pixel-bg-surface)" }}
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "var(--pixel-error)" }} />
        <span className="text-sm" style={{ color: "var(--pixel-error)" }}>{error}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--pixel-text-muted)" }} />
        <span className="text-sm" style={{ color: "var(--pixel-text-muted)" }}>Loading status...</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-sm border-2 p-3"
      style={{ borderColor: "var(--pixel-border)", backgroundColor: "var(--pixel-bg-surface)" }}
    >
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
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--pixel-text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--pixel-text-muted)" }}>
            Queued for processing...
          </span>
        </div>
      );

    case "processing":
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--pixel-accent)" }} />
          <span className="text-sm" style={{ color: "var(--pixel-accent)" }}>
            Processing your paper
            <AnimatedDots />
          </span>
        </div>
      );

    case "ready":
      return (
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4" style={{ color: "var(--pixel-success)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--pixel-success)" }}>
            Paper indexed! {status.chunkCount} chunks created
          </span>
        </div>
      );

    case "partial":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--pixel-warning)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--pixel-warning)" }}>
              Partially indexed: {status.chunkCount} chunks
            </span>
          </div>
          {status.parseError && (
            <p className="pl-6 text-xs" style={{ color: "var(--pixel-warning)", opacity: 0.8 }}>
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
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--pixel-error)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--pixel-error)" }}>
              Processing failed
            </span>
          </div>
          {status.parseError && (
            <p className="pl-6 text-xs" style={{ color: "var(--pixel-error)", opacity: 0.8 }}>
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
    <div
      className="mt-2 h-1.5 w-full overflow-hidden rounded-sm"
      style={{ backgroundColor: "var(--pixel-bg-primary)" }}
    >
      <div
        className="h-full w-1/3 rounded-sm"
        style={{
          backgroundColor: "var(--pixel-accent)",
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
