"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { searchVideos } from "../../_actions/study-room";

interface VideoSearchProps {
  onSelectVideo: (
    youtubeId: string,
    title: string,
    channel: string,
    durationSeconds: number
  ) => void;
}

interface SearchResult {
  youtubeId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

/**
 * Formats a duration in seconds to MM:SS display format.
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VideoSearch({ onSelectVideo }: VideoSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate query on change
  const validateQuery = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setValidationError(null);
      return false;
    }
    if (trimmed.length < 3) {
      setValidationError("Search query must be at least 3 characters");
      return false;
    }
    if (trimmed.length > 200) {
      setValidationError("Search query must be under 200 characters");
      return false;
    }
    setValidationError(null);
    return true;
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3 || trimmed.length > 200) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchVideos(trimmed);
      if (result.error) {
        setError(result.error);
        setResults([]);
      } else {
        setResults(result.data ?? []);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const isValid = validateQuery(value);

      if (isValid) {
        debounceRef.current = setTimeout(() => {
          performSearch(value);
        }, 300);
      }
    },
    [validateQuery, performSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search educational videos…"
          maxLength={210}
          className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500 ${
            validationError
              ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
              : "border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700"
          }`}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500" />
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-xs text-red-500">{validationError}</p>
      )}

      {/* API error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map((video) => (
            <button
              key={video.youtubeId}
              type="button"
              onClick={() =>
                onSelectVideo(
                  video.youtubeId,
                  video.title,
                  video.channelTitle,
                  video.durationSeconds
                )
              }
              className="group flex gap-3 rounded-lg border border-zinc-200 bg-white p-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20"
            >
              {/* Thumbnail */}
              <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Search className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
                {/* Duration badge */}
                <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 font-mono text-[10px] text-white">
                  {formatDuration(video.durationSeconds)}
                </span>
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="line-clamp-2 text-xs font-medium text-zinc-800 group-hover:text-indigo-700 dark:text-zinc-200 dark:group-hover:text-indigo-300">
                  {video.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {video.channelTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state after search */}
      {!isLoading && !error && results.length === 0 && query.trim().length >= 3 && (
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
          No results found. Try a different search term.
        </p>
      )}
    </div>
  );
}
