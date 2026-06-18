"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview, deleteCard, type DueCard } from "@/app/(protected)/app/_actions/review";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { SuccessCheck } from "@/app/(protected)/app/_components/success-check";
import { playSessionComplete } from "@/lib/sfx";
import {
  DialogFrame,
  PixelButton,
  PixelProgressBar,
  PixelConfirmDialog,
} from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Grade button config — pixel theme colors
// ---------------------------------------------------------------------------

const GRADE_LABELS: {
  grade: number;
  label: string;
  color: string;
}[] = [
  { grade: 0, label: "Blackout", color: "var(--pixel-error)" },
  { grade: 1, label: "Wrong", color: "color-mix(in srgb, var(--pixel-error) 85%, var(--pixel-bg-primary))" },
  { grade: 2, label: "Hard", color: "var(--pixel-warning)" },
  { grade: 3, label: "OK", color: "var(--pixel-accent)" },
  { grade: 4, label: "Good", color: "color-mix(in srgb, var(--pixel-success) 85%, var(--pixel-bg-primary))" },
  { grade: 5, label: "Easy", color: "var(--pixel-success)" },
];

// ---------------------------------------------------------------------------
// ReviewSession
// ---------------------------------------------------------------------------

export function ReviewSession({ initialCards }: { initialCards: DueCard[] }) {
  const router = useRouter();
  const [cards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reward feedback
  const [xpToastData, setXpToastData] = useState({ xp: 0, coins: 0, visible: false });
  const [showComplete, setShowComplete] = useState(false);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  function handleReveal() {
    setRevealed(true);
  }

  function handleGrade(grade: number) {
    startTransition(async () => {
      await submitReview(currentCard.id, grade);
      setReviewedCount((c) => c + 1);
      setRevealed(false);

      // Show XP toast
      const xp = grade >= 3 ? 3 : 1;
      const coins = grade >= 3 ? 1 : 0;
      setXpToastData({ xp, coins, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 100);

      if (currentIndex + 1 >= totalCards) {
        setSessionComplete(true);
        setShowComplete(true);
        setTimeout(() => setShowComplete(false), 100);
        playSessionComplete();
      } else {
        setCurrentIndex((i) => i + 1);
      }
    });
  }

  function handleDeleteConfirm() {
    setConfirmDelete(false);
    startTransition(async () => {
      await deleteCard(currentCard.id);
      setReviewedCount((c) => c + 1);
      setRevealed(false);
      if (currentIndex + 1 >= totalCards) {
        setSessionComplete(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    });
  }

  // ─── Session Complete ───────────────────────────────────────────────────

  if (sessionComplete) {
    return (
      <DialogFrame>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <SuccessCheck message="Review session complete!" visible={showComplete} />
          <XpToast xp={10} coins={3} visible={showComplete} />

          <img
            src="/sprites/travel-book/icons/Trophy.png"
            alt=""
            width={48}
            height={48}
            className="pixel-art"
          />

          <h2 className="font-pixel text-lg" style={{ color: "var(--pixel-accent)" }}>
            Session Complete!
          </h2>
          <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
            You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}. Nice work.
          </p>

          <PixelButton variant="primary" onClick={() => router.push("/app/review")}>
            Done
          </PixelButton>
        </div>
      </DialogFrame>
    );
  }

  // ─── Active Review ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Reward feedback */}
      <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />

      {/* Delete confirmation dialog */}
      <PixelConfirmDialog
        open={confirmDelete}
        title="Delete this card?"
        message="This card and its review history will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          Card {currentIndex + 1} of {totalCards}
        </span>
        <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          {reviewedCount} reviewed
        </span>
      </div>
      <PixelProgressBar
        value={currentIndex}
        max={totalCards}
        variant="xp"
      />

      {/* Card */}
      <DialogFrame>
        {/* Topic badge */}
        {currentCard.topic_name && (
          <div
            className="flex items-center gap-2 pb-3 mb-4"
            style={{ borderBottom: "2px solid var(--pixel-border)" }}
          >
            <img
              src="/sprites/travel-book/icons/Book.png"
              alt=""
              width={14}
              height={14}
              className="pixel-art"
            />
            <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
              {currentCard.subject_name && `${currentCard.subject_name} → `}
              {currentCard.topic_name}
            </span>
            <span
              className="ml-auto font-pixel text-[9px] px-1.5 py-0.5"
              style={{
                color: "var(--pixel-text-secondary)",
                border: "1px solid var(--pixel-border)",
              }}
            >
              {currentCard.source_type}
            </span>
          </div>
        )}

        {/* Video source badge */}
        {currentCard.source_type === "video" && currentCard.metadata?.youtube_id && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                const ytId = currentCard.metadata!.youtube_id;
                const offset = currentCard.metadata!.offset_seconds ?? 0;
                router.push(`/app/study-room?video=${ytId}&t=${offset}`);
              }}
              className="font-pixel text-[10px] px-2 py-1"
              style={{
                color: "var(--pixel-accent)",
                border: "2px solid var(--pixel-accent)",
                backgroundColor: "color-mix(in srgb, var(--pixel-accent) 10%, transparent)",
              }}
            >
              View in Study Room →
            </button>
          </div>
        )}

        {/* Front (Question) */}
        <div className="py-4">
          <p
            className="font-pixel text-[10px] uppercase tracking-wider mb-2"
            style={{ color: "var(--pixel-text-muted)" }}
          >
            Question
          </p>
          <p className="text-base" style={{ color: "var(--pixel-text-primary)", lineHeight: 1.6 }}>
            {currentCard.front}
          </p>
        </div>

        {/* Reveal / Answer */}
        {!revealed ? (
          <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
            <PixelButton variant="secondary" onClick={handleReveal} className="w-full">
              Reveal Answer
            </PixelButton>
          </div>
        ) : (
          <>
            {/* Answer */}
            <div className="py-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
              <p
                className="font-pixel text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                Answer
              </p>
              <p className="text-sm" style={{ color: "var(--pixel-text-secondary)", lineHeight: 1.6 }}>
                {currentCard.back}
              </p>
            </div>

            {/* Grade buttons */}
            <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
              <p
                className="mb-3 text-center font-pixel text-[10px]"
                style={{ color: "var(--pixel-text-secondary)" }}
              >
                How well did you recall this?
              </p>
              <div className="grid grid-cols-6 gap-2">
                {GRADE_LABELS.map(({ grade, label, color }) => (
                  <button
                    key={grade}
                    onClick={() => handleGrade(grade)}
                    disabled={isPending}
                    className="flex flex-col items-center gap-0.5 px-1 py-3 border-2 transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: color,
                      borderColor: "var(--pixel-border)",
                      color: "#fff",
                      minHeight: "44px",
                      imageRendering: "pixelated",
                    }}
                  >
                    {isPending ? (
                      <span className="font-pixel text-xs animate-pixel-blink">...</span>
                    ) : (
                      <>
                        <span className="font-pixel text-sm font-bold">{grade}</span>
                        <span className="font-pixel text-[8px]">{label}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogFrame>

      {/* Card meta + actions */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
          Interval: {currentCard.interval}d · Reps: {currentCard.repetition} · EF: {currentCard.efactor}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="font-pixel text-[10px] transition-colors"
            style={{ color: "var(--pixel-error)" }}
          >
            Delete card
          </button>
          <button
            onClick={() => setRevealed(false)}
            className="font-pixel text-[10px] transition-colors"
            style={{ color: "var(--pixel-text-secondary)" }}
          >
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
