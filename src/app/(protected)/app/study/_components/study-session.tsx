"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/(protected)/app/_actions/review";
import { Rating, type Grade } from "@/lib/fsrs";
import type { StudyItem } from "@/app/(protected)/app/_actions/study-session";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { SuccessCheck } from "@/app/(protected)/app/_components/success-check";
import { useSessionStats } from "@/app/(protected)/app/_components/session-stats-context";
import { playSessionComplete } from "@/lib/sfx";
import {
  DialogFrame,
  PixelButton,
  PixelProgressBar,
} from "@/components/pixel-ui";
import Link from "next/link";

// ---------------------------------------------------------------------------
// 4-button FSRS grade config (matches review-session.tsx)
// ---------------------------------------------------------------------------

interface GradeButton {
  rating: Grade;
  label: string;
  sublabel: string;
  color: string;
}

const FSRS_GRADES: GradeButton[] = [
  { rating: Rating.Again, label: "Again", sublabel: "Forgot", color: "var(--pixel-error)" },
  { rating: Rating.Hard, label: "Hard", sublabel: "Struggled", color: "var(--pixel-warning)" },
  { rating: Rating.Good, label: "Good", sublabel: "Recalled", color: "var(--pixel-accent)" },
  { rating: Rating.Easy, label: "Easy", sublabel: "Perfect", color: "var(--pixel-success)" },
];

// ---------------------------------------------------------------------------
// Type badge config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  flashcard: { label: "Flashcard", icon: "Book.png", color: "var(--pixel-accent)" },
  feynman_prompt: { label: "Feynman Prompt", icon: "Lightbulb.png", color: "var(--pixel-success)" },
  rag_question: { label: "Research Question", icon: "MagnifyingGlass.png", color: "#8b5cf6" },
};

// ---------------------------------------------------------------------------
// StudySession
// ---------------------------------------------------------------------------

export function StudySession({ queue }: { queue: StudyItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { addReward } = useSessionStats();

  // Stats tracking
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [topicsPrompted, setTopicsPrompted] = useState(0);
  const [questionsExplored, setQuestionsExplored] = useState(0);

  // Reward feedback
  const [xpToastData, setXpToastData] = useState({ xp: 0, coins: 0, visible: false });
  const [showComplete, setShowComplete] = useState(false);

  const currentItem = queue[currentIndex];
  const totalItems = queue.length;

  function advanceToNext() {
    if (currentIndex + 1 >= totalItems) {
      setSessionComplete(true);
      setShowComplete(true);
      setTimeout(() => setShowComplete(false), 3000);
      // TODO(option-2-refactor): Session complete XP/coins hardcoded to match
      // rewardAction("session_complete"). Drift risk if server rules change.
      setXpToastData({ xp: 10, coins: 3, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 3000);
      addReward(10, 3);
      playSessionComplete();
    } else {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  function handleGrade(rating: Grade) {
    if (!currentItem.cardId) return;
    startTransition(async () => {
      await submitReview(currentItem.cardId!, rating);
      setCardsReviewed((c) => c + 1);

      // TODO(option-2-refactor): These XP/coin values are hardcoded to match
      // rewardAction() server logic. If reward rules change (streak multipliers,
      // tuned amounts), these will silently drift.
      const passed = rating !== Rating.Again;
      const xp = passed ? 3 : 1;
      const coins = passed ? 1 : 0;
      setXpToastData({ xp, coins, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 3000);
      addReward(xp, coins);

      advanceToNext();
    });
  }

  function handleFeynmanNext() {
    setTopicsPrompted((c) => c + 1);
    advanceToNext();
  }

  function handleRagNext() {
    setQuestionsExplored((c) => c + 1);
    advanceToNext();
  }

  // ─── Session Complete ───────────────────────────────────────────────────

  if (sessionComplete) {
    return (
      <DialogFrame>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />
          <SuccessCheck message="Study session complete!" visible={showComplete} />

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
            Great work on your interleaved study session.
          </p>

          {/* Stats */}
          <div className="w-full max-w-sm mt-2 space-y-3">
            {/* Hero stat: Cards reviewed (actionable) */}
            <div className="pixel-panel pixel-panel-inset text-center" style={{ padding: "var(--pixel-panel-standard)" }}>
              <p className="font-pixel text-2xl" style={{ color: "var(--pixel-accent)" }}>
                {cardsReviewed}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--pixel-text-secondary)" }}>
                Cards reviewed
              </p>
            </div>
            {/* Ambient: Topics + Questions */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="font-pixel text-sm" style={{ color: "var(--pixel-success)" }}>{topicsPrompted}</span>
                <span className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>Topics</span>
              </div>
              <span className="text-[var(--pixel-border)]">·</span>
              <div className="flex items-center gap-1.5">
                <span className="font-pixel text-sm" style={{ color: "#8b5cf6" }}>{questionsExplored}</span>
                <span className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>Questions</span>
              </div>
            </div>
          </div>

          <PixelButton variant="primary" onClick={() => { window.location.href = "/app"; }}>
            Back to Dashboard
          </PixelButton>
        </div>
      </DialogFrame>
    );
  }

  // ─── Active Session ─────────────────────────────────────────────────────

  const completed = cardsReviewed + topicsPrompted + questionsExplored;

  return (
    <div className="space-y-4">
      {/* Reward feedback */}
      <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />

      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          Item {currentIndex + 1} of {totalItems}
        </span>
        <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          {completed} completed
        </span>
      </div>
      <PixelProgressBar value={currentIndex} max={totalItems} variant="xp" />

      {/* Type badge */}
      <div className="flex items-center gap-2">
        {TYPE_CONFIG[currentItem.type] && (
          <span
            className="pixel-panel pixel-panel-inset inline-flex items-center gap-1.5 px-2 py-1 font-pixel text-[10px]"
            style={{ color: TYPE_CONFIG[currentItem.type].color }}
          >
            <img
              src={`/sprites/travel-book/icons/${TYPE_CONFIG[currentItem.type].icon}`}
              alt=""
              width={12}
              height={12}
              className="pixel-art"
            />
            {TYPE_CONFIG[currentItem.type].label}
          </span>
        )}
        <span className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
          {currentItem.subject} → {currentItem.topic}
        </span>
      </div>

      {/* Card content */}
      <DialogFrame>
        {currentItem.type === "flashcard" && (
          <FlashcardView
            item={currentItem}
            revealed={revealed}
            isPending={isPending}
            onReveal={() => setRevealed(true)}
            onGrade={handleGrade}
          />
        )}
        {currentItem.type === "feynman_prompt" && (
          <FeynmanView item={currentItem} onNext={handleFeynmanNext} />
        )}
        {currentItem.type === "rag_question" && (
          <RagView item={currentItem} onNext={handleRagNext} />
        )}
      </DialogFrame>

      {/* Skip */}
      <div className="flex justify-end">
        <button
          onClick={advanceToNext}
          className="font-pixel text-[10px] transition-colors"
          style={{ color: "var(--pixel-text-secondary)" }}
        >
          Skip →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlashcardView
// ---------------------------------------------------------------------------

function FlashcardView({
  item,
  revealed,
  isPending,
  onReveal,
  onGrade,
}: {
  item: StudyItem;
  revealed: boolean;
  isPending: boolean;
  onReveal: () => void;
  onGrade: (rating: Grade) => void;
}) {
  return (
    <>
      {/* Front */}
      <div className="py-4">
        <p
          className="font-pixel text-[10px] uppercase tracking-wider mb-2"
          style={{ color: "var(--pixel-text-muted)" }}
        >
          Question
        </p>
        <p className="text-base" style={{ color: "var(--pixel-text-primary)", lineHeight: 1.6 }}>
          {item.front}
        </p>
      </div>

      {!revealed ? (
        <div className="pt-4" style={{ borderTop: "2px solid var(--pixel-border)" }}>
          <PixelButton variant="secondary" onClick={onReveal} className="w-full">
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
              {item.back}
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
            <div className="grid grid-cols-4 gap-2">
              {FSRS_GRADES.map(({ rating, label, sublabel, color }) => (
                <button
                  key={rating}
                  onClick={() => onGrade(rating)}
                  disabled={isPending}
                  className="flex flex-col items-center gap-0.5 px-2 py-3 border-2 transition-opacity disabled:opacity-50"
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
    </>
  );
}

// ---------------------------------------------------------------------------
// FeynmanView
// ---------------------------------------------------------------------------

function FeynmanView({ item, onNext }: { item: StudyItem; onNext: () => void }) {
  return (
    <div className="py-4">
      <p
        className="font-pixel text-[10px] uppercase tracking-wider mb-2"
        style={{ color: "var(--pixel-success)" }}
      >
        Feynman Technique
      </p>
      <p className="text-base mb-2" style={{ color: "var(--pixel-text-primary)" }}>
        Explain this topic in your own words:
      </p>
      <p className="font-pixel text-lg" style={{ color: "var(--pixel-success)" }}>
        {item.topic}
      </p>
      {item.prompt && (
        <p className="mt-2 text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
          {item.prompt}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Link href={`/app/feynman?topic=${item.topicId}`}>
          <PixelButton variant="success">Go to Feynman Mode</PixelButton>
        </Link>
        <PixelButton variant="secondary" size="small" onClick={onNext}>
          Next →
        </PixelButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RagView
// ---------------------------------------------------------------------------

function RagView({ item, onNext }: { item: StudyItem; onNext: () => void }) {
  return (
    <div className="py-4">
      <p
        className="font-pixel text-[10px] uppercase tracking-wider mb-2"
        style={{ color: "#8b5cf6" }}
      >
        Research Question
      </p>
      <p className="text-base" style={{ color: "var(--pixel-text-primary)", lineHeight: 1.6 }}>
        {item.question}
      </p>
      {item.paperTitle && (
        <p className="mt-2 text-sm italic" style={{ color: "var(--pixel-text-secondary)" }}>
          From paper: {item.paperTitle}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Link href="/app/research">
          <PixelButton variant="primary">Answer from Papers</PixelButton>
        </Link>
        <PixelButton variant="secondary" size="small" onClick={onNext}>
          Next →
        </PixelButton>
      </div>
    </div>
  );
}
