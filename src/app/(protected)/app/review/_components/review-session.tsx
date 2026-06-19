"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview, deleteCard, type DueCard } from "@/app/(protected)/app/_actions/review";
import { Rating, type Grade } from "@/lib/fsrs";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { SuccessCheck } from "@/app/(protected)/app/_components/success-check";
import { useSessionStats } from "@/app/(protected)/app/_components/session-stats-context";
import { playSessionComplete } from "@/lib/sfx";
import {
  DialogFrame,
  PixelButton,
  PixelProgressBar,
  PixelConfirmDialog,
} from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// 4-button FSRS grade config (spec Req 2.1)
// ---------------------------------------------------------------------------

interface GradeButton {
  rating: Grade;
  label: string;
  sublabel: string;
  color: string;
}

const FSRS_GRADES: GradeButton[] = [
  {
    rating: Rating.Again,
    label: "Again",
    sublabel: "Forgot",
    color: "var(--pixel-error)",
  },
  {
    rating: Rating.Hard,
    label: "Hard",
    sublabel: "Struggled",
    color: "var(--pixel-warning)",
  },
  {
    rating: Rating.Good,
    label: "Good",
    sublabel: "Recalled",
    color: "var(--pixel-accent)",
  },
  {
    rating: Rating.Easy,
    label: "Easy",
    sublabel: "Perfect",
    color: "var(--pixel-success)",
  },
];

// ---------------------------------------------------------------------------
// FSRS state label for the card meta strip
// ---------------------------------------------------------------------------

const FSRS_STATE_LABEL = ["New", "Learning", "Review", "Relearning"] as const;

// ---------------------------------------------------------------------------
// ReviewSession
// ---------------------------------------------------------------------------

export function ReviewSession({ initialCards }: { initialCards: DueCard[] }) {
  const router = useRouter();
  const { addReward } = useSessionStats();

  // Mutable queue so Again can re-append the card (spec Req 2.2).
  const [queue, setQueue] = useState<DueCard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [requeuedIds, setRequeuedIds] = useState<Set<string>>(new Set());

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reward feedback
  const [xpToastData, setXpToastData] = useState({ xp: 0, coins: 0, visible: false });
  const [showComplete, setShowComplete] = useState(false);

  // Transient "card requeued" banner for Again
  const [showRequeued, setShowRequeued] = useState(false);

  const currentCard = queue[currentIndex];
  const totalCards = queue.length; // grows when Again re-appends

  function handleReveal() {
    setRevealed(true);
  }

  function handleGrade(rating: Grade) {
    startTransition(async () => {
      await submitReview(currentCard.id, rating);
      setReviewedCount((c) => c + 1);
      setRevealed(false);

      // Show XP toast
      // TODO(option-2-refactor): These XP/coin values are hardcoded to match
      // rewardAction() server logic. If reward rules change (streak multipliers,
      // tuned amounts), these will silently drift. Refactor: have submitReview()
      // return the RewardResult from rewardAction() so the client uses the real
      // server-granted values instead of duplicating the logic.
      const xp = rating !== Rating.Again ? 3 : 1;
      const coins = rating !== Rating.Again ? 1 : 0;
      setXpToastData({ xp, coins, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 100);
      addReward(xp, coins);

      if (rating === Rating.Again) {
        // Intra-session relearning: re-append card to the end of the queue
        // so it reappears before the session ends (spec Req 2.2).
        setQueue((prev) => [...prev, currentCard]);
        setRequeuedIds((prev) => new Set(prev).add(currentCard.id));
        setShowRequeued(true);
        setTimeout(() => setShowRequeued(false), 1800);
        setCurrentIndex((i) => i + 1);
      } else {
        // Non-lapse: advance; end session if no more cards remain.
        const nextIndex = currentIndex + 1;
        if (nextIndex >= totalCards) {
          setSessionComplete(true);
          setShowComplete(true);
          setTimeout(() => setShowComplete(false), 100);
          playSessionComplete();
        } else {
          setCurrentIndex(nextIndex);
        }
      }
    });
  }

  function handleDeleteConfirm() {
    setConfirmDelete(false);
    startTransition(async () => {
      await deleteCard(currentCard.id);
      setReviewedCount((c) => c + 1);
      setRevealed(false);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalCards) {
        setSessionComplete(true);
      } else {
        setCurrentIndex(nextIndex);
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
          {totalCards > initialCards.length && (
            <span style={{ color: "var(--pixel-warning)" }}>
              {" "}(+{totalCards - initialCards.length} requeued)
            </span>
          )}
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

      {/* Requeued banner */}
      {showRequeued && (
        <div
          className="font-pixel text-[10px] text-center py-1 px-2"
          style={{
            color: "var(--pixel-warning)",
            border: "2px solid var(--pixel-warning)",
            backgroundColor: "color-mix(in srgb, var(--pixel-warning) 12%, transparent)",
          }}
        >
          Card will reappear later in this session
        </div>
      )}

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

            {/* 4-button FSRS grading (spec Req 2.1) */}
            <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
              <p
                className="mb-3 text-center font-pixel text-[10px]"
                style={{ color: "var(--pixel-text-secondary)" }}
              >
                How well did you recall this?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {FSRS_GRADES.map(({ rating, label, sublabel, color }) => (
                  <button
                    key={rating}
                    onClick={() => handleGrade(rating)}
                    disabled={isPending}
                    className="flex flex-col items-center gap-0.5 px-2 py-3 border-2 grade-btn disabled:grayscale disabled:opacity-60"
                    style={{
                      backgroundColor: color,
                      borderColor: "var(--pixel-border)",
                      color: "#fff",
                      minHeight: "52px",
                      imageRendering: "pixelated",
                    }}
                  >
                    {isPending ? (
                      <span className="font-pixel text-xs animate-pixel-blink">...</span>
                    ) : (
                      <>
                        <span className="font-pixel text-sm font-bold">{label}</span>
                        <span className="font-pixel text-[8px] opacity-80">{sublabel}</span>
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
          {`S: ${currentCard.stability?.toFixed(1) ?? "?"}d · ` +
            `D: ${currentCard.difficulty?.toFixed(1) ?? "?"} · ` +
            `${FSRS_STATE_LABEL[currentCard.fsrs_state] ?? "New"}` +
            (requeuedIds.has(currentCard.id) ? " · requeued" : "")}
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
