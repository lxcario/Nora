"use client";

import { useState, useTransition } from "react";
import { Layers, Check, Loader2 } from "lucide-react";
import { createCardsFromResearch } from "../../_actions/research";
import { SuccessCheck } from "../../_components/success-check";

interface SuggestedCard {
  front: string;
  back: string;
}

interface CardFromRagProps {
  suggestedCards: SuggestedCard[];
  topicId?: string;
}

export function CardFromRag({ suggestedCards, topicId }: CardFromRagProps) {
  const [savedCards, setSavedCards] = useState<Set<number>>(new Set());
  const [allSaved, setAllSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);

  if (!suggestedCards.length) return null;

  function handleSaveAll() {
    if (!topicId) return;
    setError(null);

    startTransition(async () => {
      const res = await createCardsFromResearch(topicId!, suggestedCards);
      if (res.success) {
        setAllSaved(true);
        setSavedCards(new Set(suggestedCards.map((_, i) => i)));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 100);
      }
      if (res.error) setError(res.error);
    });
  }

  function handleSaveOne(index: number) {
    if (!topicId) return;
    setError(null);

    startTransition(async () => {
      const card = suggestedCards[index];
      const res = await createCardsFromResearch(topicId!, [card]);
      if (res.success) {
        setSavedCards((prev) => new Set([...prev, index]));
      }
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <SuccessCheck message="Cards saved from your papers!" visible={showSuccess} />
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <Layers className="h-4 w-4 text-sky-500" />
          Suggested Study Cards ({suggestedCards.length})
        </h4>
        {topicId && !allSaved && (
          <button
            onClick={handleSaveAll}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Layers className="h-3 w-3" />
            )}
            Save All Cards
          </button>
        )}
        {allSaved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" />
            All cards saved!
          </span>
        )}
      </div>

      {!topicId && (
        <p className="mb-3 text-xs text-amber-500">
          Select a topic in web research mode to save cards.
        </p>
      )}

      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="space-y-2">
        {suggestedCards.map((card, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 rounded-md bg-zinc-50 p-3 dark:bg-zinc-800"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Q: {card.front}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                A: {card.back}
              </p>
            </div>
            {topicId && !savedCards.has(i) && (
              <button
                onClick={() => handleSaveOne(i)}
                disabled={isPending}
                className="flex-shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              >
                Save
              </button>
            )}
            {savedCards.has(i) && (
              <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
