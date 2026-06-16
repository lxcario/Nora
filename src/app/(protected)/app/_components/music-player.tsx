"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from "lucide-react";

// Free lo-fi / study music streams (royalty-free internet radio)
const TRACKS = [
  {
    title: "Lofi Hip Hop",
    url: "https://play.streamafrica.net/lofiradio",
    type: "stream",
  },
  {
    title: "ChillHop Radio",
    url: "https://streams.fluxfm.de/Chillhop/mp3-320/audio/",
    type: "stream",
  },
  {
    title: "Jazz Radio",
    url: "https://streaming.radio.co/s774887f7b/listen",
    type: "stream",
  },
  {
    title: "Ambient",
    url: "https://ice6.somafm.com/dronezone-128-mp3",
    type: "stream",
  },
  {
    title: "Deep Focus",
    url: "https://ice4.somafm.com/deepspaceone-128-mp3",
    type: "stream",
  },
];

export function MusicPlayer() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.src = TRACKS[currentTrack].url;
      audio.play().catch(() => {
        // Autoplay blocked — user needs to interact first
      });
      setIsPlaying(true);
    }
  }

  function nextTrack() {
    const next = (currentTrack + 1) % TRACKS.length;
    setCurrentTrack(next);
    if (isPlaying && audioRef.current) {
      audioRef.current.src = TRACKS[next].url;
      audioRef.current.play().catch(() => {});
    }
  }

  function prevTrack() {
    const prev = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
    setCurrentTrack(prev);
    if (isPlaying && audioRef.current) {
      audioRef.current.src = TRACKS[prev].url;
      audioRef.current.play().catch(() => {});
    }
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800">
      {/* Collapsed: just the mini bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        <Music className="h-3 w-3" />
        <span className="flex-1 truncate text-left font-pixel">
          {isPlaying ? TRACKS[currentTrack].title : "Study Music"}
        </span>
        {isPlaying && (
          <span className="flex gap-0.5">
            <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="inline-block h-3 w-0.5 animate-pulse rounded-full bg-emerald-500" style={{ animationDelay: "0.15s" }} />
            <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-emerald-500" style={{ animationDelay: "0.3s" }} />
          </span>
        )}
      </button>

      {/* Expanded: full controls */}
      {expanded && (
        <div className="space-y-2 px-4 pb-3">
          {/* Track name */}
          <p className="font-pixel truncate text-center text-[10px] text-zinc-400">
            {TRACKS[currentTrack].title}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={prevTrack}
              className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 ml-0.5" />
              )}
            </button>
            <button
              onClick={nextTrack}
              className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {isMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-300 dark:bg-zinc-700"
            />
          </div>

          {/* Track list */}
          <div className="max-h-24 space-y-0.5 overflow-y-auto">
            {TRACKS.map((track, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentTrack(i);
                  if (isPlaying && audioRef.current) {
                    audioRef.current.src = track.url;
                    audioRef.current.play().catch(() => {});
                  }
                }}
                className={`w-full rounded px-2 py-1 text-left text-[10px] ${
                  i === currentTrack
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {track.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
