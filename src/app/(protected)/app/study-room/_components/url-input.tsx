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
          <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Paste a YouTube URL…"
            className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500 ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
                : "border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700"
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={!url.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Load
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
