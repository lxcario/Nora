"use client";

import { useState, useEffect, useTransition } from "react";
import {
  performResearch,
  createCardsFromResearch,
  type ResearchResult,
  type ResearchSource,
} from "@/app/(protected)/app/_actions/research";
import {
  queryRag,
  retryIngestion,
  deleteFullPaper,
  ingestFromUrl,
  getUserPapers,
  type RagAnswer,
  type RagScope,
} from "@/app/(protected)/app/_actions/rag";
import {
  Search,
  Loader2,
  BookOpen,
  Globe,
  ExternalLink,
  Layers,
  Check,
  Brain,
} from "lucide-react";
import { ResearchModeToggle } from "./research-mode-toggle";
import { PaperUpload } from "./paper-upload";
import { PaperLibrary } from "./paper-library";
import { RagQueryPanel } from "./rag-query-panel";
import { RagAnswerDisplay } from "./rag-answer-display";
import { CardFromRag } from "./card-from-rag";

interface TopicOption {
  id: string;
  name: string;
  subjectName: string;
}

interface Paper {
  id: string;
  title: string;
  parseStatus: "pending" | "processing" | "ready" | "partial" | "failed";
  parseError: string | null;
  chunkCount: number;
  url: string | null;
  createdAt: string;
  topicId: string | null;
}

export function ResearchDesk({ topics }: { topics: TopicOption[] }) {
  // Mode toggle state
  const [mode, setMode] = useState<"web" | "papers">("web");

  // --- Web research state (unchanged) ---
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id ?? "");
  const [cardsSaved, setCardsSaved] = useState(false);

  // --- Papers / RAG state ---
  const [papers, setPapers] = useState<Paper[]>([]);
  const [ragAnswer, setRagAnswer] = useState<RagAnswer | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  // Fetch papers when switching to "papers" mode
  useEffect(() => {
    if (mode === "papers") {
      fetchPapers();
    }
  }, [mode]);

  async function fetchPapers() {
    try {
      const res = await getUserPapers();
      setPapers(res.papers ?? []);
    } catch {
      // Silently fail; papers list will be empty
    }
  }

  // --- Web research handlers (unchanged) ---
  function handleResearch() {
    setError(null);
    setResult(null);
    setCardsSaved(false);

    startTransition(async () => {
      const res = await performResearch(query);
      if (res.error) setError(res.error);
      if (res.data) setResult(res.data);
    });
  }

  function handleSaveCards() {
    if (!result?.suggestedCards.length) return;
    startTransition(async () => {
      const res = await createCardsFromResearch(selectedTopic, result.suggestedCards);
      if (res.success) setCardsSaved(true);
      if (res.error) setError(res.error);
    });
  }

  // --- RAG handlers ---
  async function handleRagQuery(
    question: string,
    scope: { type: "all" | "paper" | "topic"; paperId?: string; topicId?: string }
  ) {
    setRagLoading(true);
    setRagError(null);
    setRagAnswer(null);

    try {
      const res = await queryRag(question, scope as RagScope);
      if (res.error) {
        setRagError(res.error);
      }
      if (res.data) {
        setRagAnswer(res.data);
      }
    } catch (err) {
      setRagError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setRagLoading(false);
    }
  }

  async function handleRetry(paperId: string) {
    const res = await retryIngestion(paperId);
    if (res.error) {
      // Could show toast; for now just refresh list
    }
    fetchPapers();
  }

  async function handleDelete(paperId: string) {
    const res = await deleteFullPaper(paperId);
    if (res.error && !res.success) {
      // Could show toast; for now just refresh list
    }
    fetchPapers();
  }

  async function handleIngestUrl(paperId: string) {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper?.url) return;
    await ingestFromUrl(paper.url, paperId);
    fetchPapers();
  }

  function handleUploadComplete(_paperId: string) {
    fetchPapers();
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle at the top */}
      <ResearchModeToggle mode={mode} onModeChange={setMode} />

      {/* Web research mode (existing UI, completely unchanged) */}
      {mode === "web" && (
        <div className="space-y-6">
          {/* Research input */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Research Question
            </label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                  type="text"
                  placeholder="Ask a research question (e.g., 'What are the psychological benefits of spaced repetition?')"
                  className="block w-full rounded-md border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <button
                onClick={handleResearch}
                disabled={isPending || query.length < 5}
                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isPending ? "Researching..." : "Research"}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-zinc-400">Save cards to:</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">No topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subjectName} → {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}
          {isPending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Researching your question...
                  </p>
                  <p className="text-xs text-amber-500 dark:text-amber-400">
                    Searching books & Wikipedia, then synthesizing with AI.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Research result */}
          {result && (
            <div className="space-y-6">
              {/* AI synthesized answer */}
              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Brain className="h-4 w-4 text-amber-500" />
                  Research Analysis
                </h3>
                <div className="prose prose-sm max-w-none text-zinc-700 dark:text-zinc-300">
                  {result.answer.split("\n").map((paragraph, i) => (
                    <p key={i} className="mb-3 last:mb-0 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold">
                  Sources ({result.sources.length})
                </h3>
                <div className="space-y-2">
                  {result.sources.map((source, i) => (
                    <SourceItem key={i} source={source} index={i + 1} />
                  ))}
                </div>
              </div>

              {/* Suggested cards */}
              {result.suggestedCards.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Layers className="h-4 w-4 text-sky-500" />
                      Study Cards from Research ({result.suggestedCards.length})
                    </h3>
                    {!cardsSaved ? (
                      <button
                        onClick={handleSaveCards}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Layers className="h-3 w-3" />
                        Save All Cards
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                        <Check className="h-4 w-4" />
                        Cards saved!
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {result.suggestedCards.map((card, i) => (
                      <div key={i} className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Q: {card.front}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          A: {card.back}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Papers / RAG mode */}
      {mode === "papers" && (
        <div className="space-y-6">
          {/* Paper upload */}
          <PaperUpload onUploadComplete={handleUploadComplete} />

          {/* Paper library */}
          <PaperLibrary
            papers={papers}
            onRetry={handleRetry}
            onDelete={handleDelete}
            onIngestUrl={handleIngestUrl}
          />

          {/* RAG query panel */}
          <RagQueryPanel
            papers={papers
              .filter((p) => p.parseStatus === "ready")
              .map((p) => ({ id: p.id, title: p.title, topicId: p.topicId }))}
            topics={topics.map((t) => ({ id: t.id, name: t.name }))}
            onQuery={handleRagQuery}
            isLoading={ragLoading}
          />

          {/* RAG loading steps */}
          {ragLoading && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  Searching your papers...
                </p>
              </div>
              <RagSearchSteps />
            </div>
          )}

          {/* RAG error */}
          {ragError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {ragError}
            </div>
          )}

          {/* RAG answer display */}
          {ragAnswer && <RagAnswerDisplay answer={ragAnswer} />}

          {/* Suggested cards from RAG */}
          {ragAnswer && ragAnswer.suggestedCards.length > 0 && (
            <CardFromRag
              suggestedCards={ragAnswer.suggestedCards}
              topicId={selectedTopic || undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SourceItem({ source, index }: { source: ResearchSource; index: number }) {
  const TypeIcon = source.type === "wiki" ? Globe : BookOpen;

  return (
    <div className="flex items-start gap-3 rounded-md bg-zinc-50 p-2.5 dark:bg-zinc-800">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-zinc-200 text-[10px] font-bold dark:bg-zinc-700">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TypeIcon className="h-3 w-3 flex-shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-medium">{source.title}</span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {source.authors.slice(0, 2).join(", ")}
          {source.year ? ` · ${source.year}` : ""}
        </p>
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function RagSearchSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    "Extracting search keywords...",
    "Searching paper content...",
    "Synthesizing answer with citations...",
    "Generating study cards...",
  ];

  return (
    <div className="mt-3 space-y-1.5">
      {steps.map((label, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
            i <= step ? "opacity-100" : "opacity-30"
          }`}
        >
          {i < step ? (
            <Check className="h-3 w-3 text-indigo-500" />
          ) : i === step ? (
            <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
          ) : (
            <div className="h-3 w-3 rounded-full border border-indigo-300/50" />
          )}
          <span className={i <= step ? "text-indigo-600 dark:text-indigo-300" : "text-indigo-400/60"}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
