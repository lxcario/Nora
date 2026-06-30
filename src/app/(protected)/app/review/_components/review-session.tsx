"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
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
    sublabel: "Let's revisit",
    color: "var(--pixel-error)",
  },
  {
    rating: Rating.Hard,
    label: "Hard",
    sublabel: "Needed effort",
    color: "var(--pixel-warning)",
  },
  {
    rating: Rating.Good,
    label: "Good",
    sublabel: "Remembered",
    color: "var(--pixel-accent)",
  },
  {
    rating: Rating.Easy,
    label: "Easy",
    sublabel: "Feels familiar",
    color: "var(--pixel-success)",
  },
];

// ---------------------------------------------------------------------------
// FSRS state label for the card meta strip
// ---------------------------------------------------------------------------

const FSRS_STATE_LABEL = ["New", "Learning", "Review", "Relearning"] as const;

// ---------------------------------------------------------------------------
// JOL (Judgment of Learning) confidence levels
// ---------------------------------------------------------------------------

const JOL_LEVELS = [
  { value: 1, label: "Can't recall", color: "var(--pixel-error)" },
  { value: 2, label: "Unsure", color: "var(--pixel-warning)" },
  { value: 3, label: "Maybe", color: "var(--pixel-accent)" },
  { value: 4, label: "Pretty sure", color: "var(--pixel-accent)" },
  { value: 5, label: "Certain", color: "var(--pixel-success)" },
] as const;

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

  // JOL Confidence (pre-reveal gate, spec SPEC-JOL-CONFIDENCE.md Option A)
  const [confidence, setConfidence] = useState<number | null>(null);
  const [confidenceGiven, setConfidenceGiven] = useState(false);

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reward feedback
  const [xpToastData, setXpToastData] = useState({ xp: 0, coins: 0, visible: false });
  const [showComplete, setShowComplete] = useState(false);

  // Transient "card requeued" banner for Again
  const [showRequeued, setShowRequeued] = useState(false);

  // Undo last review state: holds the pending grade before server commit
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoLabel, setUndoLabel] = useState("");
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGradeRef = useRef<{ cardId: string; rating: Grade; confidence: number | null } | null>(null);

  const currentCard = queue[currentIndex];
  const totalCards = queue.length; // grows when Again re-appends

  function handleReveal() {
    setRevealed(true);
  }

  function commitGrade(cardId: string, rating: Grade, jolConfidence: number | null) {
    startTransition(async () => {
      await submitReview(cardId, rating, jolConfidence ?? undefined);

      // XP toast
      const xp = rating !== Rating.Again ? 3 : 1;
      const coins = rating !== Rating.Again ? 1 : 0;
      setXpToastData({ xp, coins, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 3000);
      addReward(xp, coins);
    });
  }

  function handleGrade(rating: Grade) {
    // Clear any existing undo timer (user graded again before undo expired)
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      // Commit the previously pending grade immediately
      if (pendingGradeRef.current) {
        commitGrade(
          pendingGradeRef.current.cardId,
          pendingGradeRef.current.rating,
          pendingGradeRef.current.confidence
        );
      }
    }

    // Store current grade as pending
    pendingGradeRef.current = {
      cardId: currentCard.id,
      rating,
      confidence,
    };
    setUndoLabel(FSRS_GRADES.find((g) => g.rating === rating)?.label ?? "");
    setUndoAvailable(true);

    // Advance the UI immediately (optimistic)
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setConfidence(null);
    setConfidenceGiven(false);

    if (rating === Rating.Again) {
      setQueue((prev) => [...prev, currentCard]);
      setRequeuedIds((prev) => new Set(prev).add(currentCard.id));
      setShowRequeued(true);
      setTimeout(() => setShowRequeued(false), 1800);
      setCurrentIndex((i) => i + 1);
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalCards) {
        setSessionComplete(true);
        setShowComplete(true);
        setTimeout(() => setShowComplete(false), 3000);
        playSessionComplete();
      } else {
        setCurrentIndex(nextIndex);
      }
    }

    // Start 3s undo timer — after which the grade is committed to the server
    undoTimerRef.current = setTimeout(() => {
      if (pendingGradeRef.current) {
        commitGrade(
          pendingGradeRef.current.cardId,
          pendingGradeRef.current.rating,
          pendingGradeRef.current.confidence
        );
        pendingGradeRef.current = null;
      }
      setUndoAvailable(false);
      undoTimerRef.current = null;
    }, 3000);
  }

  function handleUndo() {
    if (!pendingGradeRef.current || !undoTimerRef.current) return;

    // Cancel the pending commit
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;

    const pending = pendingGradeRef.current;
    pendingGradeRef.current = null;
    setUndoAvailable(false);

    // Revert the optimistic UI advancement
    setReviewedCount((c) => Math.max(0, c - 1));

    if (pending.rating === Rating.Again) {
      // Remove the re-appended card from the end of the queue
      setQueue((prev) => prev.slice(0, -1));
      setRequeuedIds((prev) => {
        const next = new Set(prev);
        next.delete(pending.cardId);
        return next;
      });
    }

    // Go back to the card that was just graded
    setCurrentIndex((i) => Math.max(0, i - 1));
    setRevealed(true); // Show the answer again so the user can re-grade
    setConfidence(pending.confidence);
    setConfidenceGiven(true);
    setSessionComplete(false);
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

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────
  // 1=Again, 2=Hard, 3=Good, 4=Easy (only active when answer is revealed)
  // Space = Reveal answer (when not yet revealed and confidence given)
  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas or during pending state
      if (isPending || sessionComplete || confirmDelete) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (revealed) {
        // Grade shortcuts: 1-4
        const gradeMap: Record<string, Grade> = {
          "1": Rating.Again,
          "2": Rating.Hard,
          "3": Rating.Good,
          "4": Rating.Easy,
        };
        if (gradeMap[e.key]) {
          e.preventDefault();
          handleGrade(gradeMap[e.key]);
        }
      } else if (confidenceGiven && e.key === " ") {
        // Space to reveal (only after confidence is given)
        e.preventDefault();
        handleReveal();
      }
    },
    [revealed, isPending, sessionComplete, confirmDelete, confidenceGiven]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  // ─── Session Complete ───────────────────────────────────────────────────

  if (sessionComplete) {
    return (
      <DialogFrame>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <SuccessCheck message="All remembered." visible={showComplete} />
          <XpToast xp={10} coins={3} visible={showComplete} />

          <img
            src="/sprites/travel-book/icons/Flower.png"
            alt=""
            width={40}
            height={40}
            className="pixel-art"
          />

          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--pixel-text-secondary)" }}>
            Everything you remembered today has found its place again.
          </p>
          <p className="font-pixel text-xs" style={{ color: "var(--pixel-text-muted)" }}>
            {reviewedCount} {reviewedCount !== 1 ? "memories" : "memory"} revisited
          </p>

          <PixelButton variant="primary" onClick={() => router.push("/app")}>
            Continue
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
          Memory {currentIndex + 1} of {totalCards}
          {totalCards > initialCards.length && (
            <span style={{ color: "var(--pixel-warning)" }}>
              {" "}(+{totalCards - initialCards.length} revisiting)
            </span>
          )}
        </span>
        <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          {reviewedCount} remembered
        </span>
      </div>
      <PixelProgressBar
        value={currentIndex}
        max={totalCards}
        variant="xp"
      />

      {/* Undo last grade toast */}
      {undoAvailable && (
        <div
          className="flex items-center justify-between px-3 py-2 font-pixel text-[11px] animate-pixel-pop"
          style={{
            border: "2px solid var(--pixel-accent)",
            backgroundColor: "color-mix(in srgb, var(--pixel-accent) 12%, var(--pixel-bg-surface))",
            color: "var(--pixel-text-primary)",
          }}
        >
          <span>
            Graded <strong style={{ color: "var(--pixel-accent)" }}>{undoLabel}</strong> — saving in 3s
          </span>
          <button
            onClick={handleUndo}
            className="px-2 py-0.5 font-pixel text-[10px]"
            style={{
              color: "var(--pixel-accent)",
              border: "1px solid var(--pixel-accent)",
            }}
          >
            Undo
          </button>
        </div>
      )}

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
          We'll revisit this one again soon.
        </div>
      )}

      {/* Transition moments */}
      {currentIndex === 0 && reviewedCount === 0 && (
        <p className="text-xs text-center italic px-4" style={{ color: "var(--pixel-text-muted)" }}>
          Let&apos;s wake up a few memories.
        </p>
      )}
      {currentIndex === totalCards - 1 && !revealed && reviewedCount > 0 && (
        <p className="text-xs text-center italic px-4" style={{ color: "var(--pixel-text-muted)" }}>
          One more memory.
        </p>
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
            {/* JOL Confidence step (pre-reveal gate) */}
            {!confidenceGiven ? (
              <div className="space-y-3">
                <p
                  className="text-center font-pixel text-[10px]"
                  style={{ color: "var(--pixel-text-secondary)" }}
                >
                  Before revealing — how confident are you?
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {JOL_LEVELS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setConfidence(value); setConfidenceGiven(true); }}
                      className="flex flex-col items-center gap-0.5 px-1 py-2.5 border-2 transition-colors"
                      style={{
                        borderColor: "var(--pixel-border)",
                        backgroundColor: `color-mix(in srgb, ${color} 18%, var(--pixel-bg-surface))`,
                        color,
                      }}
                    >
                      <span className="font-pixel text-sm font-bold">{value}</span>
                      <span className="font-pixel text-[7px] leading-tight opacity-80">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Confidence badge */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
                    Confidence:
                  </span>
                  <span className="font-pixel text-xs flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        style={{
                          color: i < (confidence ?? 0)
                            ? JOL_LEVELS[(confidence ?? 1) - 1].color
                            : "var(--pixel-text-muted)",
                        }}
                      >
                        {i < (confidence ?? 0) ? "●" : "○"}
                      </span>
                    ))}
                  </span>
                  <span className="font-pixel text-[9px]" style={{ color: JOL_LEVELS[(confidence ?? 1) - 1].color }}>
                    ({JOL_LEVELS[(confidence ?? 1) - 1].label})
                  </span>
                </div>
                <PixelButton variant="secondary" onClick={handleReveal} className="w-full">
                  Reveal Answer
                </PixelButton>
              </div>
            )}
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
              <p
                className="mt-2 text-center font-pixel text-[9px]"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                Keyboard: 1 Again · 2 Hard · 3 Good · 4 Easy
              </p>
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
