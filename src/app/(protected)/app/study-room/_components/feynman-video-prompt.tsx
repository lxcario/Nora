"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  Send,
  Brain,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageCircleQuestion,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { PixelSpinner } from "@/components/pixel-ui";
import { type GapAnalysis } from "@/app/(protected)/app/_actions/feynman";
import { VideoCardEditor } from "./video-card-editor";

interface FeynmanVideoPromptProps {
  videoId: string;
  /** Cumulative seconds the player has been in "playing" state */
  cumulativePlaySeconds: number;
  /** Current player time to determine "recently watched" segment */
  currentTime: number;
  /** Start of the recently watched segment (resets after each Feynman prompt) */
  segmentStart: number;
  /** Callback to evaluate explanation against transcript */
  onEvaluate: (
    explanation: string,
    startSeconds: number,
    endSeconds: number
  ) => Promise<{ data?: GapAnalysis; error?: string }>;
  /** Callback to save cards generated from Feynman analysis */
  onSaveCards: (
    cards: { front: string; back: string; offsetSeconds: number }[]
  ) => Promise<{ success?: boolean; error?: string }>;
  /** Callback for seeking the video player */
  onSeekTo?: (seconds: number) => void;
  /** Called after a Feynman prompt is submitted so parent can reset segment tracking */
  onPromptCompleted?: () => void;
}

export function FeynmanVideoPrompt({
  videoId,
  cumulativePlaySeconds,
  currentTime,
  segmentStart,
  onEvaluate,
  onSaveCards,
  onSeekTo,
  onPromptCompleted,
}: FeynmanVideoPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  // Track whether we've already shown the prompt for this segment
  const promptShownRef = useRef(false);

  // Show prompt after 60 seconds of cumulative playback
  const shouldShowPrompt =
    cumulativePlaySeconds >= 60 && !dismissed && !analysis;

  // Auto-expand when threshold is first reached
  useEffect(() => {
    if (shouldShowPrompt && !promptShownRef.current) {
      promptShownRef.current = true;
      setIsExpanded(true);
    }
  }, [shouldShowPrompt]);

  function handleSubmit() {
    if (explanation.trim().length < 50) return;
    setError(null);
    setAnalysis(null);

    startTransition(async () => {
      const endSeconds = Math.floor(currentTime);
      const startSeconds = Math.floor(segmentStart);

      const result = await onEvaluate(explanation, startSeconds, endSeconds);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setAnalysis(result.data);
        onPromptCompleted?.();
      }
    });
  }

  // Don't render anything until the threshold is met
  if (!shouldShowPrompt && !analysis && !isExpanded) return null;

  return (
    <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)]">
      {/* Header — collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[var(--pixel-accent)]" />
          <span className="text-sm font-semibold text-[var(--pixel-text-primary)]">
            Explain What You Just Watched
          </span>
          {analysis && (
            <span className="bg-[color-mix(in_srgb,var(--pixel-success)_18%,var(--pixel-bg-surface))] px-2 py-0.5 text-xs text-[var(--pixel-success)]">
              Done
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-[var(--pixel-text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--pixel-text-muted)]" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Explanation textarea */}
          {!analysis && (
            <div>
              <p className="mb-2 text-xs text-[var(--pixel-text-secondary)]">
                Use the Feynman technique: explain the concept in your own words
                as if teaching someone else. Minimum 50 characters.
              </p>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={5}
                placeholder="Explain what you just learned in your own words..."
                className="block w-full resize-y border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-3 py-2 text-sm text-[var(--pixel-text-primary)] placeholder:text-[var(--pixel-text-muted)]"
                disabled={isPending}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[var(--pixel-text-muted)]">
                  {explanation.length} characters
                  {explanation.length > 0 && explanation.length < 50
                    ? " (need at least 50)"
                    : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDismissed(true);
                      setIsExpanded(false);
                    }}
                    className="text-xs text-[var(--pixel-text-muted)] hover:text-[var(--pixel-text-secondary)]"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || explanation.trim().length < 50}
                    className="pixel-btn pixel-btn-primary pixel-btn-sm"
                  >
                    {isPending ? (
                      <PixelSpinner size={4} />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {isPending ? "Thinking…" : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isPending && <EvaluationSteps />}

          {/* Error */}
          {error && (
            <div className="border-2 border-[var(--pixel-error)] bg-[color-mix(in_srgb,var(--pixel-error)_12%,var(--pixel-bg-surface))] p-3 text-sm text-[var(--pixel-error)]">
              {error}
            </div>
          )}

          {/* Gap Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Color-coded segments */}
              <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--pixel-text-muted)]">
                  Gap Analysis
                </h4>
                <div className="space-y-2">
                  {analysis.segments.map((seg, i) => (
                    <div
                      key={i}
                      className={`border-l-4 p-2.5 ${
                        seg.status === "green"
                          ? "border-l-[var(--pixel-success)] bg-[color-mix(in_srgb,var(--pixel-success)_10%,transparent)]"
                          : seg.status === "amber"
                            ? "border-l-[var(--pixel-warning)] bg-[color-mix(in_srgb,var(--pixel-warning)_10%,transparent)]"
                            : "border-l-[var(--pixel-error)] bg-[color-mix(in_srgb,var(--pixel-error)_10%,transparent)]"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        {seg.status === "green" && (
                          <CheckCircle className="h-3.5 w-3.5 text-[var(--pixel-success)]" />
                        )}
                        {seg.status === "amber" && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--pixel-warning)]" />
                        )}
                        {seg.status === "red" && (
                          <XCircle className="h-3.5 w-3.5 text-[var(--pixel-error)]" />
                        )}
                        <span className="text-xs font-medium uppercase text-[var(--pixel-text-muted)]">
                          {seg.status}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--pixel-text-primary)]">
                        &ldquo;{seg.text}&rdquo;
                      </p>
                      <p className="mt-1 text-xs text-[var(--pixel-text-secondary)]">
                        {seg.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Probing Questions */}
              <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--pixel-text-muted)]">
                  <MessageCircleQuestion className="h-3.5 w-3.5 text-[var(--pixel-accent)]" />
                  Probing Questions
                </h4>
                <ul className="space-y-1.5">
                  {analysis.questions.map((q, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[var(--pixel-text-primary)]"
                    >
                      <span className="mt-0.5 text-[var(--pixel-accent)]">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Paraphrase */}
              <div className="border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--pixel-text-muted)]">
                  <Brain className="h-3.5 w-3.5 text-[var(--pixel-accent)]" />
                  How the AI Understood You
                </h4>
                <p className="text-sm italic text-[var(--pixel-text-secondary)]">
                  &ldquo;{analysis.paraphrase}&rdquo;
                </p>
              </div>

              {/* Suggested Cards via VideoCardEditor */}
              {analysis.suggestedCards.length > 0 && (
                <VideoCardEditor
                  cards={analysis.suggestedCards.map((c) => ({
                    front: c.front,
                    back: c.back,
                    offsetSeconds: Math.floor(segmentStart),
                  }))}
                  onSave={onSaveCards}
                  onSeekTo={onSeekTo}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Animated Step Progress for Feynman Evaluation ─────────────────────

function EvaluationSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 4000),
      setTimeout(() => setStep(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    "Reading your explanation...",
    "Comparing with video transcript...",
    "Identifying knowledge gaps...",
    "Generating suggestions...",
  ];

  return (
    <div className="border-2 border-[var(--pixel-border)] bg-[color-mix(in_srgb,var(--pixel-accent)_10%,var(--pixel-bg-surface))] p-3">
      <div className="flex items-center gap-2">
        <PixelSpinner size={5} className="text-[var(--pixel-accent)]" />
        <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
          Evaluating with transcript context...
        </p>
      </div>
      <div className="mt-2 space-y-1">
        {steps.map((label, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
              i <= step ? "opacity-100" : "opacity-30"
            }`}
          >
            {i < step ? (
              <Check className="h-3 w-3 text-[var(--pixel-accent)]" />
            ) : i === step ? (
              <PixelSpinner size={4} className="text-[var(--pixel-accent)]" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-[var(--pixel-border-light)]" />
            )}
            <span
              className={
                i <= step
                  ? "text-[var(--pixel-text-secondary)]"
                  : "text-[var(--pixel-text-muted)]"
              }
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
