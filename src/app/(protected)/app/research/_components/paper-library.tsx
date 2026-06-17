"use client";

import { useState } from "react";
import { FileText, RefreshCw, Trash2, Download, Loader2 } from "lucide-react";
import { DialogFrame, EmptyState } from "@/components/pixel-ui";

interface Paper {
  id: string;
  title: string;
  parseStatus: "pending" | "processing" | "ready" | "partial" | "failed";
  parseError: string | null;
  chunkCount: number;
  url: string | null;
}

interface PaperLibraryProps {
  papers: Paper[];
  onRetry?: (paperId: string) => void;
  onDelete?: (paperId: string) => void;
  onIngestUrl?: (paperId: string) => void;
}

export function PaperLibrary({ papers, onRetry, onDelete, onIngestUrl }: PaperLibraryProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  if (papers.length === 0) {
    return (
      <EmptyState
        icon="icon-book"
        message="No papers yet. Upload a PDF or paste a URL above, then ask questions and get answers grounded in your own material."
      />
    );
  }

  function handleDeleteClick(paperId: string) {
    if (confirmingDeleteId === paperId) {
      onDelete?.(paperId);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(paperId);
    }
  }

  return (
    <DialogFrame title={`Your Papers (${papers.length})`}>
      <div className="space-y-2">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="flex items-start gap-3 rounded-md p-3"
            style={{ backgroundColor: "var(--pixel-bg-secondary)" }}
          >
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--pixel-text-muted)]" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-[var(--pixel-text-primary)]">
                  {paper.title}
                </span>
                <StatusBadge status={paper.parseStatus} chunkCount={paper.chunkCount} />
              </div>

              {(paper.parseStatus === "failed" || paper.parseStatus === "partial") &&
                paper.parseError && (
                  <p className="mt-1 text-xs text-[var(--pixel-error)]">
                    {paper.parseError.length > 200
                      ? `${paper.parseError.slice(0, 200)}…`
                      : paper.parseError}
                  </p>
                )}

              {paper.parseStatus === "ready" &&
                paper.chunkCount > 0 &&
                paper.chunkCount <= 2 && (
                  <p className="mt-1 text-xs text-[var(--pixel-warning)]">
                    ⚠ This document may be image-heavy. A text-based PDF gives better results.
                  </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-shrink-0 items-center gap-1">
              {(paper.parseStatus === "failed" || paper.parseStatus === "partial") && (
                <button
                  onClick={() => onRetry?.(paper.id)}
                  title="Retry ingestion"
                  className="inline-flex items-center gap-1 !bg-transparent !border-none text-xs !px-2 !py-1 text-[var(--pixel-warning)] hover:!bg-[var(--pixel-bg-elevated)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              )}

              {paper.url &&
                paper.chunkCount === 0 &&
                paper.parseStatus !== "processing" && (
                  <button
                    onClick={() => onIngestUrl?.(paper.id)}
                    title="Parse & Index from URL"
                    className="inline-flex items-center gap-1 !bg-transparent !border-none text-xs !px-2 !py-1 text-[var(--pixel-accent)] hover:!bg-[var(--pixel-bg-elevated)]"
                  >
                    <Download className="h-3 w-3" />
                    Parse &amp; Index
                  </button>
                )}

              {confirmingDeleteId === paper.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteClick(paper.id)}
                    className="!bg-[var(--pixel-error)] !text-white hover:!brightness-110 text-xs !px-2 !py-1"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingDeleteId(null)}
                    className="!bg-transparent !border-none text-xs !px-2 !py-1 text-[var(--pixel-text-muted)] hover:!bg-[var(--pixel-bg-elevated)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDeleteClick(paper.id)}
                  title="Delete paper"
                  className="!bg-transparent !border-none !p-1 text-[var(--pixel-text-muted)] hover:!text-[var(--pixel-error)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DialogFrame>
  );
}

function StatusBadge({
  status,
  chunkCount,
}: {
  status: Paper["parseStatus"];
  chunkCount: number;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";

  switch (status) {
    case "ready":
      return (
        <span
          className={base}
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-success) 20%, transparent)",
            color: "var(--pixel-success)",
          }}
        >
          Ready · {chunkCount} chunks
        </span>
      );
    case "processing":
      return (
        <span
          className={base}
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-warning) 20%, transparent)",
            color: "var(--pixel-warning)",
          }}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "pending":
      return (
        <span
          className={base}
          style={{
            backgroundColor: "var(--pixel-bg-elevated)",
            color: "var(--pixel-text-muted)",
          }}
        >
          Pending
        </span>
      );
    case "partial":
      return (
        <span
          className={base}
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-warning) 20%, transparent)",
            color: "var(--pixel-warning)",
          }}
        >
          Partial · {chunkCount} chunks
        </span>
      );
    case "failed":
      return (
        <span
          className={base}
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-error) 20%, transparent)",
            color: "var(--pixel-error)",
          }}
        >
          Failed
        </span>
      );
    default:
      return null;
  }
}
