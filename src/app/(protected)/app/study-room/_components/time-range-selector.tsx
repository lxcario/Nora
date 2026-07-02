"use client";

import { useState, useCallback } from "react";
import {
  parseTimeInput,
  formatSeconds,
  validateTimeRange,
} from "../../_actions/study-room/transcript-utils";
import { PixelButton } from "@/components/pixel-ui";

interface TimeRangeSelectorProps {
  videoDuration: number;
  onGenerate: (startSeconds: number, endSeconds: number) => void;
  isLoading?: boolean;
  currentTime?: number;
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
    const startSeconds = parseTimeInput(startInput);
    if (startSeconds === null) { setError("Start time must be MM:SS or HH:MM:SS"); return; }
    const endSeconds = parseTimeInput(endInput);
    if (endSeconds === null) { setError("End time must be MM:SS or HH:MM:SS"); return; }
    const validation = validateTimeRange(startSeconds, endSeconds, videoDuration);
    if (!validation.valid) { setError(validation.error ?? "Invalid time range"); return; }
    onGenerate(startSeconds, endSeconds);
  }, [startInput, endInput, videoDuration, onGenerate]);

  const inputStyle = {
    backgroundColor: "var(--pixel-bg-primary)",
    color: "var(--pixel-text-primary)",
    border: "2px solid var(--pixel-border)",
    padding: "6px 8px 6px 28px",
    fontFamily: "monospace",
    fontSize: "12px",
    width: "96px",
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        {/* Start input */}
        <div className="flex flex-col gap-1">
          <label className="font-pixel text-[9px] uppercase" style={{ color: "var(--pixel-text-muted)" }}>
            Start
          </label>
          <div className="relative">
            <img src="/sprites/travel-book/icons/Watch.png" alt="" width={12} height={12}
              className="pixel-art absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
            <input type="text" value={startInput} placeholder="00:00"
              onChange={(e) => { setStartInput(e.target.value); if (error) setError(null); }}
              style={inputStyle} />
          </div>
        </div>

        {/* Set to current */}
        {currentTime != null && (
          <button type="button" onClick={handleSetToCurrent}
            className="pixel-panel font-pixel text-[9px] px-2 py-1.5 pixel-hover-brighten"
            style={{ color: "var(--pixel-text-secondary)", marginBottom: "2px" }}>
            From here
          </button>
        )}

        {/* End input */}
        <div className="flex flex-col gap-1">
          <label className="font-pixel text-[9px] uppercase" style={{ color: "var(--pixel-text-muted)" }}>
            End
          </label>
          <div className="relative">
            <img src="/sprites/travel-book/icons/Watch.png" alt="" width={12} height={12}
              className="pixel-art absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
            <input type="text" value={endInput} placeholder={formatSeconds(videoDuration)}
              onChange={(e) => { setEndInput(e.target.value); if (error) setError(null); }}
              style={inputStyle} />
          </div>
        </div>

        {/* Generate Notes */}
        <PixelButton
          variant="primary"
          onClick={handleGenerate}
          disabled={isLoading || !startInput.trim() || !endInput.trim()}
          loading={isLoading}
        >
          ✨ {isLoading ? "Generating..." : "Generate Notes"}
        </PixelButton>
      </div>

      <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
        Video duration: {formatSeconds(videoDuration)}
      </p>

      {error && <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-error)" }}>{error}</p>}
    </div>
  );
}
