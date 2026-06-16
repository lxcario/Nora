"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

// Declare window.YT as any for the YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface PlayerController {
  seekTo: (seconds: number) => void;
  pause: () => void;
  play: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (controller: PlayerController) => void;
  onTimeUpdate?: (seconds: number) => void;
  onStateChange?: (state: "playing" | "paused" | "ended") => void;
}

/** Loads the YouTube IFrame API script (idempotent). */
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // Script already injected but not yet ready
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existingScript) {
      // Wait for the existing script to fire onYouTubeIframeAPIReady
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      return;
    }

    // Inject the script
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Failed to load YouTube IFrame API script"));
    };

    document.head.appendChild(script);
  });
}

export function YouTubePlayer({
  videoId,
  onReady,
  onTimeUpdate,
  onStateChange,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep callbacks in refs to avoid stale closures
  const onReadyRef = useRef(onReady);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const startTimeTracking = useCallback(() => {
    stopTimeTracking();
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const time = playerRef.current.getCurrentTime();
        onTimeUpdateRef.current?.(time);
      }
    }, 500);
  }, []);

  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      // Set a 10-second timeout for API loading
      timeoutId = setTimeout(() => {
        if (mounted && loading) {
          setError(
            "The video player could not be initialized. Please refresh the page."
          );
          setLoading(false);
        }
      }, 10_000);

      try {
        await loadYouTubeAPI();

        if (!mounted || !containerRef.current) return;

        // Clear the timeout since API loaded successfully
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        // Create a unique div for the player inside the container
        const playerDiv = document.createElement("div");
        playerDiv.id = `yt-player-${videoId}-${Date.now()}`;
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(playerDiv);

        playerRef.current = new window.YT.Player(playerDiv.id, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!mounted) return;
              setLoading(false);

              const controller: PlayerController = {
                seekTo: (seconds: number) => {
                  playerRef.current?.seekTo(seconds, true);
                },
                pause: () => {
                  playerRef.current?.pauseVideo();
                },
                play: () => {
                  playerRef.current?.playVideo();
                },
                getCurrentTime: () => {
                  return playerRef.current?.getCurrentTime() ?? 0;
                },
                getDuration: () => {
                  return playerRef.current?.getDuration() ?? 0;
                },
              };

              onReadyRef.current?.(controller);
            },
            onStateChange: (event: any) => {
              if (!mounted) return;

              const state = event.data;

              // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
              if (state === 1) {
                onStateChangeRef.current?.("playing");
                startTimeTracking();
              } else if (state === 2) {
                onStateChangeRef.current?.("paused");
                stopTimeTracking();
              } else if (state === 0) {
                onStateChangeRef.current?.("ended");
                stopTimeTracking();
              }
            },
            onError: () => {
              if (!mounted) return;
              setError("An error occurred while loading the video.");
              setLoading(false);
            },
          },
        });
      } catch (err) {
        if (!mounted) return;
        setError(
          "The video player could not be initialized. Please refresh the page."
        );
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      stopTimeTracking();
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, startTimeTracking, stopTimeTracking]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-400">Loading player...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
