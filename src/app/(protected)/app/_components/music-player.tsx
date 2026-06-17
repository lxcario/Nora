"use client";

import { useState, useRef, useEffect } from "react";

// Free lo-fi / study music streams (royalty-free internet radio)
const TRACKS = [
  { title: "Lofi Hip Hop", url: "https://play.streamafrica.net/lofiradio" },
  { title: "ChillHop Radio", url: "https://streams.fluxfm.de/Chillhop/mp3-320/audio/" },
  { title: "Jazz Cafe", url: "https://streaming.radio.co/s774887f7b/listen" },
  { title: "Ambient", url: "https://ice6.somafm.com/dronezone-128-mp3" },
  { title: "Deep Focus", url: "https://ice4.somafm.com/deepspaceone-128-mp3" },
];

function Sprite({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <img
      src={`/sprites/travel-book/icons/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={`pixel-art ${className ?? ""}`}
      draggable={false}
    />
  );
}

export function MusicPlayer() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  function play(trackIdx: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = TRACKS[trackIdx].url;
    audio.play().catch(() => {});
    setIsPlaying(true);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      play(currentTrack);
    }
  }

  function changeTrack(dir: 1 | -1) {
    const next = (currentTrack + dir + TRACKS.length) % TRACKS.length;
    setCurrentTrack(next);
    if (isPlaying) play(next);
  }

  return (
    <div className="border-t-2 border-[var(--pixel-border)]">
      {/* Collapsed mini bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-text-primary)]"
      >
        <Sprite name="MusicNotes" size={14} />
        <span className="flex-1 truncate text-left font-pixel">
          {isPlaying ? TRACKS[currentTrack].title : "Study Music"}
        </span>
        {isPlaying && (
          <span className="flex items-end gap-0.5" aria-hidden>
            <span className="inline-block h-2 w-1 bg-[var(--pixel-success)] animate-pixel-float" />
            <span className="inline-block h-3 w-1 bg-[var(--pixel-success)] animate-pixel-float" style={{ animationDelay: "0.2s" }} />
            <span className="inline-block h-1.5 w-1 bg-[var(--pixel-success)] animate-pixel-float" style={{ animationDelay: "0.4s" }} />
          </span>
        )}
      </button>

      {/* Expanded controls */}
      {expanded && (
        <div className="px-2 pb-2">
          <div className="pixel-panel pixel-panel-inset">
            <p className="font-pixel mb-2 truncate text-center text-[10px] text-[var(--pixel-accent)]">
              {TRACKS[currentTrack].title}
            </p>

            {/* Transport */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => changeTrack(-1)}
                title="Previous"
                className="font-pixel text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-text-primary)]"
              >
                ‹‹
              </button>
              <button
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
                className="flex h-8 w-8 items-center justify-center"
              >
                {isPlaying ? (
                  // pixel pause (two bars)
                  <span className="flex gap-1">
                    <span className="h-3.5 w-1.5 bg-[var(--pixel-accent)]" />
                    <span className="h-3.5 w-1.5 bg-[var(--pixel-accent)]" />
                  </span>
                ) : (
                  <Sprite name="Play" size={20} />
                )}
              </button>
              <button
                onClick={() => changeTrack(1)}
                title="Next"
                className="font-pixel text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-text-primary)]"
              >
                ››
              </button>
            </div>

            {/* Volume */}
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setMuted(!muted)} title={muted ? "Unmute" : "Mute"}>
                <Sprite name={muted ? "SpeakerMute" : "SpeakerOn"} size={14} />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 flex-1"
              />
            </div>

            {/* Track list */}
            <div className="mt-2 max-h-24 space-y-0.5 overflow-y-auto scrollbar-hide">
              {TRACKS.map((track, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentTrack(i);
                    play(i);
                  }}
                  className={`font-pixel w-full px-2 py-1 text-left text-[10px] ${
                    i === currentTrack
                      ? "bg-[color-mix(in_srgb,var(--pixel-accent)_18%,transparent)] text-[var(--pixel-accent)]"
                      : "text-[var(--pixel-text-secondary)] hover:bg-[var(--pixel-bg-elevated)]"
                  }`}
                >
                  {track.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
