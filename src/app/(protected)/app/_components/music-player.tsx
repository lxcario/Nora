"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Stations ───────────────────────────────────────────────────────────────

const STATIONS = [
  { title: "Lofi Hip Hop", url: "https://play.streamafrica.net/lofiradio", icon: "🎵", color: "#e879a8" },
  { title: "ChillHop Radio", url: "https://streams.fluxfm.de/Chillhop/mp3-320/audio/", icon: "☕", color: "#8b5cf6" },
  { title: "Jazz Cafe", url: "https://streaming.radio.co/s774887f7b/listen", icon: "🎷", color: "#f59e0b" },
  { title: "Ambient Space", url: "https://ice6.somafm.com/dronezone-128-mp3", icon: "🌌", color: "#06b6d4" },
  { title: "Deep Focus", url: "https://ice4.somafm.com/deepspaceone-128-mp3", icon: "🧠", color: "#10b981" },
  { title: "Rain & Piano", url: "https://ice2.somafm.com/fluid-128-mp3", icon: "🌧️", color: "#6366f1" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function MusicPlayer() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const station = STATIONS[currentTrack];

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    return () => { audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const play = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = STATIONS[idx].url;
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { play(currentTrack); }
  }

  function changeTrack(dir: 1 | -1) {
    const next = (currentTrack + dir + STATIONS.length) % STATIONS.length;
    setCurrentTrack(next);
    if (isPlaying) play(next);
  }

  function selectTrack(idx: number) {
    setCurrentTrack(idx);
    play(idx);
  }

  // The panel uses a fixed height via grid-template-rows transition so expanding
  // doesn't shift the sidebar layout (it overlays upward as an absolute popup).
  return (
    <div className="relative border-t-2" style={{ borderColor: "var(--pixel-border)" }}>
      {/* ─── Expanded panel (absolute, grows UPWARD from the bar) ─── */}
      <div
        className="absolute bottom-full left-0 right-0 overflow-hidden pointer-events-none"
        style={{
          transition: "max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease",
          maxHeight: expanded ? "400px" : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div
          className="pointer-events-auto mx-2 mb-1"
          style={{
            backgroundColor: "var(--pixel-bg-surface)",
            border: "2px solid var(--pixel-border)",
            borderBottom: "none",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Now Playing */}
          <div
            className="px-3 py-2.5 flex items-center gap-2.5"
            style={{
              borderBottom: "2px solid var(--pixel-border)",
              background: `linear-gradient(135deg, color-mix(in srgb, ${station.color} 18%, var(--pixel-bg-surface)) 0%, var(--pixel-bg-surface) 100%)`,
            }}
          >
            <span className="text-base leading-none">{station.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-[11px] truncate" style={{ color: station.color }}>
                {station.title}
              </p>
              <p className="text-[8px] uppercase tracking-wider" style={{ color: "var(--pixel-text-muted)" }}>
                {isPlaying ? "now playing" : "paused"}
              </p>
            </div>
            <MiniEq playing={isPlaying} color={station.color} bars={5} />
          </div>

          {/* Transport */}
          <div className="flex items-center justify-center gap-5 py-3">
            <TransportBtn onClick={() => changeTrack(-1)} label="Previous">◂◂</TransportBtn>
            <button
              onClick={togglePlay}
              className="w-9 h-9 flex items-center justify-center transition-all duration-150 active:scale-90"
              style={{
                backgroundColor: station.color,
                border: "2px solid var(--pixel-border)",
                boxShadow: isPlaying ? `0 0 10px ${station.color}50` : "none",
              }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <span className="flex gap-[3px]">
                  <span className="w-[3px] h-3 bg-white" />
                  <span className="w-[3px] h-3 bg-white" />
                </span>
              ) : (
                <span className="w-0 h-0 ml-0.5" style={{ borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "8px solid white" }} />
              )}
            </button>
            <TransportBtn onClick={() => changeTrack(1)} label="Next">▸▸</TransportBtn>
          </div>

          {/* Volume */}
          <div className="px-3 pb-2.5 flex items-center gap-2">
            <button onClick={() => setMuted(!muted)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity" title={muted ? "Unmute" : "Mute"}>
              <img src={`/sprites/travel-book/icons/${muted ? "SpeakerMute" : "SpeakerOn"}.png`} alt="" width={12} height={12} className="pixel-art" />
            </button>
            <VolumeSlider value={muted ? 0 : volume} onChange={setVolume} color={station.color} />
            <span className="font-pixel text-[8px] w-5 text-right tabular-nums" style={{ color: "var(--pixel-text-muted)" }}>
              {muted ? 0 : Math.round(volume * 100)}
            </span>
          </div>

          {/* Station list */}
          <div className="max-h-[120px] overflow-y-auto scrollbar-hide" style={{ borderTop: "1px solid var(--pixel-border)" }}>
            {STATIONS.map((s, i) => {
              const active = i === currentTrack;
              return (
                <button
                  key={i}
                  onClick={() => selectTrack(i)}
                  className="w-full flex items-center gap-2 px-3 py-[7px] text-left transition-colors duration-150"
                  style={{
                    backgroundColor: active ? `color-mix(in srgb, ${s.color} 12%, var(--pixel-bg-surface))` : undefined,
                    borderLeft: active ? `3px solid ${s.color}` : "3px solid transparent",
                  }}
                >
                  <span className="text-xs leading-none">{s.icon}</span>
                  <span
                    className="font-pixel text-[10px] flex-1 truncate"
                    style={{ color: active ? s.color : "var(--pixel-text-secondary)" }}
                  >
                    {s.title}
                  </span>
                  {active && isPlaying && <MiniEq playing color={s.color} bars={3} size="sm" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Collapsed bar (always visible, fixed height) ─── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 transition-colors duration-150 group"
        style={{ color: "var(--pixel-text-secondary)", height: "36px" }}
      >
        <img src="/sprites/travel-book/icons/MusicNotes.png" alt="" width={13} height={13} className="pixel-art" />
        <span className="flex-1 truncate text-left font-pixel text-[10px] group-hover:text-[var(--pixel-text-primary)] transition-colors duration-150">
          {isPlaying ? `♪ ${station.title}` : "STUDY MUSIC"}
        </span>
        <MiniEq playing={isPlaying} color={station.color} bars={4} />
      </button>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TransportBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="font-pixel text-xs transition-all duration-100 active:scale-90 hover:text-[var(--pixel-text-primary)]"
      style={{ color: "var(--pixel-text-secondary)" }}
    >
      {children}
    </button>
  );
}

function MiniEq({ playing, color, bars = 3, size = "md" }: { playing: boolean; color: string; bars?: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "10px" : "14px";
  const w = size === "sm" ? "2px" : "3px";
  const gap = size === "sm" ? "1px" : "2px";
  return (
    <span className="flex items-end" style={{ height: h, gap }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={playing ? `animate-eq-bar-${(i % 3) + 1}` : ""}
          style={{
            width: w,
            height: playing ? undefined : "2px",
            backgroundColor: color,
            opacity: playing ? 0.9 : 0.25,
            borderRadius: "1px",
            transition: "opacity 300ms ease, height 300ms ease",
          }}
        />
      ))}
    </span>
  );
}

function VolumeSlider({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex-1 relative h-4 flex items-center group cursor-pointer">
      {/* Track background */}
      <div className="absolute inset-x-0 h-[3px] top-1/2 -translate-y-1/2" style={{ backgroundColor: "var(--pixel-bg-primary)", border: "1px solid var(--pixel-border)" }} />
      {/* Fill */}
      <div
        className="absolute h-[3px] top-1/2 -translate-y-1/2 left-0 transition-[width] duration-100"
        style={{ width: `${value * 100}%`, backgroundColor: color }}
      />
      {/* Knob */}
      <div
        className="absolute w-2.5 h-2.5 top-1/2 -translate-y-1/2 transition-[left] duration-100 group-hover:scale-125"
        style={{ left: `calc(${value * 100}% - 5px)`, backgroundColor: color, border: "2px solid var(--pixel-border)" }}
      />
      {/* Invisible input */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
