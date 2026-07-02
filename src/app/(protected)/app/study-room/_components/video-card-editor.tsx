"use client";

import { useState } from "react";
import { Layers, Check, Edit2, X, Save, Loader2 } from "lucide-react";

interface VideoFlashcard {
  front: string;
  back: string;
  offsetSeconds: number;
}

interface VideoCardEditorProps {
  cards: VideoFlashcard[];
  onSave: (cards: VideoFlashcard[]) => Promise<{ success?: boolean; error?: string }>;
  onSeekTo?: (seconds: number) => void;
}

interface EditableCard {
  front: string;
  back: string;
  offsetSeconds: number;
  selected: boolean;
  editing: boolean;
}

export function VideoCardEditor({ cards, onSave, onSeekTo }: VideoCardEditorProps) {
  const [editableCards, setEditableCards] = useState<EditableCard[]>(
    cards.map((c) => ({ ...c, selected: true, editing: false }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const maxLen = field === "front" ? 200 : 1000;
    if (value.length > maxLen) return;
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

  async function handleSave() {
    const toSave = editableCards
      .filter((c) => c.selected && c.front.trim() && c.back.trim())
      .map((c) => ({
        front: c.front.trim(),
        back: c.back.trim(),
        offsetSeconds: c.offsetSeconds,
      }));

    if (toSave.length === 0) return;

    setSaving(true);
    setError(null);

    const result = await onSave(toSave);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  if (editableCards.length === 0) return null;

  return (
    <div className="pixel-panel" style={{ padding: "var(--pixel-panel-standard)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--pixel-text-primary)]">
          <Layers className="h-4 w-4 text-[var(--pixel-accent)]" />
          Suggested Flashcards
          <span className="text-xs font-normal text-[var(--pixel-text-muted)]">
            {selectedCount} of {editableCards.length} selected
          </span>
        </h3>
        {!saved ? (
          <button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="pixel-btn pixel-btn-primary inline-flex items-center gap-2 text-sm"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Selected ({selectedCount})
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-[var(--pixel-success)]">
            <Check className="h-4 w-4" />
            Cards saved!
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-[var(--pixel-error)]">{error}</p>}

      <div className="space-y-2">
        {editableCards.map((card, i) => (
          <div
            key={i}
            className={`rounded-md border p-3 transition-colors ${
              card.selected
                ? "border-[var(--pixel-border-light)] bg-[color-mix(in_srgb,var(--pixel-success)_10%,var(--pixel-bg-surface))]"
                : "border-[var(--pixel-border)] bg-[var(--pixel-bg-secondary)] opacity-60"
            }`}
          >
            {card.editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-[var(--pixel-text-muted)]">
                    Front (question) — {card.front.length}/200
                  </label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => updateCard(i, "front", e.target.value)}
                    className="mt-0.5 w-full rounded border border-[var(--pixel-border)] px-2 py-1 text-sm bg-[var(--pixel-bg-primary)] text-[var(--pixel-text-primary)]"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--pixel-text-muted)]">
                    Back (answer) — {card.back.length}/1000
                  </label>
                  <textarea
                    value={card.back}
                    onChange={(e) => updateCard(i, "back", e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full rounded border border-[var(--pixel-border)] px-2 py-1 text-sm bg-[var(--pixel-bg-primary)] text-[var(--pixel-text-primary)]"
                    maxLength={1000}
                  />
                </div>
                <button
                  onClick={() => toggleEdit(i)}
                  className="text-xs font-medium text-[var(--pixel-accent)] hover:brightness-110"
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
                      onClick={() => onSeekTo?.(card.offsetSeconds)}
                      className="inline-flex items-center bg-[color-mix(in_srgb,var(--pixel-accent)_15%,var(--pixel-bg-surface))] text-[var(--pixel-accent)] px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer hover:brightness-110 transition-colors"
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
                    className="rounded p-1 text-[var(--pixel-text-muted)] hover:bg-[var(--pixel-bg-elevated)] hover:text-[var(--pixel-text-primary)]"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSelect(i)}
                    title={card.selected ? "Reject card" : "Accept card"}
                    className={`rounded p-1 ${
                      card.selected
                        ? "text-[var(--pixel-success)] hover:bg-[color-mix(in_srgb,var(--pixel-error)_10%,var(--pixel-bg-surface))] hover:text-[var(--pixel-error)]"
                        : "text-[var(--pixel-text-muted)] hover:bg-[color-mix(in_srgb,var(--pixel-success)_10%,var(--pixel-bg-surface))] hover:text-[var(--pixel-success)]"
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
