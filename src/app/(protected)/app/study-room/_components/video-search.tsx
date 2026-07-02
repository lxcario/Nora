"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Search } from "lucide-react";
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pixel-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search educational videos…"
          maxLength={210}
          className="w-full"
          style={{
            paddingLeft: "36px",
            borderColor: validationError ? "var(--pixel-error)" : undefined,
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--pixel-accent)]" />
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-xs text-[var(--pixel-error)]">{validationError}</p>
      )}

      {/* API error */}
      {error && (
        <div className="rounded-lg border-2 border-[var(--pixel-error)] bg-[var(--pixel-bg-secondary)] px-3 py-2 text-xs text-[var(--pixel-error)]">
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
              className="pixel-panel pixel-hover-brighten group flex gap-3 p-2 text-left transition-colors"
            >
              {/* Thumbnail */}
              <div
                className="relative h-16 w-28 flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: "var(--pixel-bg-primary)", border: "2px solid var(--pixel-border)" }}
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <img src="/sprites/travel-book/icons/Monitor.png" alt="" width={20} height={20} className="pixel-art opacity-50" />
                  </div>
                )}
                {/* Duration badge */}
                <span
                  className="absolute bottom-1 right-1 font-pixel text-[9px] px-1 py-0.5"
                  style={{ backgroundColor: "var(--pixel-bg-elevated)", color: "var(--pixel-text-secondary)" }}
                >
                  {formatDuration(video.durationSeconds)}
                </span>
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="line-clamp-2 text-xs font-medium" style={{ color: "var(--pixel-text-primary)" }}>
                  {video.title}
                </p>
                <p className="mt-0.5 truncate font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
                  {video.channelTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state after search */}
      {!isLoading && !error && results.length === 0 && query.trim().length >= 3 && (
        <p className="text-center font-pixel text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
          No results found. Try a different search term.
        </p>
      )}
    </div>
  );
}
