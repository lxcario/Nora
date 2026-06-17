"use client";

import { useState, useCallback } from "react";
import { Link, ArrowRight } from "lucide-react";
import { extractYouTubeId } from "../../_actions/study-room/search-heuristic";

interface UrlInputProps {
  onVideoId: (youtubeId: string) => void;
}

export function UrlInput({ onVideoId }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmed = url.trim();
      if (!trimmed) return;

      const videoId = extractYouTubeId(trimmed);

      if (!videoId) {
        setError("Not a valid YouTube video URL");
        return;
      }

      setError(null);
      setUrl("");
      onVideoId(videoId);
    },
    [url, onVideoId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-1.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pixel-text-muted)]" />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Paste a YouTube URL…"
            className="w-full"
            style={{
              paddingLeft: "36px",
              borderColor: error ? "var(--pixel-error)" : undefined,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!url.trim()}
          className="inline-flex items-center gap-1.5 !bg-[var(--pixel-accent)] !text-[var(--pixel-bg-primary)] hover:!brightness-110"
        >
          Load
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {error && <p className="text-xs text-[var(--pixel-error)]">{error}</p>}
    </div>
  );
}
