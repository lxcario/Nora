"use client";

import { useState, useEffect } from "react";
import { Brain, Lightbulb, Layers, Check, Save, Edit2, X } from "lucide-react";
import { PixelSpinner } from "@/components/pixel-ui";

interface GeneratedNotesProps {
  data: {
    summary: string;
    keyConcepts: {
      concept: string;
      definition: string;
      timestampCitation: string;
      offsetSeconds: number;
    }[];
    flashcards: {
      front: string;
      back: string;
      offsetSeconds: number;
    }[];
  } | null;
  isLoading: boolean;
  onSeekTo: (seconds: number) => void;
  onSaveCards?: (cards: { front: string; back: string; offsetSeconds: number }[]) => void;
}

export function GeneratedNotes({ data, isLoading, onSeekTo, onSaveCards }: GeneratedNotesProps) {
  if (isLoading) {
    return <NoteGenerationSteps />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--pixel-text-primary)]">
          <Brain className="h-4 w-4 text-[var(--pixel-accent)]" />
          Summary
        </h3>
        <p className="text-sm leading-relaxed text-[var(--pixel-text-secondary)]">
          {data.summary}
        </p>
      </div>

      {/* Key Concepts Section */}
      {data.keyConcepts.length > 0 && (
        <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--pixel-text-primary)]">
            <Lightbulb className="h-4 w-4 text-[var(--pixel-warning)]" />
            Key Concepts
          </h3>
          <ul className="space-y-3">
            {data.keyConcepts.map((concept, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--pixel-text-primary)]">
                      {concept.concept}
                    </span>
                    <button
                      onClick={() => onSeekTo(concept.offsetSeconds)}
                      className="inline-flex items-center bg-[color-mix(in_srgb,var(--pixel-accent)_16%,var(--pixel-bg-surface))] text-[var(--pixel-accent)] px-1.5 py-0.5 text-xs font-mono cursor-pointer transition-[filter] pixel-hover-brighten"
                    >
                      {concept.timestampCitation}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
                    {concept.definition}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Flashcards Section */}
      {data.flashcards.length > 0 && (
        <FlashcardsSection
          flashcards={data.flashcards}
          onSeekTo={onSeekTo}
          onSaveCards={onSaveCards}
        />
      )}
    </div>
  );
}

// ─── Multi-Step Progress Animation ──────────────────────────────────────

function NoteGenerationSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 4000),
      setTimeout(() => setStep(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    "Slicing transcript by time range...",
    "Generating structured notes...",
    "Formatting results...",
    "Almost done...",
  ];

  return (
    <div className="border-2 border-[var(--pixel-accent)] bg-[color-mix(in_srgb,var(--pixel-accent)_10%,var(--pixel-bg-surface))] p-4">
      <div className="flex items-center gap-3">
        <PixelSpinner size={5} className="text-[var(--pixel-accent)]" />
        <div>
          <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
            Generating AI notes...
          </p>
          <p className="text-xs text-[var(--pixel-text-secondary)]">
            Analyzing the selected video segment.
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {steps.map((label, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
              i <= step ? "opacity-100" : "opacity-30"
            }`}
          >
            {i < step ? (
              <Check className="h-3 w-3 text-[var(--pixel-accent)]" />
            ) : i === step ? (
              <PixelSpinner size={4} className="text-[var(--pixel-accent)]" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-[var(--pixel-border-light)]" />
            )}
            <span
              className={
                i <= step
                  ? "text-[var(--pixel-text-secondary)]"
                  : "text-[var(--pixel-text-muted)]"
              }
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Flashcards Section with Edit/Select/Save ────────────────────────────

interface EditableFlashcard {
  front: string;
  back: string;
  offsetSeconds: number;
  selected: boolean;
  editing: boolean;
}

function FlashcardsSection({
  flashcards,
  onSeekTo,
  onSaveCards,
}: {
  flashcards: { front: string; back: string; offsetSeconds: number }[];
  onSeekTo: (seconds: number) => void;
  onSaveCards?: (cards: { front: string; back: string; offsetSeconds: number }[]) => void;
}) {
  const [editableCards, setEditableCards] = useState<EditableFlashcard[]>(
    flashcards.map((c) => ({ ...c, selected: true, editing: false }))
  );
  const [saved, setSaved] = useState(false);

  const selectedCount = editableCards.filter((c) => c.selected).length;

  function toggleSelect(index: number) {
    setEditableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  function toggleEdit(index: number) {
    setEditableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, editing: !c.editing } : c))
    );
  }

  function updateCard(index: number, field: "front" | "back", value: string) {
    setEditableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleSave() {
    if (!onSaveCards) return;
    const toSave = editableCards
      .filter((c) => c.selected && c.front.trim() && c.back.trim())
      .map((c) => ({ front: c.front.trim(), back: c.back.trim(), offsetSeconds: c.offsetSeconds }));
    if (toSave.length === 0) return;
    onSaveCards(toSave);
    setSaved(true);
  }

  return (
    <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--pixel-text-primary)]">
          <Layers className="h-4 w-4 text-[var(--pixel-accent)]" />
          Suggested Flashcards
          <span className="text-xs font-normal text-[var(--pixel-text-secondary)]">
            {selectedCount} of {editableCards.length} selected
          </span>
        </h3>
        {onSaveCards && !saved ? (
          <button
            onClick={handleSave}
            disabled={selectedCount === 0}
            className="pixel-btn pixel-btn-success pixel-btn-sm"
          >
            <Save className="h-3 w-3" />
            Save Selected ({selectedCount})
          </button>
        ) : saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-[var(--pixel-success)]">
            <Check className="h-4 w-4" />
            Cards saved!
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {editableCards.map((card, i) => (
          <div
            key={i}
            className={`border-2 p-3 transition-colors ${
              card.selected
                ? "border-[var(--pixel-success)] bg-[color-mix(in_srgb,var(--pixel-success)_10%,transparent)]"
                : "border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] opacity-60"
            }`}
          >
            {card.editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-[var(--pixel-text-secondary)]">
                    Front (question) — {card.front.length}/200
                  </label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => updateCard(i, "front", e.target.value)}
                    className="mt-0.5 w-full border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-2 py-1 text-sm text-[var(--pixel-text-primary)]"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--pixel-text-secondary)]">
                    Back (answer) — {card.back.length}/1000
                  </label>
                  <textarea
                    value={card.back}
                    onChange={(e) => updateCard(i, "back", e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-2 py-1 text-sm text-[var(--pixel-text-primary)]"
                    maxLength={1000}
                  />
                </div>
                <button
                  onClick={() => toggleEdit(i)}
                  className="text-xs font-medium text-[var(--pixel-accent)]"
                >
                  Done editing
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                      Q: {card.front}
                    </p>
                    <button
                      onClick={() => onSeekTo(card.offsetSeconds)}
                      className="inline-flex items-center bg-[color-mix(in_srgb,var(--pixel-accent)_16%,var(--pixel-bg-surface))] text-[var(--pixel-accent)] px-1.5 py-0.5 text-xs font-mono cursor-pointer transition-[filter] pixel-hover-brighten"
                    >
                      {formatTime(card.offsetSeconds)}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
                    A: {card.back}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleEdit(i)}
                    title="Edit card"
                    className="p-1 text-[var(--pixel-text-muted)] hover:bg-[var(--pixel-bg-elevated)] hover:text-[var(--pixel-text-secondary)]"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSelect(i)}
                    title={card.selected ? "Reject card" : "Include card"}
                    className={`p-1 ${
                      card.selected
                        ? "text-[var(--pixel-success)] hover:text-[var(--pixel-error)]"
                        : "text-[var(--pixel-text-muted)] hover:text-[var(--pixel-success)]"
                    }`}
                  >
                    {card.selected ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
