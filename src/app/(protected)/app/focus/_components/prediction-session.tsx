"use client";

import { useState } from "react";
import type { PredictionCard } from "../../_actions/prediction";

// ---------------------------------------------------------------------------
// Prediction Session — Pre-Testing + Calibration Feedback
// ---------------------------------------------------------------------------

interface Props {
  cards: PredictionCard[];
}

type Phase = "predict" | "reveal" | "calibration";

interface Guess {
  cardId: string;
  userGuess: string;
  confidenceRating: number; // 1-5 how sure they were
}

export function PredictionSession({ cards }: Props) {
  const [phase, setPhase] = useState<Phase>("predict");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentConfidence, setCurrentConfidence] = useState(3);
  const [revealIndex, setRevealIndex] = useState(0);

  const totalCards = cards.length;
  const currentCard = cards[currentIndex];

  // ── Predict phase: user guesses each card ──
  function submitGuess() {
    const guess: Guess = {
      cardId: currentCard.id,
      userGuess: currentGuess.trim() || "(skipped)",
      confidenceRating: currentConfidence,
    };
    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");
    setCurrentConfidence(3);

    if (currentIndex + 1 < totalCards) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All cards guessed — move to reveal
      setPhase("reveal");
      setRevealIndex(0);
    }
  }

  // ── Reveal phase: show each answer ──
  function nextReveal() {
    if (revealIndex + 1 < totalCards) {
      setRevealIndex(revealIndex + 1);
    } else {
      setPhase("calibration");
    }
  }

  // ── Calibration: show the illusion-of-knowing gap ──
  if (phase === "calibration") {
    const avgConfidence = guesses.reduce((s, g) => s + g.confidenceRating, 0) / totalCards;
    const predictedCorrect = Math.round((avgConfidence / 5) * totalCards);
    // Since these are the user's WEAKEST cards, likely 0-1 were actually right
    // (we can't auto-grade free-text, but the UI makes the point pedagogically)
    const illusionGap = Math.round((avgConfidence / 5) * 100);

    return (
      <div className="space-y-6">
        <div className="pixel-panel" style={{ padding: "var(--pixel-panel-spacious)" }}>
          <h2
            className="font-pixel text-base mb-4"
            style={{ color: "var(--pixel-accent)" }}
          >
            YOUR CALIBRATION
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="pixel-panel pixel-panel-inset text-center p-4">
              <span className="font-pixel text-2xl block" style={{ color: "var(--pixel-accent)" }}>
                {predictedCorrect}/{totalCards}
              </span>
              <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                You predicted you'd know
              </span>
            </div>
            <div className="pixel-panel pixel-panel-inset text-center p-4">
              <span className="font-pixel text-2xl block" style={{ color: "var(--pixel-warning)" }}>
                {illusionGap}%
              </span>
              <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                Confidence level
              </span>
            </div>
          </div>

          <div className="pixel-panel pixel-panel-inset p-4">
            <p className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>
              <span className="font-pixel text-xs" style={{ color: "var(--pixel-success)" }}>
                Good news:
              </span>{" "}
              your brain is now primed to learn these {totalCards} concepts significantly better.
              The pretesting effect means you'll encode them more deeply when you study them next
              — even though you got them wrong now.
            </p>
            <p className="text-xs mt-3" style={{ color: "var(--pixel-text-muted)" }}>
              Based on: Pan & Carpenter (2023) meta-analysis of the pretesting effect;
              Hiller et al. (2020) on calibration feedback improving metacognitive accuracy.
            </p>
          </div>

          <div className="flex gap-3 mt-5">
            <a
              href="/app/review"
              className="pixel-btn pixel-btn-primary inline-flex"
            >
              Review these cards now →
            </a>
            <a
              href="/app"
              className="pixel-btn pixel-btn-secondary inline-flex"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Reveal phase ──
  if (phase === "reveal") {
    const card = cards[revealIndex];
    const guess = guesses[revealIndex];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
            REVEALING {revealIndex + 1} OF {totalCards}
          </span>
        </div>

        <div className="pixel-panel" style={{ padding: "var(--pixel-panel-spacious)" }}>
          {/* Question */}
          <p className="text-sm font-medium mb-3" style={{ color: "var(--pixel-text-primary)" }}>
            {card.front}
          </p>

          {/* User's guess */}
          <div className="pixel-panel pixel-panel-inset p-3 mb-3">
            <span className="font-pixel text-[9px] block mb-1" style={{ color: "var(--pixel-text-muted)" }}>
              YOUR GUESS:
            </span>
            <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
              {guess.userGuess}
            </p>
          </div>

          {/* Real answer */}
          <div className="pixel-panel pixel-panel-inset p-3" style={{ borderColor: "var(--pixel-success)" }}>
            <span className="font-pixel text-[9px] block mb-1" style={{ color: "var(--pixel-success)" }}>
              ACTUAL ANSWER:
            </span>
            <p className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>
              {card.back}
            </p>
          </div>

          {card.topic_name && (
            <span className="text-[10px] mt-2 block" style={{ color: "var(--pixel-text-muted)" }}>
              Topic: {card.topic_name}
              {card.subject_name && ` · ${card.subject_name}`}
            </span>
          )}
        </div>

        <button
          onClick={nextReveal}
          className="pixel-btn pixel-btn-primary w-full"
        >
          {revealIndex + 1 < totalCards ? "Next →" : "See my calibration →"}
        </button>
      </div>
    );
  }

  // ── Predict phase (default) ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          QUESTION {currentIndex + 1} OF {totalCards}
        </span>
        <span className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
          Guess first, learn deeper later
        </span>
      </div>

      <div className="pixel-panel" style={{ padding: "var(--pixel-panel-spacious)" }}>
        {/* Card front (question) */}
        <p className="text-sm font-medium mb-4" style={{ color: "var(--pixel-text-primary)" }}>
          {currentCard.front}
        </p>

        {currentCard.topic_name && (
          <span className="text-[10px] block mb-4" style={{ color: "var(--pixel-text-muted)" }}>
            Topic: {currentCard.topic_name}
            {currentCard.subject_name && ` · ${currentCard.subject_name}`}
          </span>
        )}

        {/* Guess input */}
        <label className="block mb-1">
          <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
            YOUR GUESS (it's okay to be wrong — that's the point):
          </span>
        </label>
        <textarea
          value={currentGuess}
          onChange={(e) => setCurrentGuess(e.target.value)}
          placeholder="Type your best guess, even if you're unsure..."
          className="pixel-input w-full min-h-[80px] text-sm"
          style={{
            backgroundColor: "var(--pixel-bg-primary)",
            color: "var(--pixel-text-primary)",
            border: "2px solid var(--pixel-border)",
            padding: "8px 12px",
          }}
        />

        {/* Confidence slider */}
        <div className="mt-4">
          <label className="block mb-2">
            <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
              HOW CONFIDENT ARE YOU? ({currentConfidence}/5)
            </span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setCurrentConfidence(level)}
                className="flex-1 py-2 text-xs font-pixel transition-colors"
                style={{
                  backgroundColor:
                    level <= currentConfidence
                      ? "color-mix(in srgb, var(--pixel-accent) 30%, var(--pixel-bg-surface))"
                      : "var(--pixel-bg-primary)",
                  color:
                    level <= currentConfidence
                      ? "var(--pixel-accent)"
                      : "var(--pixel-text-muted)",
                  border: "2px solid var(--pixel-border)",
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
              No idea
            </span>
            <span className="text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
              Very sure
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={submitGuess}
        className="pixel-btn pixel-btn-primary w-full"
      >
        Submit guess →
      </button>
    </div>
  );
}
