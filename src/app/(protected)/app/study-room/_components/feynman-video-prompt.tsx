"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  Send,
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageCircleQuestion,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
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
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-900/10">
      {/* Header — collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            Explain What You Just Watched
          </span>
          {analysis && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Completed
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-violet-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-violet-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Explanation textarea */}
          {!analysis && (
            <div>
              <p className="mb-2 text-xs text-violet-600 dark:text-violet-400">
                Use the Feynman technique: explain the concept in your own words
                as if teaching someone else. Minimum 50 characters.
              </p>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={5}
                placeholder="Explain what you just learned in your own words..."
                className="block w-full resize-y rounded-md border border-violet-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 dark:border-violet-700 dark:bg-zinc-800"
                disabled={isPending}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-zinc-400">
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
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || explanation.trim().length < 50}
                    className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {isPending ? "Evaluating..." : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isPending && <EvaluationSteps />}

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Gap Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Color-coded segments */}
              <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                  Gap Analysis
                </h4>
                <div className="space-y-2">
                  {analysis.segments.map((seg, i) => (
                    <div
                      key={i}
                      className={`rounded-md border-l-4 p-2.5 ${
                        seg.status === "green"
                          ? "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                          : seg.status === "amber"
                            ? "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10"
                            : "border-l-red-500 bg-red-50 dark:bg-red-900/10"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        {seg.status === "green" && (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        {seg.status === "amber" && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        {seg.status === "red" && (
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                        )}
                        <span className="text-xs font-medium uppercase text-zinc-500">
                          {seg.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        &ldquo;{seg.text}&rdquo;
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {seg.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Probing Questions */}
              <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500">
                  <MessageCircleQuestion className="h-3.5 w-3.5 text-indigo-500" />
                  Probing Questions
                </h4>
                <ul className="space-y-1.5">
                  {analysis.questions.map((q, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="mt-0.5 text-indigo-500">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Paraphrase */}
              <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500">
                  <Brain className="h-3.5 w-3.5 text-violet-500" />
                  How the AI Understood You
                </h4>
                <p className="text-sm italic text-zinc-600 dark:text-zinc-400">
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
    <div className="rounded-md border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-900/20">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
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
              <Check className="h-3 w-3 text-violet-500" />
            ) : i === step ? (
              <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-violet-300/50" />
            )}
            <span
              className={
                i <= step
                  ? "text-violet-600 dark:text-violet-300"
                  : "text-violet-400/60"
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
