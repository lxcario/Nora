"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/(protected)/app/_actions/review";
import type { StudyItem } from "@/app/(protected)/app/_actions/study-session";
import {
  Eye,
  Loader2,
  Trophy,
  Layers,
  PenLine,
  FlaskConical,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { SuccessCheck } from "@/app/(protected)/app/_components/success-check";
import { playSessionComplete } from "@/lib/sfx";

const GRADE_LABELS = [
  { grade: 0, label: "Blackout", color: "bg-red-600 hover:bg-red-700" },
  { grade: 1, label: "Wrong", color: "bg-red-500 hover:bg-red-600" },
  { grade: 2, label: "Hard", color: "bg-orange-500 hover:bg-orange-600" },
  { grade: 3, label: "OK", color: "bg-amber-500 hover:bg-amber-600" },
  { grade: 4, label: "Good", color: "bg-emerald-500 hover:bg-emerald-600" },
  { grade: 5, label: "Easy", color: "bg-emerald-600 hover:bg-emerald-700" },
];

export function StudySession({ queue }: { queue: StudyItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      // Show session complete rewards
      setShowComplete(true);
      setTimeout(() => setShowComplete(false), 100);
      setXpToastData({ xp: 10, coins: 3, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 100);
      playSessionComplete();
    } else {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  function handleGrade(grade: number) {
    if (!currentItem.cardId) return;
    startTransition(async () => {
      await submitReview(currentItem.cardId!, grade);
      setCardsReviewed((c) => c + 1);

      // Show XP toast for card grade
      const xp = grade >= 3 ? 3 : 1;
      const coins = grade >= 3 ? 1 : 0;
      setXpToastData({ xp, coins, visible: true });
      setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 100);

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

  // Session complete screen
  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />
        <SuccessCheck message="Study session complete!" visible={showComplete} />
        <Trophy className="mb-4 h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold">Session Complete!</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Great work on your interleaved study session.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {cardsReviewed}
            </p>
            <p className="text-xs text-zinc-500">Cards Reviewed</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {topicsPrompted}
            </p>
            <p className="text-xs text-zinc-500">Topics Prompted</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {questionsExplored}
            </p>
            <p className="text-xs text-zinc-500">Questions Explored</p>
          </div>
        </div>
        <a
          href="/app"
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Reward feedback */}
      <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />

      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>
          Item {currentIndex + 1} of {totalItems}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {cardsReviewed + topicsPrompted + questionsExplored} completed
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(currentIndex / totalItems) * 100}%` }}
        />
      </div>

      {/* Item type badge */}
      <div className="flex items-center gap-2">
        {currentItem.type === "flashcard" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            <Layers className="h-3 w-3" />
            Flashcard
          </span>
        )}
        {currentItem.type === "feynman_prompt" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <PenLine className="h-3 w-3" />
            Feynman Prompt
          </span>
        )}
        {currentItem.type === "rag_question" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <FlaskConical className="h-3 w-3" />
            Research Question
          </span>
        )}
        <span className="text-xs text-zinc-400">
          {currentItem.subject} → {currentItem.topic}
        </span>
      </div>

      {/* Card content */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
      </div>

      {/* Skip button */}
      <div className="flex justify-end">
        <button
          onClick={advanceToNext}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Skip
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// --- Sub-components ---

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
  onGrade: (grade: number) => void;
}) {
  return (
    <>
      {/* Front */}
      <div className="px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Question
        </p>
        <p className="mt-2 text-lg font-medium text-zinc-800 dark:text-zinc-200">
          {item.front}
        </p>
      </div>

      {!revealed ? (
        <div className="border-t border-zinc-100 px-6 py-6 dark:border-zinc-800">
          <button
            onClick={onReveal}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 py-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Eye className="h-4 w-4" />
            Reveal Answer
          </button>
        </div>
      ) : (
        <>
          {/* Back (answer) */}
          <div className="border-t border-zinc-100 px-6 py-8 dark:border-zinc-800">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Answer
            </p>
            <p className="mt-2 text-base text-zinc-700 dark:text-zinc-300">
              {item.back}
            </p>
          </div>

          {/* Grade buttons */}
          <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <p className="mb-3 text-center text-xs text-zinc-400">
              How well did you recall this?
            </p>
            <div className="grid grid-cols-6 gap-2">
              {GRADE_LABELS.map(({ grade, label, color }) => (
                <button
                  key={grade}
                  onClick={() => onGrade(grade)}
                  disabled={isPending}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-3 text-white transition-colors disabled:opacity-50 ${color}`}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg font-bold">{grade}</span>
                      <span className="text-[10px]">{label}</span>
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

function FeynmanView({
  item,
  onNext,
}: {
  item: StudyItem;
  onNext: () => void;
}) {
  return (
    <div className="px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
        Feynman Technique
      </p>
      <p className="mt-3 text-lg font-medium text-zinc-800 dark:text-zinc-200">
        Explain this topic in your own words:
      </p>
      <p className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-300">
        {item.topic}
      </p>
      {item.prompt && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {item.prompt}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <a
          href={`/app/feynman?topic=${item.topicId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <PenLine className="h-4 w-4" />
          Go to Feynman Mode
        </a>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Next
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function RagView({
  item,
  onNext,
}: {
  item: StudyItem;
  onNext: () => void;
}) {
  return (
    <div className="px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wider text-purple-500 dark:text-purple-400">
        Research Question
      </p>
      <p className="mt-3 text-lg font-medium text-zinc-800 dark:text-zinc-200">
        {item.question}
      </p>
      {item.paperTitle && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          From paper: <span className="italic">{item.paperTitle}</span>
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <a
          href="/app/research"
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          <FlaskConical className="h-4 w-4" />
          Answer from Papers
        </a>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Next
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
