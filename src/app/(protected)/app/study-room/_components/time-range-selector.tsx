"use client";

import { useState, useCallback } from "react";
import { Clock, Sparkles, Loader2 } from "lucide-react";
import {
  parseTimeInput,
  formatSeconds,
  validateTimeRange,
} from "../../_actions/study-room/transcript-utils";

interface TimeRangeSelectorProps {
  videoDuration: number; // seconds
  onGenerate: (startSeconds: number, endSeconds: number) => void;
  isLoading?: boolean;
  currentTime?: number; // current player time for quick "From here" button
}

export function TimeRangeSelector({
  videoDuration,
  onGenerate,
  isLoading = false,
  currentTime,
}: TimeRangeSelectorProps) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSetToCurrent = useCallback(() => {
    if (currentTime == null) return;
    setStartInput(formatSeconds(currentTime));
    setError(null);
  }, [currentTime]);

  const handleGenerate = useCallback(() => {
    setError(null);

    // Parse start time
    const startSeconds = parseTimeInput(startInput);
    if (startSeconds === null) {
      setError("Start time must be in MM:SS or HH:MM:SS format");
      return;
    }

    // Parse end time
    const endSeconds = parseTimeInput(endInput);
    if (endSeconds === null) {
      setError("End time must be in MM:SS or HH:MM:SS format");
      return;
    }

    // Validate time range
    const validation = validateTimeRange(startSeconds, endSeconds, videoDuration);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid time range");
      return;
    }

    onGenerate(startSeconds, endSeconds);
  }, [startInput, endInput, videoDuration, onGenerate]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        {/* Start input */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Start
          </label>
          <div className="relative">
            <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={startInput}
              onChange={(e) => {
                setStartInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="00:00"
              className="w-24 rounded-md border border-zinc-200 bg-white py-1.5 pl-7 pr-2 font-mono text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* "Set to current" button */}
        {currentTime != null && (
          <button
            type="button"
            onClick={handleSetToCurrent}
            className="mb-0.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            From here
          </button>
        )}

        {/* End input */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            End
          </label>
          <div className="relative">
            <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={endInput}
              onChange={(e) => {
                setEndInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder={formatSeconds(videoDuration)}
              className="w-24 rounded-md border border-zinc-200 bg-white py-1.5 pl-7 pr-2 font-mono text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Generate Notes button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || !startInput.trim() || !endInput.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isLoading ? "Generating…" : "Generate Notes"}
        </button>
      </div>

      {/* Duration hint */}
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
        Video duration: {formatSeconds(videoDuration)}
      </p>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
