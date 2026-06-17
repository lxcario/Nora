"use client";

import { useState, useTransition } from "react";
import { Layers, Check, Loader2 } from "lucide-react";
import { createCardsFromResearch } from "../../_actions/research";
import { SuccessCheck } from "../../_components/success-check";
import { DialogFrame } from "@/components/pixel-ui";

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
    <DialogFrame title={`Suggested Study Cards (${suggestedCards.length})`}>
      <SuccessCheck message="Cards saved from your papers!" visible={showSuccess} />
      <div className="mb-3 flex items-center justify-end">
        {topicId && !allSaved && (
          <button
            onClick={handleSaveAll}
            disabled={isPending}
            className="inline-flex items-center gap-2 !bg-[var(--pixel-success)] !text-white hover:!brightness-110 text-sm"
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
          <span className="inline-flex items-center gap-1 text-sm text-[var(--pixel-success)]">
            <Check className="h-4 w-4" />
            All cards saved!
          </span>
        )}
      </div>

      {!topicId && (
        <p className="mb-3 text-xs text-[var(--pixel-warning)]">
          Pick a topic in &ldquo;Save cards to&rdquo; above to save these cards.
        </p>
      )}

      {error && <p className="mb-3 text-sm text-[var(--pixel-error)]">{error}</p>}

      <div className="space-y-2">
        {suggestedCards.map((card, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 rounded-md p-3"
            style={{ backgroundColor: "var(--pixel-bg-secondary)" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                Q: {card.front}
              </p>
              <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
                A: {card.back}
              </p>
            </div>
            {topicId && !savedCards.has(i) && (
              <button
                onClick={() => handleSaveOne(i)}
                disabled={isPending}
                className="flex-shrink-0 !bg-transparent !border-none text-xs !px-2 !py-1 text-[var(--pixel-success)] hover:!bg-[var(--pixel-bg-elevated)]"
              >
                Save
              </button>
            )}
            {savedCards.has(i) && (
              <Check className="h-4 w-4 flex-shrink-0 text-[var(--pixel-success)]" />
            )}
          </div>
        ))}
      </div>
    </DialogFrame>
  );
}
