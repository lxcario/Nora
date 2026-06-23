import { PageHeader } from "../_components/page-header";
import { getDueCards } from "../_actions/review";
import { ReviewSession } from "./_components/review-session";
import { DialogFrame, EmptyState } from "@/components/pixel-ui";

export default async function ReviewPage() {
  const { cards, error } = await getDueCards();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Cards"
        description="FSRS spaced repetition. Grade each card: Again, Hard, Good, or Easy — the algorithm schedules your next review automatically."
      />

      {/* Stats bar */}
      <div className="pixel-panel flex items-center gap-4 p-4">
        <img
          src="/sprites/travel-book/icons/Book.png"
          alt=""
          width={28}
          height={28}
          className="pixel-art shrink-0"
        />
        <div>
          <span
            className="font-pixel text-xl"
            style={{ color: "var(--pixel-accent)" }}
          >
            {cards.length}
          </span>
          <span
            className="ml-2 text-sm"
            style={{ color: "var(--pixel-text-secondary)" }}
          >
            {cards.length === 1 ? "card" : "cards"} due today
          </span>
        </div>
      </div>

      {error && (
        <DialogFrame state="error">
          <p className="text-sm" style={{ color: "var(--pixel-error)" }}>
            {error || "We hit a snag loading your cards. Give it another try."}
          </p>
        </DialogFrame>
      )}

      {cards.length === 0 ? (
        <EmptyState
          icon="book"
          message="All caught up! No cards are due for review right now. Create more via Feynman Mode or Research, and they'll appear here when it's time."
          actionLabel="Explain a topic"
          actionHref="/app/feynman"
        />
      ) : (
        <ReviewSession initialCards={cards} />
      )}
    </div>
  );
}
