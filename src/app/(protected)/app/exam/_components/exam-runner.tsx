"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  submitExam,
  type ExamQuestion,
  type ExamAnswer,
} from "@/app/(protected)/app/_actions/exam";
import {
  DialogFrame,
  PixelButton,
  PixelProgressBar,
  PixelConfirmDialog,
} from "@/components/pixel-ui";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ExamRunnerProps {
  examId: string;
  questions: ExamQuestion[];
  timeLimit: number; // seconds, 0 = no timer
  title: string;
}

// ─── Difficulty badge colors ────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  easy: "var(--pixel-success)",
  medium: "var(--pixel-warning)",
  hard: "var(--pixel-error)",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ExamRunner({ examId, questions, timeLimit, title }: ExamRunnerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Current question index
  const [currentIdx, setCurrentIdx] = useState(0);

  // Answers map: questionId → answer string
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Confirm submit dialog
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Timer logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLimit <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time's up — auto-submit
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimit]);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, questions.length - 1)));
  }, [questions.length]);

  // ─── Answer handling ────────────────────────────────────────────────────
  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  // ─── Submit ─────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);

    const examAnswers: ExamAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));

    startTransition(async () => {
      const result = await submitExam(examId, examAnswers);
      if (result.data) {
        router.push(`/app/exam/${examId}/results`);
      }
    });
  }

  // ─── Derived state ─────────────────────────────────────────────────────
  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;
  const unansweredCount = questions.length - answeredCount;

  // Format timer
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerColor =
    secondsLeft <= 60
      ? "var(--pixel-error)"
      : secondsLeft <= 5 * 60
        ? "var(--pixel-warning)"
        : "var(--pixel-text-primary)";

  return (
    <div className="space-y-4">
      {/* Confirm dialog */}
      <PixelConfirmDialog
        open={showConfirm}
        title="Submit exam?"
        message={
          unansweredCount > 0
            ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Unanswered questions will be marked incorrect.`
            : "All questions answered. Ready to submit?"
        }
        confirmLabel="Submit"
        cancelLabel="Keep working"
        variant={unansweredCount > 0 ? "danger" : undefined}
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Header: title + timer + progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-pixel text-sm truncate" style={{ color: "var(--pixel-text-primary)" }}>
            {title}
          </h1>
          <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
            Question {currentIdx + 1} of {questions.length} · {answeredCount} answered
          </span>
        </div>

        {timeLimit > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="h-4 w-4" style={{ color: timerColor }} />
            <span className="font-pixel text-sm tabular-nums" style={{ color: timerColor }}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <PixelProgressBar value={answeredCount} max={questions.length} variant="xp" />

      {/* Question dots (mini nav) */}
      <div className="flex flex-wrap gap-1">
        {questions.map((q, i) => {
          const isAnswered = !!answers[q.id]?.trim();
          const isCurrent = i === currentIdx;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => goTo(i)}
              className="w-6 h-6 flex items-center justify-center font-pixel text-[9px] transition-colors"
              style={{
                border: isCurrent ? "2px solid var(--pixel-accent)" : "1px solid var(--pixel-border)",
                backgroundColor: isAnswered ? "var(--pixel-accent)" : "var(--pixel-bg-secondary)",
                color: isAnswered ? "#fff" : "var(--pixel-text-secondary)",
              }}
              title={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Current question */}
      <DialogFrame>
        {/* Question header */}
        <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "2px solid var(--pixel-border)" }}>
          <span
            className="font-pixel text-[9px] px-1.5 py-0.5"
            style={{
              color: DIFF_COLORS[currentQ.difficulty] ?? "var(--pixel-text-secondary)",
              border: `1px solid ${DIFF_COLORS[currentQ.difficulty] ?? "var(--pixel-border)"}`,
            }}
          >
            {currentQ.difficulty.toUpperCase()}
          </span>
          <span className="font-pixel text-[9px] px-1.5 py-0.5" style={{ color: "var(--pixel-text-secondary)", border: "1px solid var(--pixel-border)" }}>
            {currentQ.type === "mcq" ? "MCQ" : currentQ.type === "short_answer" ? "SHORT" : "EXPLAIN"}
          </span>
          {currentQ.sourceSection && (
            <span className="text-[10px] truncate" style={{ color: "var(--pixel-text-muted)" }}>
              From: {currentQ.sourceSection}
            </span>
          )}
        </div>

        {/* Question text */}
        <p className="text-base mb-5" style={{ color: "var(--pixel-text-primary)", lineHeight: 1.6 }}>
          {currentQ.question}
        </p>

        {/* Answer input */}
        {currentQ.type === "mcq" && currentQ.options && (
          <div className="space-y-2">
            {currentQ.options.map((option, oi) => {
              const isSelected = answers[currentQ.id] === String(oi);
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => setAnswer(currentQ.id, String(oi))}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                  style={{
                    border: isSelected ? "2px solid var(--pixel-accent)" : "2px solid var(--pixel-border)",
                    backgroundColor: isSelected ? "color-mix(in srgb, var(--pixel-accent) 12%, var(--pixel-bg-surface))" : "var(--pixel-bg-secondary)",
                    color: "var(--pixel-text-primary)",
                  }}
                >
                  <span
                    className="font-pixel text-xs w-6 h-6 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: isSelected ? "var(--pixel-accent)" : "var(--pixel-bg-primary)",
                      color: isSelected ? "#fff" : "var(--pixel-text-secondary)",
                      border: "1px solid var(--pixel-border)",
                    }}
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-sm">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {currentQ.type === "short_answer" && (
          <textarea
            value={answers[currentQ.id] ?? ""}
            onChange={(e) => setAnswer(currentQ.id, e.target.value)}
            placeholder="Type your answer (1-2 sentences)..."
            rows={3}
            className="w-full text-sm resize-y"
            style={{
              backgroundColor: "var(--pixel-bg-primary)",
              border: "2px solid var(--pixel-border)",
              color: "var(--pixel-text-primary)",
              padding: "12px",
            }}
          />
        )}

        {currentQ.type === "explain" && (
          <textarea
            value={answers[currentQ.id] ?? ""}
            onChange={(e) => setAnswer(currentQ.id, e.target.value)}
            placeholder="Explain in detail (3-5 sentences)..."
            rows={6}
            className="w-full text-sm resize-y"
            style={{
              backgroundColor: "var(--pixel-bg-primary)",
              border: "2px solid var(--pixel-border)",
              color: "var(--pixel-text-primary)",
              padding: "12px",
            }}
          />
        )}
      </DialogFrame>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between gap-3">
        <PixelButton
          variant="secondary"
          size="small"
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </PixelButton>

        {currentIdx < questions.length - 1 ? (
          <PixelButton
            variant="primary"
            size="small"
            onClick={() => goTo(currentIdx + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </PixelButton>
        ) : (
          <PixelButton
            variant="success"
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            loading={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Grading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Submit Exam
              </span>
            )}
          </PixelButton>
        )}
      </div>

      {/* Warning: time low */}
      {timeLimit > 0 && secondsLeft <= 60 && secondsLeft > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs animate-pulse"
          style={{
            color: "var(--pixel-error)",
            border: "2px solid var(--pixel-error)",
            backgroundColor: "color-mix(in srgb, var(--pixel-error) 10%, var(--pixel-bg-surface))",
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Less than 1 minute remaining. Exam will auto-submit when time expires.
        </div>
      )}
    </div>
  );
}
