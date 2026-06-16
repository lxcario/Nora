"use client";

import { useState } from "react";
import { FileText, RefreshCw, Trash2, Download, Loader2 } from "lucide-react";

interface Paper {
  id: string;
  title: string;
  parseStatus: "pending" | "processing" | "ready" | "partial" | "failed";
  parseError: string | null;
  chunkCount: number;
  url: string | null;
  createdAt: string;
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
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <FileText className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No papers uploaded yet
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
          Upload a PDF or paste a URL above to index your papers. Then ask questions and get cited answers grounded in your material.
        </p>
      </div>
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

  function handleCancelDelete() {
    setConfirmingDeleteId(null);
  }

  return (
    <div className="space-y-2">
      {papers.map((paper) => (
        <div
          key={paper.id}
          className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {paper.title}
              </span>
              <StatusBadge status={paper.parseStatus} chunkCount={paper.chunkCount} />
            </div>

            {/* Error preview for failed/partial */}
            {(paper.parseStatus === "failed" || paper.parseStatus === "partial") &&
              paper.parseError && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {paper.parseError.length > 200
                    ? `${paper.parseError.slice(0, 200)}…`
                    : paper.parseError}
                </p>
              )}

            {/* Low-text PDF guidance */}
            {paper.parseStatus === "ready" && paper.chunkCount > 0 && paper.chunkCount <= 2 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠ This document may be image-heavy. Consider uploading a text-based PDF for better results.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-shrink-0 items-center gap-1">
            {/* Retry button for failed/partial */}
            {(paper.parseStatus === "failed" || paper.parseStatus === "partial") && (
              <button
                onClick={() => onRetry?.(paper.id)}
                title="Retry ingestion"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}

            {/* Parse & Index button for papers with URL but no indexed chunks */}
            {paper.url && paper.chunkCount === 0 && paper.parseStatus !== "processing" && (
              <button
                onClick={() => onIngestUrl?.(paper.id)}
                title="Parse & Index from URL"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20"
              >
                <Download className="h-3 w-3" />
                Parse &amp; Index
              </button>
            )}

            {/* Delete button with confirmation */}
            {confirmingDeleteId === paper.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteClick(paper.id)}
                  className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleDeleteClick(paper.id)}
                title="Delete paper"
                className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
  chunkCount,
}: {
  status: Paper["parseStatus"];
  chunkCount: number;
}) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Ready · {chunkCount} chunks
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
          Pending
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Partial · {chunkCount} chunks
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Failed
        </span>
      );
    default:
      return null;
  }
}
