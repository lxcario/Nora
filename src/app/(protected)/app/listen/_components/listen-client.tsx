"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { generatePodcastScript, type PodcastScript, type PodcastSegment } from "@/app/(protected)/app/_actions/listen-mode";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

interface TopicOption { id: string; name: string; subjectName: string; }

export function ListenClient({ topics }: { topics: TopicOption[] }) {
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id ?? "");
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGeneration] = useTransition();
  const [playingIdx, setPlayingIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  function handleGenerate() {
    setError(null); setScript(null); setPlayingIdx(-1);
    startGeneration(async () => {
      const res = await generatePodcastScript(selectedTopic);
      if (res.error) setError(res.error);
      else if (res.data) setScript(res.data);
    });
  }

  const speak = useCallback((text: string, speaker: "host" | "student", idx: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = speaker === "host" ? 1.0 : 1.2;
    // Try to pick different voices
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 1) {
      utt.voice = speaker === "host" ? voices[0] : voices[Math.min(1, voices.length - 1)];
    }
    utt.onstart = () => { setPlayingIdx(idx); setIsPlaying(true); };
    utt.onend = () => { setIsPlaying(false); setPlayingIdx(-1); };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, []);

  const playAll = useCallback(() => {
    if (!script) return;
    let i = 0;
    function playNext() {
      if (!script || i >= script.segments.length) { setIsPlaying(false); setPlayingIdx(-1); return; }
      const seg = script.segments[i];
      const utt = new SpeechSynthesisUtterance(seg.text);
      utt.rate = 0.95;
      utt.pitch = seg.speaker === "host" ? 1.0 : 1.2;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 1) utt.voice = seg.speaker === "host" ? voices[0] : voices[Math.min(1, voices.length - 1)];
      utt.onstart = () => { setPlayingIdx(i); setIsPlaying(true); };
      utt.onend = () => { i++; playNext(); };
      window.speechSynthesis.speak(utt);
    }
    window.speechSynthesis.cancel();
    playNext();
  }, [script]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false); setPlayingIdx(-1);
  }, []);

  if (topics.length === 0) {
    return (
      <DialogFrame>
        <p className="text-center text-sm py-6" style={{ color: "var(--pixel-text-secondary)" }}>
          Create topics and write Feynman explanations or flashcards first.
        </p>
      </DialogFrame>
    );
  }

  return (
    <div className="space-y-5">
      {/* Topic selector */}
      {!script && (
        <DialogFrame title="Generate a podcast episode">
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="flex-1">
              {topics.map((t) => <option key={t.id} value={t.id}>{t.subjectName} → {t.name}</option>)}
            </select>
            <PixelButton variant="primary" onClick={handleGenerate} loading={isGenerating} disabled={isGenerating}>
              {isGenerating ? "Writing script..." : "Generate"}
            </PixelButton>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--pixel-text-muted)" }}>
            Uses your Feynman explanations and flashcards as source material.
          </p>
        </DialogFrame>
      )}

      {error && <p className="text-sm text-center" style={{ color: "var(--pixel-error)" }}>{error}</p>}

      {/* Script player */}
      {script && (
        <>
          <DialogFrame title={script.title}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                ~{script.estimatedMinutes} min · {script.segments.length} segments
              </span>
              <div className="flex gap-2">
                {!isPlaying ? (
                  <PixelButton variant="primary" size="small" onClick={playAll}>▶ Play all</PixelButton>
                ) : (
                  <PixelButton variant="secondary" size="small" onClick={stop}>⏹ Stop</PixelButton>
                )}
                <PixelButton variant="secondary" size="small" onClick={() => { setScript(null); setPlayingIdx(-1); stop(); }}>
                  New episode
                </PixelButton>
              </div>
            </div>

            {/* Transcript */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {script.segments.map((seg, i) => (
                <div
                  key={i}
                  className="flex gap-3 px-3 py-2 rounded cursor-pointer transition-all"
                  style={{
                    backgroundColor: playingIdx === i ? "color-mix(in srgb, var(--pixel-accent) 12%, var(--pixel-bg-surface))" : "var(--pixel-bg-secondary)",
                    borderLeft: playingIdx === i ? "3px solid var(--pixel-accent)" : "3px solid transparent",
                  }}
                  onClick={() => speak(seg.text, seg.speaker, i)}
                >
                  <span className="font-pixel text-[9px] shrink-0 mt-0.5" style={{ color: seg.speaker === "host" ? "var(--pixel-accent)" : "var(--pixel-success)" }}>
                    {seg.speaker === "host" ? "🎙" : "🙋"}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--pixel-text-primary)" }}>
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          </DialogFrame>
        </>
      )}
    </div>
  );
}
