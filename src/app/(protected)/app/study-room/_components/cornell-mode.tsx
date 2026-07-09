"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { callLLMAction } from "@/app/(protected)/app/_actions/cornell-notes";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Cornell Notes Mode — structured note-taking with AI cue questions
// ---------------------------------------------------------------------------
// The Cornell method: three zones (notes, cue questions, summary).
// AI generates questions from your notes to prompt recall during review.
// Cue questions can be converted to flashcards with one click.
// ---------------------------------------------------------------------------

interface CueQuestion {
  id: string;
  text: string;
  convertedToCard: boolean;
}

interface CornellModeProps {
  videoTitle: string;
  onCreateCard: (front: string, back: string) => void;
}

export function CornellMode({ videoTitle, onCreateCard }: CornellModeProps) {
  const [notes, setNotes] = useState("");
  const [cueQuestions, setCueQuestions] = useState<CueQuestion[]>([]);
  const [summary, setSummary] = useState("");
  const [isGenerating, startGeneration] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeneratedFor = useRef("");

  // Auto-generate cue questions after 5 seconds of inactivity (100+ chars)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (notes.length < 100) return;
    if (notes === lastGeneratedFor.current) return;

    debounceRef.current = setTimeout(() => {
      handleGenerateCues();
    }, 5000);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  function handleGenerateCues() {
    if (notes.length < 50) return;
    lastGeneratedFor.current = notes;
    setError(null);
    startGeneration(async () => {
      const result = await callLLMAction(notes, videoTitle);
      if (result.error) {
        setError(result.error);
      } else if (result.questions) {
        setCueQuestions((prev) => {
          // Merge: keep existing questions, add new unique ones
          const existingTexts = new Set(prev.map((q) => q.text.toLowerCase()));
          const newQs: CueQuestion[] = result.questions!
            .filter((q) => !existingTexts.has(q.toLowerCase()))
            .map((q) => ({ id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: q, convertedToCard: false }));
          return [...prev, ...newQs];
        });
      }
    });
  }

  function handleConvertToCard(cue: CueQuestion) {
    // Front = the cue question, Back = relevant note content (first 500 chars)
    onCreateCard(cue.text, notes.slice(0, 500));
    setCueQuestions((prev) =>
      prev.map((q) => q.id === cue.id ? { ...q, convertedToCard: true } : q)
    );
  }

  function handleRemoveCue(id: string) {
    setCueQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div className="space-y-0">
      {/* Cornell layout: three-zone grid */}
      <div
        className="grid gap-0 overflow-hidden"
        style={{
          gridTemplateColumns: "minmax(0, 30%) minmax(0, 70%)",
          gridTemplateRows: "1fr auto",
          border: "2px solid var(--pixel-border)",
          minHeight: 400,
        }}
      >
        {/* Left: Cue Questions */}
        <div
          className="p-3 overflow-y-auto"
          style={{
            borderRight: "2px solid var(--pixel-border)",
            backgroundColor: "color-mix(in srgb, var(--pixel-accent) 5%, var(--pixel-bg-surface))",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[9px] uppercase tracking-wider" style={{ color: "var(--pixel-accent)" }}>
              Cue Questions
            </span>
            {isGenerating && (
              <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
                generating...
              </span>
            )}
          </div>

          {cueQuestions.length === 0 && (
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--pixel-text-muted)" }}>
              Write 100+ characters of notes on the right and AI will generate review questions here.
            </p>
          )}

          <div className="space-y-2">
            {cueQuestions.map((cue) => (
              <div
                key={cue.id}
                className="group px-2 py-1.5 text-xs"
                style={{
                  backgroundColor: cue.convertedToCard ? "color-mix(in srgb, var(--pixel-success) 10%, transparent)" : "var(--pixel-bg-primary)",
                  border: `1px solid ${cue.convertedToCard ? "var(--pixel-success)" : "var(--pixel-border)"}`,
                  color: "var(--pixel-text-primary)",
                }}
              >
                <p className="leading-snug">{cue.text}</p>
                <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!cue.convertedToCard ? (
                    <button
                      onClick={() => handleConvertToCard(cue)}
                      className="font-pixel text-[10px]"
                      style={{ color: "var(--pixel-accent)" }}
                    >
                      → Card
                    </button>
                  ) : (
                    <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-success)" }}>✓ Saved</span>
                  )}
                  <button
                    onClick={() => handleRemoveCue(cue.id)}
                    className="font-pixel text-[10px]"
                    style={{ color: "var(--pixel-text-muted)" }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {notes.length >= 50 && (
            <button
              onClick={handleGenerateCues}
              disabled={isGenerating}
              className="mt-3 font-pixel text-[9px] w-full px-2 py-1"
              style={{ color: "var(--pixel-accent)", border: "1px dashed var(--pixel-accent)" }}
            >
              {isGenerating ? "Generating..." : "↻ Generate questions"}
            </button>
          )}

          {error && (
            <p className="mt-2 text-[9px]" style={{ color: "var(--pixel-error)" }}>{error}</p>
          )}
        </div>

        {/* Right: Main Notes */}
        <div className="p-3" style={{ backgroundColor: "var(--pixel-bg-surface)" }}>
          <span className="font-pixel text-[9px] uppercase tracking-wider block mb-2" style={{ color: "var(--pixel-text-secondary)" }}>
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes here as you learn. Type naturally — the AI will generate review questions from your content after a short pause."
            className="w-full h-[280px] resize-y text-sm leading-relaxed bg-transparent"
            style={{ color: "var(--pixel-text-primary)" }}
          />
        </div>

        {/* Bottom: Summary (spans both columns) */}
        <div
          className="col-span-2 p-3"
          style={{
            borderTop: "2px solid var(--pixel-border)",
            backgroundColor: "color-mix(in srgb, var(--pixel-success) 3%, var(--pixel-bg-surface))",
          }}
        >
          <span className="font-pixel text-[9px] uppercase tracking-wider block mb-1" style={{ color: "var(--pixel-success)" }}>
            Summary (write yourself — this cements understanding)
          </span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="After your session, summarize the key ideas in 2-3 sentences. The AI won't write this for you — that's the point."
            rows={3}
            className="w-full resize-y text-sm bg-transparent"
            style={{ color: "var(--pixel-text-primary)" }}
          />
        </div>
      </div>

      {/* Character count */}
      <div className="flex items-center justify-between px-1 pt-2">
        <span className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
          {notes.length} chars · {cueQuestions.length} questions · {cueQuestions.filter(q => q.convertedToCard).length} cards created
        </span>
      </div>
    </div>
  );
}
