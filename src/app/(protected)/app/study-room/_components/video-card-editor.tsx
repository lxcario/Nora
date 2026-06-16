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
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <Layers className="h-4 w-4 text-sky-500" />
          Suggested Flashcards
          <span className="text-xs font-normal text-zinc-500">
            {selectedCount} of {editableCards.length} selected
          </span>
        </h3>
        {!saved ? (
          <button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Selected ({selectedCount})
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" />
            Cards saved!
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <div className="space-y-2">
        {editableCards.map((card, i) => (
          <div
            key={i}
            className={`rounded-md border p-3 transition-colors ${
              card.selected
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
                : "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-700 dark:bg-zinc-800"
            }`}
          >
            {card.editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-zinc-500">
                    Front (question) — {card.front.length}/200
                  </label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => updateCard(i, "front", e.target.value)}
                    className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">
                    Back (answer) — {card.back.length}/1000
                  </label>
                  <textarea
                    value={card.back}
                    onChange={(e) => updateCard(i, "back", e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    maxLength={1000}
                  />
                </div>
                <button
                  onClick={() => toggleEdit(i)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Done editing
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Q: {card.front}
                    </p>
                    <button
                      onClick={() => onSeekTo?.(card.offsetSeconds)}
                      className="inline-flex items-center bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer hover:bg-indigo-200 transition-colors dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                    >
                      {formatTime(card.offsetSeconds)}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    A: {card.back}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleEdit(i)}
                    title="Edit card"
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSelect(i)}
                    title={card.selected ? "Reject card" : "Accept card"}
                    className={`rounded p-1 ${
                      card.selected
                        ? "text-emerald-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        : "text-zinc-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/20"
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
