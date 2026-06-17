"use client";

import { useState } from "react";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";
import { queryRag, type RagAnswer } from "@/app/(protected)/app/_actions/rag";

const SUGGESTED = [
  "When do finals start?",
  "When is the add/drop deadline?",
  "When does the semester start?",
  "What's in my curriculum?",
];

/**
 * "Ask about my semester" — academic-scoped Q&A (Requirement 16.2, 16.3).
 * Date questions are answered from the structured, status-labelled events;
 * curriculum questions cite indexed documents. Unreleased/unknown answers are
 * explicit, never guessed.
 */
export function AcademicAskPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<RagAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    const res = await queryRag(text, { type: "academic" });
    setLoading(false);
    if (res.error) setError(res.error);
    else if (res.data) setAnswer(res.data);
  }

  return (
    <DialogFrame title="ASK ABOUT YOUR SEMESTER">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask(question);
            }}
            placeholder="e.g. When do finals start?"
            maxLength={500}
            className="flex-1 border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)] px-3 py-2 text-sm text-[var(--pixel-text-primary)] outline-none focus:shadow-[0_0_0_2px_var(--pixel-accent)]"
          />
          <PixelButton onClick={() => ask(question)} loading={loading}>
            Ask
          </PixelButton>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-accent)] hover:border-[var(--pixel-accent)]"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--pixel-error)" }} role="alert">
            {error}
          </p>
        )}

        {answer && (
          <div className="pixel-panel pixel-panel-inset p-3 space-y-2">
            <p className="text-sm text-[var(--pixel-text-primary)] whitespace-pre-wrap">
              {answer.answer}
            </p>
            {answer.citations.length > 0 && (
              <div className="pt-2 border-t-2 border-[var(--pixel-border)]">
                <p className="font-pixel text-[9px] text-[var(--pixel-text-secondary)] mb-1">
                  SOURCES
                </p>
                <ul className="space-y-1">
                  {answer.citations.map((c, i) => (
                    <li key={i} className="text-[10px] text-[var(--pixel-text-secondary)] italic">
                      “{c.snippet}” — {c.sectionHeading || c.paperTitle}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DialogFrame>
  );
}
