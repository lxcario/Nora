"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import type { RagAnswer, Citation } from "../../_actions/rag";

interface RagAnswerDisplayProps {
  answer: RagAnswer;
}

export function RagAnswerDisplay({ answer }: RagAnswerDisplayProps) {
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);

  if (!answer.answer) return null;

  const hasCitations = answer.citations.length > 0;

  return (
    <div className="space-y-4">
      {/* Answer with "From your papers" label */}
      <div className="rounded-lg border-2 border-indigo-200 bg-white p-5 dark:border-indigo-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-500" />
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            From your papers
          </span>
        </div>

        {/* Answer text with inline citation superscripts */}
        <div className="prose prose-sm max-w-none text-zinc-700 dark:text-zinc-300">
          <AnswerWithCitations text={answer.answer} citations={answer.citations} />
        </div>
      </div>

      {/* Citations panel */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {hasCitations
            ? `Sources (${answer.citations.length})`
            : "Sources"}
        </h4>

        {!hasCitations && (
          <div className="flex items-center gap-2 rounded-md bg-zinc-50 p-3 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            No source snippets are available for this answer.
          </div>
        )}

        {hasCitations && (
          <div className="space-y-2">
            {answer.citations.slice(0, 20).map((citation, i) => (
              <div key={i} className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800">
                <button
                  onClick={() =>
                    setExpandedCitation(expandedCitation === i ? null : i)
                  }
                  className="flex w-full items-start justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {citation.paperTitle}
                      </span>
                    </div>
                    {citation.sectionHeading && (
                      <p className="mt-0.5 pl-7 text-xs text-zinc-500 dark:text-zinc-400">
                        § {citation.sectionHeading}
                      </p>
                    )}
                  </div>
                  {expandedCitation === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                  )}
                </button>

                {expandedCitation === i && (
                  <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                    <SnippetContent text={citation.snippet} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders the answer text with inline citation superscripts.
 * Detects [Paper Title, Section] patterns and replaces with numbered superscripts.
 */
function AnswerWithCitations({
  text,
  citations,
}: {
  text: string;
  citations: Citation[];
}) {
  // Match citation patterns like [Paper Title, Section]
  const citationPattern = /\[([^\]]+)\]/g;
  const parts: (string | { index: number })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Build a map of "PaperTitle, Section" -> index
  const citationMap = new Map<string, number>();
  citations.forEach((c, i) => {
    const key = `${c.paperTitle}, ${c.sectionHeading}`.toLowerCase();
    citationMap.set(key, i + 1);
    // Also map just the paper title
    citationMap.set(c.paperTitle.toLowerCase(), i + 1);
  });

  let citationCounter = 0;

  while ((match = citationPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const citText = match[1].toLowerCase();
    let citIndex = citationMap.get(citText);
    if (!citIndex) {
      // Try partial match
      for (const [key, idx] of citationMap) {
        if (citText.includes(key) || key.includes(citText)) {
          citIndex = idx;
          break;
        }
      }
    }

    if (citIndex) {
      parts.push({ index: citIndex });
    } else {
      citationCounter++;
      parts.push({ index: citationCounter });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <div className="leading-relaxed">
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>
            {part.split("\n").map((line, li, arr) => (
              <span key={li}>
                {line}
                {li < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        ) : (
          <sup
            key={i}
            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded bg-indigo-100 text-[9px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
            aria-label={`Citation ${part.index}`}
          >
            {part.index}
          </sup>
        )
      )}
    </div>
  );
}

/**
 * Renders a snippet with "show more" functionality for text > 500 chars.
 */
function SnippetContent({ text }: { text: string }) {
  const [showFull, setShowFull] = useState(false);
  const isLong = text.length > 500;
  const displayText = showFull || !isLong ? text : text.slice(0, 500);

  return (
    <div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {displayText}
        {isLong && !showFull && "…"}
      </p>
      {isLong && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {showFull ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
