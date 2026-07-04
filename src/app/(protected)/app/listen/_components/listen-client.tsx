"use client";

import { useState, useTransition } from "react";
import { generatePodcastScript, type PodcastScript } from "@/app/(protected)/app/_actions/listen-mode";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Listen Mode — Study Conversation (read-along format)
// ---------------------------------------------------------------------------
// Generates a two-voice conversational script from the student's content.
// Presented as a beautiful readable conversation — no TTS (Web Speech
// synthesis sounds robotic and doesn't match Nora's warmth).
// ---------------------------------------------------------------------------

interface TopicOption { id: string; name: string; subjectName: string; }

export function ListenClient({ topics }: { topics: TopicOption[] }) {
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id ?? "");
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGeneration] = useTransition();

  function handleGenerate() {
    setError(null); setScript(null);
    startGeneration(async () => {
      const res = await generatePodcastScript(selectedTopic);
      if (res.error) setError(res.error);
      else if (res.data) setScript(res.data);
    });
  }

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
        <DialogFrame title="Create a study conversation">
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="flex-1">
              {topics.map((t) => <option key={t.id} value={t.id}>{t.subjectName} → {t.name}</option>)}
            </select>
            <PixelButton variant="primary" onClick={handleGenerate} loading={isGenerating} disabled={isGenerating}>
              {isGenerating ? "Writing..." : "Generate"}
            </PixelButton>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--pixel-text-muted)" }}>
            Creates a two-voice conversation from your Feynman explanations and flashcards. Read it like a study dialogue.
          </p>
        </DialogFrame>
      )}

      {error && <p className="text-sm text-center" style={{ color: "var(--pixel-error)" }}>{error}</p>}

      {/* Conversation script */}
      {script && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-sm" style={{ color: "var(--pixel-text-primary)" }}>
              {script.title}
            </h2>
            <PixelButton variant="secondary" size="small" onClick={() => setScript(null)}>
              New conversation
            </PixelButton>
          </div>

          <p className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
            ~{script.estimatedMinutes} min read · {script.segments.length} exchanges
          </p>

          {/* The conversation */}
          <div className="space-y-3">
            {script.segments.map((seg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${seg.speaker === "host" ? "" : "flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: seg.speaker === "host"
                        ? "color-mix(in srgb, var(--pixel-accent) 20%, var(--pixel-bg-surface))"
                        : "color-mix(in srgb, var(--pixel-success) 20%, var(--pixel-bg-surface))",
                      border: `2px solid ${seg.speaker === "host" ? "var(--pixel-accent)" : "var(--pixel-success)"}`,
                    }}
                  >
                    {seg.speaker === "host" ? "🧙" : "🗡️"}
                  </div>
                </div>

                {/* Bubble */}
                <div
                  className="flex-1 min-w-0 px-4 py-3 text-sm leading-relaxed"
                  style={{
                    backgroundColor: seg.speaker === "host"
                      ? "var(--pixel-bg-surface)"
                      : "color-mix(in srgb, var(--pixel-success) 6%, var(--pixel-bg-surface))",
                    border: "2px solid var(--pixel-border)",
                    color: "var(--pixel-text-primary)",
                    maxWidth: "85%",
                  }}
                >
                  {seg.type === "question" && (
                    <span className="font-pixel text-[8px] block mb-1" style={{ color: "var(--pixel-accent)" }}>
                      PAUSE AND THINK
                    </span>
                  )}
                  {seg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center pt-4" style={{ borderTop: "1px dashed var(--pixel-border)" }}>
            <p className="text-[10px] italic" style={{ color: "var(--pixel-text-muted)" }}>
              Read this like a conversation with a friend. Pause at the questions and try to answer before reading on.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
