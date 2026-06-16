"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview, deleteCard, type DueCard } from "@/app/(protected)/app/_actions/review";
import {
  Eye,
  RotateCcw,
  Loader2,
  Trophy,
  Tag,
  Trash2,
  MonitorPlay,
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

export function ReviewSession({ initialCards }: { initialCards: DueCard[] }) {
  const router = useRouter();
  const [cards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

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
        // Show session complete success check
        setShowComplete(true);
        setTimeout(() => setShowComplete(false), 100);
        playSessionComplete();
      } else {
        setCurrentIndex((i) => i + 1);
      }
    });
  }

  // Session complete screen
  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <SuccessCheck message="Review session complete!" visible={showComplete} />
        <XpToast xp={10} coins={3} visible={showComplete} />
        <Trophy className="mb-4 h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold">Session Complete!</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}. Nice work.
        </p>
        <a
          href="/app/review"
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Done
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
          Card {currentIndex + 1} of {totalCards}
        </span>
        <span>{reviewedCount} reviewed</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((currentIndex) / totalCards) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Topic badge */}
        {currentCard.topic_name && (
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
            <Tag className="h-3 w-3 text-zinc-400" />
            <span className="text-xs text-zinc-400">
              {currentCard.subject_name && `${currentCard.subject_name} → `}
              {currentCard.topic_name}
            </span>
            <span className="ml-auto text-xs text-zinc-400">
              {currentCard.source_type}
            </span>
          </div>
        )}

        {/* Video source badge — navigates to Study Room with timestamp */}
        {currentCard.source_type === "video" && currentCard.metadata?.youtube_id && (
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                const ytId = currentCard.metadata!.youtube_id;
                const offset = currentCard.metadata!.offset_seconds ?? 0;
                router.push(`/app/study-room?video=${ytId}&t=${offset}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            >
              <MonitorPlay className="h-3 w-3" />
              View in Study Room
            </button>
          </div>
        )}

        {/* Front */}
        <div className="px-6 py-8">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Question
          </p>
          <p className="mt-2 text-lg font-medium text-zinc-800 dark:text-zinc-200">
            {currentCard.front}
          </p>
        </div>

        {/* Divider / Reveal */}
        {!revealed ? (
          <div className="border-t border-zinc-100 px-6 py-6 dark:border-zinc-800">
            <button
              onClick={handleReveal}
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
                {currentCard.back}
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
                    onClick={() => handleGrade(grade)}
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
      </div>

      {/* Card info */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          Interval: {currentCard.interval}d · Reps: {currentCard.repetition} · EF: {currentCard.efactor}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
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
            }}
            disabled={isPending}
            className="flex items-center gap-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
            Delete card
          </button>
          <button
            onClick={() => {
              setRevealed(false);
            }}
            className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <RotateCcw className="h-3 w-3" />
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
