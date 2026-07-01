"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Sparkles } from "lucide-react";
import { generateSuggestedQuestions } from "../../_actions/rag";
import { PixelSpinner } from "@/components/pixel-ui";

interface RagQueryPanelProps {
  papers: { id: string; title: string; topicId: string | null }[];
  topics: { id: string; name: string }[];
  onQuery: (
    question: string,
    scope: { type: "all" | "paper" | "topic"; paperId?: string; topicId?: string }
  ) => void;
  isLoading?: boolean;
}

export function RagQueryPanel({ papers, topics, onQuery, isLoading = false }: RagQueryPanelProps) {
  const [question, setQuestion] = useState("");
  const [scopeValue, setScopeValue] = useState("all");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const charCount = question.length;
  const isTooShort = charCount > 0 && charCount < 3;
  const isTooLong = charCount > 500;
  const isValid = charCount >= 3 && charCount <= 500;
  const isDisabled = !isValid || isLoading;

  const papersKey = papers.map((p) => p.id).join(",");

  // Load suggested questions when papers are available or scope changes
  useEffect(() => {
    let targetPaperId: string | null = null;

    if (scopeValue.startsWith("paper:")) {
      targetPaperId = scopeValue.replace("paper:", "");
    } else if (papers.length > 0) {
      targetPaperId = papers[0].id;
    }

    if (!targetPaperId) {
      setSuggestedQuestions([]);
      return;
    }

    setLoadingSuggestions(true);
    setSuggestedQuestions([]);
    generateSuggestedQuestions(targetPaperId).then((result) => {
      if (result.data) setSuggestedQuestions(result.data);
      setLoadingSuggestions(false);
    });
  }, [scopeValue, papersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function getScope(): { type: "all" | "paper" | "topic"; paperId?: string; topicId?: string } {
    if (scopeValue.startsWith("paper:")) {
      return { type: "paper", paperId: scopeValue.replace("paper:", "") };
    }
    if (scopeValue.startsWith("topic:")) {
      return { type: "topic", topicId: scopeValue.replace("topic:", "") };
    }
    return { type: "all" };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDisabled) return;
    onQuery(question, getScope());
  }

  if (papers.length === 0) {
    return (
      <p className="text-sm text-[var(--pixel-text-muted)]">
        No indexed papers yet. Upload a PDF above and wait for it to reach
        &ldquo;Ready&rdquo; before asking questions.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Suggested questions */}
      {(suggestedQuestions.length > 0 || loadingSuggestions) && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--pixel-text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--pixel-accent)]" />
            Try asking:
          </p>
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-xs text-[var(--pixel-text-muted)]">
              <PixelSpinner size={4} />
              Generating questions from your paper...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuestion(q);
                    onQuery(q, getScope());
                  }}
                  className="rounded-full !px-3 !py-1 text-xs"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--pixel-accent) 12%, transparent)",
                    borderColor: "var(--pixel-accent)",
                    color: "var(--pixel-accent)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scope selector */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 flex-shrink-0 text-[var(--pixel-text-muted)]" />
        <select
          value={scopeValue}
          onChange={(e) => setScopeValue(e.target.value)}
          className="w-full text-sm"
        >
          <option value="all">All papers</option>
          {topics.map((topic) => (
            <option key={topic.id} value={`topic:${topic.id}`}>
              Topic: {topic.name}
            </option>
          ))}
          {papers.map((paper) => (
            <option key={paper.id} value={`paper:${paper.id}`}>
              {paper.title}
            </option>
          ))}
        </select>
      </div>

      {/* Question textarea */}
      <div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your papers…"
          rows={3}
          maxLength={550}
          className="w-full resize-none text-sm"
          style={{
            borderColor: isTooLong ? "var(--pixel-error)" : undefined,
          }}
        />

        <div className="mt-1 flex items-center justify-between">
          {isTooShort && (
            <span className="text-xs text-[var(--pixel-warning)]">
              Minimum 3 characters required
            </span>
          )}
          {isTooLong && (
            <span className="text-xs text-[var(--pixel-error)]">
              Exceeds 500 character limit
            </span>
          )}
          {!isTooShort && !isTooLong && <span />}

          <span
            className="text-xs"
            style={{
              color: isTooLong
                ? "var(--pixel-error)"
                : charCount >= 450
                ? "var(--pixel-warning)"
                : "var(--pixel-text-muted)",
            }}
          >
            {charCount}/500
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className="inline-flex w-full items-center justify-center gap-2 !bg-[var(--pixel-accent)] !text-[var(--pixel-bg-primary)] hover:!brightness-110"
      >
        {isLoading ? <PixelSpinner size={5} /> : <Search className="h-4 w-4" />}
        {isLoading ? "Searching…" : "Ask"}
      </button>
    </form>
  );
}
