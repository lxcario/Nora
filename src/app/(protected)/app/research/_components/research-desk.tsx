"use client";

import { useState, useEffect, useRef, useTransition } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { DialogFrame } from "@/components/pixel-ui";
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

  // --- Web research state ---
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch papers when switching to "papers" mode
  useEffect(() => {
    if (mode === "papers") {
      fetchPapers();
    }
  }, [mode]);

  // Live ingestion status: while any paper is still pending/processing, poll
  // the library every 3s so statuses update to "Ready" without a manual reload.
  useEffect(() => {
    const hasInflight = papers.some(
      (p) => p.parseStatus === "pending" || p.parseStatus === "processing"
    );

    if (mode === "papers" && hasInflight && !pollRef.current) {
      pollRef.current = setInterval(fetchPapers, 3000);
    } else if ((!hasInflight || mode !== "papers") && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current && (mode !== "papers" || !hasInflight)) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [papers, mode]);

  // Clean up the poller on unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function fetchPapers() {
    try {
      const res = await getUserPapers();
      setPapers(res.papers ?? []);
    } catch {
      // Silently fail; papers list will be empty
    }
  }

  // --- Web research handlers ---
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
      if (res.error) setRagError(res.error);
      if (res.data) setRagAnswer(res.data);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setRagLoading(false);
    }
  }

  async function handleRetry(paperId: string) {
    await retryIngestion(paperId);
    fetchPapers();
  }

  async function handleDelete(paperId: string) {
    await deleteFullPaper(paperId);
    fetchPapers();
  }

  async function handleIngestUrl(paperId: string) {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper?.url) return;
    await ingestFromUrl(paper.url, paperId);
    fetchPapers();
  }

  function handleUploadComplete() {
    fetchPapers();
  }

  const topicSelect = (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--pixel-text-muted)] whitespace-nowrap">
        Save cards to:
      </label>
      <select
        value={selectedTopic}
        onChange={(e) => setSelectedTopic(e.target.value)}
        className="text-xs"
      >
        <option value="">No topic</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.subjectName} → {t.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Mode toggle at the top */}
      <ResearchModeToggle mode={mode} onModeChange={setMode} />

      {/* Web research mode */}
      {mode === "web" && (
        <div className="space-y-6">
          {/* Research input */}
          <DialogFrame title="Research Question">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pixel-text-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                  type="text"
                  placeholder="e.g. What are the psychological benefits of spaced repetition?"
                  className="w-full"
                  style={{ paddingLeft: "36px" }}
                />
              </div>
              <button
                onClick={handleResearch}
                disabled={isPending || query.length < 5}
                className="inline-flex items-center gap-2 !bg-[var(--pixel-accent)] !text-[var(--pixel-bg-primary)] hover:!brightness-110"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isPending ? "Researching..." : "Research"}
              </button>
            </div>
            <div className="mt-3">{topicSelect}</div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--pixel-text-muted)]">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--pixel-warning)]" />
              AI-generated overview drawing on books, Wikipedia, and the model&apos;s
              own knowledge. Treat it as a starting point and verify key claims.
            </p>
          </DialogFrame>

          {/* Loading */}
          {isPending && (
            <DialogFrame state="warning">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--pixel-accent)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                    Researching your question...
                  </p>
                  <p className="text-xs text-[var(--pixel-text-secondary)]">
                    Searching books &amp; Wikipedia, then synthesizing with AI.
                  </p>
                </div>
              </div>
            </DialogFrame>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border-2 border-[var(--pixel-error)] bg-[var(--pixel-bg-secondary)] p-3 text-sm text-[var(--pixel-error)]">
              {error}
            </div>
          )}

          {/* Research result */}
          {result && (
            <div className="space-y-6">
              {/* AI synthesized answer */}
              <DialogFrame title="Research Analysis">
                <div className="space-y-3 text-sm leading-relaxed text-[var(--pixel-text-secondary)]">
                  {result.answer.split("\n").map((paragraph, i) => (
                    <p key={i} className="text-[var(--pixel-text-secondary)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </DialogFrame>

              {/* Sources */}
              <DialogFrame title={`Sources (${result.sources.length})`}>
                <div className="space-y-2">
                  {result.sources.length === 0 && (
                    <p className="text-sm text-[var(--pixel-text-muted)]">
                      No external sources matched — answer is from the model&apos;s
                      own knowledge.
                    </p>
                  )}
                  {result.sources.map((source, i) => (
                    <SourceItem key={i} source={source} index={i + 1} />
                  ))}
                </div>
              </DialogFrame>

              {/* Suggested cards */}
              {result.suggestedCards.length > 0 && (
                <DialogFrame title={`Study Cards from Research (${result.suggestedCards.length})`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    {topicSelect}
                    {!cardsSaved ? (
                      <button
                        onClick={handleSaveCards}
                        disabled={isPending || !selectedTopic}
                        className="inline-flex items-center gap-2 !bg-[var(--pixel-success)] !text-white hover:!brightness-110 text-sm"
                      >
                        <Layers className="h-3 w-3" />
                        Save All Cards
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-[var(--pixel-success)]">
                        <Check className="h-4 w-4" />
                        Cards saved!
                      </span>
                    )}
                  </div>
                  {!selectedTopic && (
                    <p className="mb-2 text-xs text-[var(--pixel-warning)]">
                      Pick a topic above to save these cards.
                    </p>
                  )}
                  <div className="space-y-2">
                    {result.suggestedCards.map((card, i) => (
                      <div
                        key={i}
                        className="rounded-md p-3"
                        style={{ backgroundColor: "var(--pixel-bg-secondary)" }}
                      >
                        <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                          Q: {card.front}
                        </p>
                        <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
                          A: {card.back}
                        </p>
                      </div>
                    ))}
                  </div>
                </DialogFrame>
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
          <DialogFrame title="Ask Your Papers">
            <div className="mb-3">{topicSelect}</div>
            <RagQueryPanel
              papers={papers
                .filter((p) => p.parseStatus === "ready")
                .map((p) => ({ id: p.id, title: p.title, topicId: p.topicId }))}
              topics={topics.map((t) => ({ id: t.id, name: t.name }))}
              onQuery={handleRagQuery}
              isLoading={ragLoading}
            />
          </DialogFrame>

          {/* RAG loading steps */}
          {ragLoading && (
            <DialogFrame>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--pixel-accent)]" />
                <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                  Searching your papers...
                </p>
              </div>
              <RagSearchSteps />
            </DialogFrame>
          )}

          {/* RAG error */}
          {ragError && (
            <div className="rounded-lg border-2 border-[var(--pixel-error)] bg-[var(--pixel-bg-secondary)] p-3 text-sm text-[var(--pixel-error)]">
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
    <div
      className="flex items-start gap-3 rounded-md p-2.5"
      style={{ backgroundColor: "var(--pixel-bg-secondary)" }}
    >
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold"
        style={{
          backgroundColor: "var(--pixel-bg-elevated)",
          color: "var(--pixel-text-secondary)",
        }}
      >
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TypeIcon className="h-3 w-3 flex-shrink-0 text-[var(--pixel-text-muted)]" />
          <span className="truncate text-sm font-medium text-[var(--pixel-text-primary)]">
            {source.title}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--pixel-text-muted)]">
          {source.authors.slice(0, 2).join(", ")}
          {source.year ? ` · ${source.year}` : ""}
        </p>
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded p-1 text-[var(--pixel-text-muted)] hover:text-[var(--pixel-accent)]"
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
            <Check className="h-3 w-3 text-[var(--pixel-accent)]" />
          ) : i === step ? (
            <Loader2 className="h-3 w-3 animate-spin text-[var(--pixel-accent)]" />
          ) : (
            <div className="h-3 w-3 rounded-full border border-[var(--pixel-border-light)]" />
          )}
          <span
            className={
              i <= step
                ? "text-[var(--pixel-text-primary)]"
                : "text-[var(--pixel-text-muted)]"
            }
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
