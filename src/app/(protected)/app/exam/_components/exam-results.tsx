"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createCardsFromMissed,
  type ExamQuestion,
} from "@/app/(protected)/app/_actions/exam";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";
import {
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MinusCircle,
  Layers,
  ArrowLeft,
  Check,
} from "lucide-react";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ExamResultsProps {
  examId: string;
  title: string;
  questions: ExamQuestion[];
  scorePercent: number;
  topicScores: Record<string, { correct: number; total: number }>;
}

// ─── Score tier config ──────────────────────────────────────────────────────

function getScoreTier(pct: number) {
  if (pct >= 90) return { label: "Excellent!", color: "var(--pixel-success)", icon: Trophy };
  if (pct >= 70) return { label: "Good work", color: "var(--pixel-accent)", icon: Target };
  if (pct >= 50) return { label: "Getting there", color: "var(--pixel-warning)", icon: Target };
  return { label: "Needs more study", color: "var(--pixel-error)", icon: AlertTriangle };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExamResults({
  examId,
  title,
  questions,
  scorePercent,
  topicScores,
}: ExamResultsProps) {
  const [isPending, startTransition] = useTransition();
  const [cardsSaved, setCardsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tier = getScoreTier(scorePercent);
  const TierIcon = tier.icon;

  // Identify missed questions (those without full score)
  // We know MCQ correct if correctIndex matches; for others we rely on the score stored server-side.
  // Since we have the full questions (with answers after submission), we can show them.
  const missedQuestionIds = questions
    .filter((q) => {
      // After submission, questions include correctIndex / modelAnswer
      // We don't have per-question score on the client, so show all as reviewable
      return q.modelAnswer || q.correctIndex !== undefined;
    })
    .map((q) => q.id);

  // Section breakdown entries
  const sections = Object.entries(topicScores).sort(
    ([, a], [, b]) => a.correct / a.total - b.correct / b.total
  );

  function handleSaveCards() {
    setSaveError(null);
    startTransition(async () => {
      // Save cards from ALL questions (user can review them all)
      const result = await createCardsFromMissed(examId, missedQuestionIds);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setCardsSaved(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Score hero */}
      <div className="pixel-panel flex flex-col items-center gap-4 py-8 text-center">
        <TierIcon className="h-12 w-12" style={{ color: tier.color }} />
        <div>
          <p className="font-pixel text-3xl" style={{ color: tier.color }}>
            {scorePercent}%
          </p>
          <p className="font-pixel text-sm mt-1" style={{ color: tier.color }}>
            {tier.label}
          </p>
        </div>
        <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
          {title}
        </p>
      </div>

      {/* Section breakdown (gap analysis) */}
      {sections.length > 0 && (
        <DialogFrame title="GAP ANALYSIS — BY SECTION">
          <p className="text-xs mb-3" style={{ color: "var(--pixel-text-secondary)" }}>
            Sections sorted weakest-first. Focus your review on the top items.
          </p>
          <div className="space-y-2">
            {sections.map(([section, { correct, total }]) => {
              const pct = Math.round((correct / total) * 100);
              const barColor =
                pct >= 80
                  ? "var(--pixel-success)"
                  : pct >= 50
                    ? "var(--pixel-warning)"
                    : "var(--pixel-error)";
              return (
                <div key={section} className="flex items-center gap-3">
                  <span
                    className="w-36 text-sm truncate"
                    style={{ color: "var(--pixel-text-primary)" }}
                    title={section}
                  >
                    {section}
                  </span>
                  <div className="flex-1 h-3 overflow-hidden" style={{ backgroundColor: "var(--pixel-bg-secondary)", border: "1px solid var(--pixel-border)" }}>
                    <div
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span
                    className="w-16 text-right text-xs font-pixel"
                    style={{ color: barColor }}
                  >
                    {correct}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogFrame>
      )}

      {/* Question-by-question review */}
      <DialogFrame title="QUESTION REVIEW">
        <div className="space-y-4">
          {questions.map((q, i) => (
            <QuestionReviewItem key={q.id} question={q} index={i + 1} />
          ))}
        </div>
      </DialogFrame>

      {/* Save missed as flashcards */}
      <DialogFrame title="CREATE FLASHCARDS">
        <p className="text-xs mb-3" style={{ color: "var(--pixel-text-secondary)" }}>
          Turn exam questions into flashcards for spaced repetition review.
        </p>
        {saveError && (
          <p className="text-xs mb-2" style={{ color: "var(--pixel-error)" }}>{saveError}</p>
        )}
        {cardsSaved ? (
          <div className="flex items-center gap-2" style={{ color: "var(--pixel-success)" }}>
            <Check className="h-4 w-4" />
            <span className="text-sm font-pixel">Cards saved to your review queue!</span>
          </div>
        ) : (
          <PixelButton
            variant="success"
            onClick={handleSaveCards}
            disabled={isPending}
            loading={isPending}
          >
            <Layers className="h-4 w-4" />
            Save All as Flashcards
          </PixelButton>
        )}
      </DialogFrame>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/exam">
          <PixelButton variant="secondary" size="small">
            <ArrowLeft className="h-4 w-4" />
            Back to Exams
          </PixelButton>
        </Link>
        <Link href="/app/exam">
          <PixelButton variant="primary">
            Take Another Exam
          </PixelButton>
        </Link>
      </div>
    </div>
  );
}

// ─── Per-question review item ───────────────────────────────────────────────

function QuestionReviewItem({ question, index }: { question: ExamQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="p-3"
      style={{
        backgroundColor: "var(--pixel-bg-secondary)",
        border: "1px solid var(--pixel-border)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-2"
      >
        <span
          className="font-pixel text-[10px] mt-0.5 shrink-0"
          style={{ color: "var(--pixel-text-muted)" }}
        >
          Q{index}
        </span>
        <span className="text-sm flex-1" style={{ color: "var(--pixel-text-primary)" }}>
          {question.question}
        </span>
        <span className="text-xs shrink-0" style={{ color: "var(--pixel-text-muted)" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pl-7 space-y-2">
          {/* MCQ: show correct option */}
          {question.type === "mcq" && question.options && (
            <div className="space-y-1">
              {question.options.map((opt, oi) => {
                const isCorrect = oi === question.correctIndex;
                return (
                  <div
                    key={oi}
                    className="flex items-center gap-2 text-sm px-2 py-1"
                    style={{
                      backgroundColor: isCorrect ? "color-mix(in srgb, var(--pixel-success) 12%, transparent)" : undefined,
                      color: isCorrect ? "var(--pixel-success)" : "var(--pixel-text-secondary)",
                    }}
                  >
                    {isCorrect ? (
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 opacity-40" />
                    )}
                    <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Short answer / explain: show model answer */}
          {(question.type === "short_answer" || question.type === "explain") && question.modelAnswer && (
            <div className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
              <span className="font-pixel text-[9px] block mb-1" style={{ color: "var(--pixel-success)" }}>
                MODEL ANSWER:
              </span>
              {question.modelAnswer}
            </div>
          )}

          {/* Source section */}
          {question.sourceSection && (
            <p className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
              Source: {question.sourceSection}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
