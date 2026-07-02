import { PageHeader } from "../_components/page-header";
import { getPredictionCards } from "../_actions/prediction";
import { PredictionSession } from "./_components/prediction-session";
import { DialogFrame, EmptyState } from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Prediction Mode — Pre-Testing Effect
// ---------------------------------------------------------------------------
// Based on Pan & Carpenter (2023): guessing answers BEFORE studying them
// significantly improves later learning — even when the initial guesses are
// wrong. Combined with calibration feedback (Hiller et al. 2020) to surface
// the "illusion of knowing" gap.
// ---------------------------------------------------------------------------

export default async function PredictionModePage() {
  const { cards, error } = await getPredictionCards(3);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Prediction Mode"
        description="Guess first, learn deeper later. Getting it wrong now means remembering it better tomorrow."
      />

      <DialogFrame>
        <div className="flex items-start gap-3">
          <img
            src="/sprites/travel-book/icons/Eye.png"
            alt=""
            width={24}
            height={24}
            className="pixel-art shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>
              <span className="font-pixel text-xs" style={{ color: "var(--pixel-accent)" }}>
                The science:
              </span>{" "}
              Trying to answer questions <em>before</em> you know the material primes your brain
              to encode the real answer more deeply. This works even when — especially when —
              you get it wrong.
            </p>
            <p className="text-[10px] mt-2" style={{ color: "var(--pixel-text-muted)" }}>
              Pan & Carpenter (2023) · Pretesting Effect Meta-Analysis
            </p>
          </div>
        </div>
      </DialogFrame>

      {error && (
        <DialogFrame state="error">
          <p className="text-sm" style={{ color: "var(--pixel-error)" }}>
            {error}
          </p>
        </DialogFrame>
      )}

      {cards.length === 0 ? (
        <EmptyState
          icon="book"
          message="You need some cards first. Create a few flashcards — then come back to challenge yourself before you've studied them."
          actionLabel="Create cards in Feynman Mode"
          actionHref="/app/feynman"
        />
      ) : (
        <PredictionSession cards={cards} />
      )}
    </div>
  );
}
