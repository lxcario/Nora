"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { generateSuggestedQuestions } from "../../_actions/rag";

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

  const papersKey = papers.map(p => p.id).join(",");

  // Load suggested questions when papers are available or scope changes
  useEffect(() => {
    // Determine which paper to generate suggestions for
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
      if (result.data) {
        setSuggestedQuestions(result.data);
      }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Suggested questions */}
      {(suggestedQuestions.length > 0 || loadingSuggestions) && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Try asking:
          </p>
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
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
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
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
        <BookOpen className="h-4 w-4 flex-shrink-0 text-zinc-400" />
        <select
          value={scopeValue}
          onChange={(e) => setScopeValue(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
      <div className="relative">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your papers…"
          rows={3}
          maxLength={550}
          className={`w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500 ${
            isTooLong
              ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
              : "border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700"
          }`}
        />

        {/* Character count */}
        <div className="mt-1 flex items-center justify-between">
          {isTooShort && (
            <span className="text-xs text-amber-500">
              Minimum 3 characters required
            </span>
          )}
          {isTooLong && (
            <span className="text-xs text-red-500">
              Exceeds 500 character limit
            </span>
          )}
          {!isTooShort && !isTooLong && <span />}

          <span
            className={`text-xs ${
              isTooLong
                ? "text-red-500"
                : charCount >= 450
                  ? "text-amber-500"
                  : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {charCount}/500
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        <Search className="h-4 w-4" />
        {isLoading ? "Searching…" : "Ask"}
      </button>
    </form>
  );
}
