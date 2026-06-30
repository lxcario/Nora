"use client";

import { useState, useTransition } from "react";
import {
  generateErrorExplanation,
  evaluateSpotterAttempts,
  type ErrorExplanation,
  type ErrorItem,
  type SpotterAttempt,
  type SpotterSessionResult,
} from "@/app/(protected)/app/_actions/error-spotter";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Error Spotter Client — "Find the AI's mistakes"
// ---------------------------------------------------------------------------
// The student reads an AI-generated explanation, highlights text they think is
// wrong, writes why, and submits for scoring. Reveals which errors they found
// and which they missed.
// ---------------------------------------------------------------------------

interface TopicOption {
  id: string;
  name: string;
  subjectName: string;
}

export function ErrorSpotterClient({ topics }: { topics: TopicOption[] }) {
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id ?? "");
  const [challenge, setChallenge] = useState<ErrorExplanation | null>(null);
  const [attempts, setAttempts] = useState<SpotterAttempt[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState("");
  const [currentExplanation, setCurrentExplanation] = useState("");
  const [results, setResults] = useState<SpotterSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGeneration] = useTransition();
  const [isEvaluating, startEvaluation] = useTransition();

  function handleGenerate() {
    setError(null);
    setChallenge(null);
    setAttempts([]);
    setResults(null);
    startGeneration(async () => {
      const res = await generateErrorExplanation(selectedTopic);
      if (res.error) setError(res.error);
      else if (res.data) setChallenge(res.data);
    });
  }

  function handleAddAttempt() {
    if (!currentHighlight.trim() || !currentExplanation.trim()) return;
    setAttempts((prev) => [
      ...prev,
      { highlightedText: currentHighlight.trim(), studentExplanation: currentExplanation.trim() },
    ]);
    setCurrentHighlight("");
    setCurrentExplanation("");
  }

  function handleRemoveAttempt(idx: number) {
    setAttempts((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (!challenge || attempts.length === 0) return;
    startEvaluation(async () => {
      const res = await evaluateSpotterAttempts(attempts, challenge.errors);
      if (res.error) setError(res.error);
      else if (res.data) setResults(res.data);
    });
  }

  function handleTextSelect() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 5) {
      setCurrentHighlight(selection.toString().trim());
    }
  }

  // Topic has no data
  if (topics.length === 0) {
    return (
      <DialogFrame>
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
            Create topics in Settings first, then come back to spot errors.
          </p>
        </div>
      </DialogFrame>
    );
  }

  // ── Results view ──────────────────────────────────────────────────────────
  if (results && challenge) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Score summary */}
        <DialogFrame title="Results">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span
                className="font-pixel text-3xl"
                style={{ color: results.found === results.totalErrors ? "var(--pixel-success)" : "var(--pixel-accent)" }}
              >
                {results.found}/{results.totalErrors}
              </span>
              <span className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
                errors found
              </span>
            </div>
            {results.xpEarned > 0 && (
              <span className="font-pixel text-sm" style={{ color: "var(--pixel-accent)" }}>
                +{results.xpEarned} XP
              </span>
            )}
          </div>

          {/* Each attempt verdict */}
          <div className="space-y-3">
            {results.attempts.map(({ attempt, result }, i) => (
              <div
                key={i}
                className="px-3 py-2 border-l-4"
                style={{
                  borderLeftColor: result.verdict === "correct"
                    ? "var(--pixel-success)"
                    : result.verdict === "partial"
                      ? "var(--pixel-warning)"
                      : "var(--pixel-error)",
                  backgroundColor: "var(--pixel-bg-secondary)",
                }}
              >
                <p className="text-xs font-pixel mb-1" style={{
                  color: result.verdict === "correct" ? "var(--pixel-success)"
                    : result.verdict === "partial" ? "var(--pixel-warning)"
                    : "var(--pixel-error)"
                }}>
                  {result.verdict === "correct" ? "✓ Correct!" : result.verdict === "partial" ? "◐ Partial" : "✗ False alarm"}
                </p>
                <p className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                  You highlighted: &ldquo;{attempt.highlightedText.slice(0, 80)}&rdquo;
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--pixel-text-primary)" }}>
                  {result.feedback}
                </p>
              </div>
            ))}
          </div>

          {/* Missed errors */}
          {results.missed.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: "var(--pixel-border)" }}>
              <p className="font-pixel text-[10px] mb-2" style={{ color: "var(--pixel-text-secondary)" }}>
                ERRORS YOU MISSED
              </p>
              {results.missed.map((err, i) => (
                <div key={i} className="mb-2 px-3 py-2" style={{ backgroundColor: "var(--pixel-bg-elevated)" }}>
                  <p className="text-xs" style={{ color: "var(--pixel-error)" }}>
                    &ldquo;{err.errorText}&rdquo;
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--pixel-text-secondary)" }}>
                    <strong>Correct:</strong> {err.correction}
                  </p>
                  <p className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                    {err.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogFrame>

        {/* Try again */}
        <div className="flex justify-center">
          <PixelButton variant="primary" onClick={handleGenerate}>
            Try another challenge
          </PixelButton>
        </div>
      </div>
    );
  }

  // ── Challenge view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Topic selector + generate */}
      {!challenge && (
        <DialogFrame title="Choose a topic">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <label className="flex-1">
              <span className="font-pixel text-[9px] block mb-1" style={{ color: "var(--pixel-text-secondary)" }}>
                Topic
              </span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subjectName} → {t.name}
                  </option>
                ))}
              </select>
            </label>
            <PixelButton
              variant="primary"
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={isGenerating || !selectedTopic}
            >
              {isGenerating ? "Generating..." : "Generate challenge"}
            </PixelButton>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--pixel-text-muted)" }}>
            The AI will write an explanation of this topic with hidden mistakes for you to find.
            Difficulty adapts to your Feynman scores.
          </p>
        </DialogFrame>
      )}

      {error && (
        <div className="text-sm px-3 py-2" style={{ color: "var(--pixel-error)", border: "2px solid var(--pixel-error)", backgroundColor: "var(--pixel-bg-secondary)" }}>
          {error}
        </div>
      )}

      {/* The explanation with errors */}
      {challenge && !results && (
        <>
          <DialogFrame title={`Spot the errors in: ${challenge.topicName}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-pixel text-[9px] px-2 py-0.5" style={{ border: "1px solid var(--pixel-border)", color: "var(--pixel-text-muted)" }}>
                Difficulty {challenge.difficulty}/5
              </span>
              <span className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
                Select text you think is wrong, then explain why below
              </span>
            </div>

            {/* Selectable text */}
            <div
              className="text-sm leading-relaxed px-4 py-3 select-text cursor-text"
              style={{
                backgroundColor: "var(--pixel-bg-primary)",
                border: "2px solid var(--pixel-border)",
                color: "var(--pixel-text-primary)",
                lineHeight: "1.8",
              }}
              onMouseUp={handleTextSelect}
              onTouchEnd={handleTextSelect}
            >
              {challenge.text}
            </div>
          </DialogFrame>

          {/* Highlight input */}
          <DialogFrame title="Mark an error">
            <div className="space-y-3">
              <div>
                <label className="font-pixel text-[9px] block mb-1" style={{ color: "var(--pixel-text-secondary)" }}>
                  Highlighted text (select from above, or type/paste)
                </label>
                <input
                  type="text"
                  value={currentHighlight}
                  onChange={(e) => setCurrentHighlight(e.target.value)}
                  placeholder="Select text from the explanation above..."
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="font-pixel text-[9px] block mb-1" style={{ color: "var(--pixel-text-secondary)" }}>
                  Why is this wrong?
                </label>
                <textarea
                  value={currentExplanation}
                  onChange={(e) => setCurrentExplanation(e.target.value)}
                  placeholder="Explain what's incorrect and what the correct version should be..."
                  rows={3}
                  className="w-full text-sm resize-y"
                />
              </div>
              <PixelButton
                variant="secondary"
                size="small"
                onClick={handleAddAttempt}
                disabled={!currentHighlight.trim() || !currentExplanation.trim()}
              >
                + Add this error
              </PixelButton>
            </div>
          </DialogFrame>

          {/* Current attempts */}
          {attempts.length > 0 && (
            <DialogFrame title={`Your findings (${attempts.length})`}>
              <div className="space-y-2">
                {attempts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2"
                    style={{ backgroundColor: "var(--pixel-bg-elevated)", border: "1px solid var(--pixel-border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--pixel-text-primary)" }}>
                        &ldquo;{a.highlightedText.slice(0, 60)}&rdquo;
                      </p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--pixel-text-muted)" }}>
                        {a.studentExplanation.slice(0, 80)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAttempt(i)}
                      className="text-[var(--pixel-text-muted)] hover:text-[var(--pixel-error)] shrink-0 text-sm"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </DialogFrame>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
              {attempts.length === 0 ? "Find at least one error to submit" : `${attempts.length} error${attempts.length === 1 ? "" : "s"} marked`}
            </span>
            <PixelButton
              variant="primary"
              onClick={handleSubmit}
              loading={isEvaluating}
              disabled={isEvaluating || attempts.length === 0}
            >
              {isEvaluating ? "Checking..." : "Submit for grading"}
            </PixelButton>
          </div>
        </>
      )}
    </div>
  );
}
