import { PageHeader } from "../_components/page-header";
import { getDueCards } from "../_actions/review";
import { ReviewSession } from "./_components/review-session";
import { Layers, CheckCircle, Clock } from "lucide-react";

export default async function ReviewPage() {
  const { cards, error } = await getDueCards();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Cards"
        description="SM-2 spaced repetition. Grade your recall from 0 (blackout) to 5 (perfect)."
      />

      {/* Stats bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Layers className="h-5 w-5 text-zinc-400" />
          <div>
            <p className="text-2xl font-bold">{cards.length}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Cards Due</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <CheckCircle className="h-5 w-5 text-zinc-400" />
          <div>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Reviewed Today</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Clock className="h-5 w-5 text-zinc-400" />
          <div>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg. Interval</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
          <CheckCircle className="mb-3 h-10 w-10 text-emerald-400 dark:text-emerald-600" />
          <p className="text-sm font-medium text-zinc-500">All caught up!</p>
          <p className="mt-1 text-center text-xs text-zinc-400 max-w-xs">
            No cards are due for review right now. Create more cards via Feynman Mode or Research, and they&apos;ll appear here when it&apos;s time to review.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="/app/feynman"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
            >
              Explain a topic
            </a>
            <a
              href="/app/research"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-amber-700 dark:hover:bg-amber-900/20"
            >
              Research a topic
            </a>
          </div>
        </div>
      ) : (
        <ReviewSession initialCards={cards} />
      )}
    </div>
  );
}
