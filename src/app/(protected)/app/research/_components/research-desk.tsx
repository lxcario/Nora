"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
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
  X,
  FileText,
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

// ---------------------------------------------------------------------------
// Research progress stages
// ---------------------------------------------------------------------------

type ResearchStage =
  | "classifying"
  | "searching_academic"
  | "searching_web"
  | "reading_sources"
  | "synthesizing"
  | "done"
  | "cancelled";

const STAGE_LABELS: Record<ResearchStage, string> = {
  classifying: "Classifying your question...",
  searching_academic: "Searching academic databases...",
  searching_web: "Searching the web...",
  reading_sources: "Reading sources...",
  synthesizing: "Synthesizing answer with citations...",
  done: "Done",
  cancelled: "Cancelled",
};

const STAGE_ORDER: ResearchStage[] = [
  "classifying",
  "searching_academic",
  "searching_web",
  "reading_sources",
  "synthesizing",
  "done",
];

// Simulated stage progression timings (since server actions can't stream).
// These represent typical durations for each step in the pipeline.
const STAGE_TIMINGS_MS: Partial<Record<ResearchStage, number>> = {
  classifying: 1500,
  searching_academic: 4000,
  searching_web: 5500,
  reading_sources: 7000,
  synthesizing: 9000,
};

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
  const [currentStage, setCurrentStage] = useState<ResearchStage | null>(null);
  const abortRef = useRef(false);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  // Live ingestion status polling
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
      // Silently fail
    }
  }

  // --- Progress stage simulation ---
  const startStageProgression = useCallback(() => {
    // Clear any existing timers
    stageTimersRef.current.forEach(clearTimeout);
    stageTimersRef.current = [];

    setCurrentStage("classifying");

    for (const stage of STAGE_ORDER) {
      if (stage === "done") continue;
      const delay = STAGE_TIMINGS_MS[stage];
      if (delay !== undefined) {
        const timer = setTimeout(() => {
          if (!abortRef.current) {
            const nextIdx = STAGE_ORDER.indexOf(stage) + 1;
            if (nextIdx < STAGE_ORDER.length - 1) {
              setCurrentStage(STAGE_ORDER[nextIdx]);
            }
          }
        }, delay);
        stageTimersRef.current.push(timer);
      }
    }
  }, []);

  const clearStageProgression = useCallback(() => {
    stageTimersRef.current.forEach(clearTimeout);
    stageTimersRef.current = [];
  }, []);

  // --- Web research handlers ---
  function handleResearch() {
    setError(null);
    setResult(null);
    setCardsSaved(false);
    abortRef.current = false;

    startStageProgression();

    startTransition(async () => {
      const res = await performResearch(query);

      clearStageProgression();

      if (abortRef.current) {
        setCurrentStage("cancelled");
        setTimeout(() => setCurrentStage(null), 1500);
        return;
      }

      setCurrentStage("done");
      setTimeout(() => setCurrentStage(null), 800);

      if (res.error) setError(res.error);
      if (res.data) setResult(res.data);
    });
  }

  function handleCancel() {
    abortRef.current = true;
    clearStageProgression();
    setCurrentStage("cancelled");
    setTimeout(() => setCurrentStage(null), 1500);
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
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-[var(--pixel-text-muted)] whitespace-nowrap">
        Save cards to:
      </label>
      <select
        value={selectedTopic}
        onChange={(e) => setSelectedTopic(e.target.value)}
        className="text-xs min-w-0 max-w-[200px] sm:max-w-none"
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
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pixel-text-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isPending && handleResearch()}
                  type="text"
                  placeholder="e.g. What are the psychological benefits of spaced repetition?"
                  className="w-full"
                  style={{ paddingLeft: "36px" }}
                  disabled={isPending}
                />
              </div>
              <button
                onClick={handleResearch}
                disabled={isPending || query.length < 5}
                className="inline-flex items-center justify-center gap-2 !bg-[var(--pixel-accent)] !text-[var(--pixel-bg-primary)] hover:!brightness-110 shrink-0"
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
              Searches peer-reviewed academic databases (OpenAlex, Crossref, Semantic
              Scholar) and the live web (Tavily). AI synthesizes findings with numbered
              citations. Verify key claims against the linked sources.
            </p>
          </DialogFrame>

          {/* Progress stages */}
          {isPending && currentStage && (
            <DialogFrame state="warning">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--pixel-accent)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                      Deep research in progress
                    </p>
                    <p className="text-xs text-[var(--pixel-text-secondary)]">
                      This takes 10-25 seconds for thorough results.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--pixel-text-muted)] hover:text-[var(--pixel-error)] hover:bg-[var(--pixel-bg-secondary)] transition-colors"
                  title="Cancel research"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
              <ResearchProgressSteps currentStage={currentStage} />
            </DialogFrame>
          )}

          {/* Cancelled notice */}
          {currentStage === "cancelled" && !isPending && (
            <div className="rounded-lg border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-secondary)] p-3 text-sm text-[var(--pixel-text-muted)]">
              Research cancelled. The current search may finish in the background, but its result will be discarded.
            </div>
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
              {/* Pipeline info badge */}
              {result.pipeline && (
                <div className="flex flex-wrap gap-2 text-xs text-[var(--pixel-text-muted)]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pixel-bg-secondary)] px-2 py-0.5">
                    <FileText className="h-3 w-3" />
                    {result.pipeline.academicSourceCount} academic
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pixel-bg-secondary)] px-2 py-0.5">
                    <Globe className="h-3 w-3" />
                    {result.pipeline.webSourceCount} web
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pixel-bg-secondary)] px-2 py-0.5">
                    Intent: {result.pipeline.intent}
                  </span>
                </div>
              )}

              {/* AI synthesized answer */}
              <DialogFrame title="Research Analysis">
                <div className="space-y-3 text-sm leading-relaxed text-[var(--pixel-text-secondary)]">
                  {result.answer.split("\n").map((paragraph, i) => (
                    <p key={i} className="text-[var(--pixel-text-secondary)]">
                      {renderResearchParagraph(paragraph)}
                    </p>
                  ))}
                </div>
              </DialogFrame>

              {/* Sources */}
              <DialogFrame title={`Sources (${result.sources.length})`}>
                <div className="space-y-2">
                  {result.sources.length === 0 && (
                    <p className="text-sm text-[var(--pixel-text-muted)]">
                      No sources found.
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
          <PaperUpload onUploadComplete={handleUploadComplete} />

          <PaperLibrary
            papers={papers}
            onRetry={handleRetry}
            onDelete={handleDelete}
            onIngestUrl={handleIngestUrl}
          />

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

          {ragError && (
            <div className="rounded-lg border-2 border-[var(--pixel-error)] bg-[var(--pixel-bg-secondary)] p-3 text-sm text-[var(--pixel-error)]">
              {ragError}
            </div>
          )}

          {ragAnswer && <RagAnswerDisplay answer={ragAnswer} />}

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

// ---------------------------------------------------------------------------
// Inline text renderer for research paragraphs
// Highlights [N] citations and [unverified] markers distinctly.
// ---------------------------------------------------------------------------

function renderResearchParagraph(text: string) {
  // Split on citation markers [N] and [unverified]
  const parts = text.split(/(\[\d+\]|\[unverified\])/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (/^\[\d+\]$/.test(part)) {
      // Citation number — styled as a small superscript badge
      return (
        <span
          key={i}
          className="inline-flex items-center justify-center mx-0.5 px-1 py-0 rounded text-[10px] font-bold align-super"
          style={{
            backgroundColor: "var(--pixel-accent-soft, rgba(99,102,241,0.15))",
            color: "var(--pixel-accent)",
          }}
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    if (part === "[unverified]") {
      // Unverified marker — visually distinct warning badge
      return (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0 rounded text-[10px] font-medium align-super"
          style={{
            backgroundColor: "var(--pixel-warning-soft, rgba(234,179,8,0.15))",
            color: "var(--pixel-warning, #ca8a04)",
          }}
          title="This claim could not be verified against any retrieved source"
        >
          unverified
        </span>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Research progress steps (driven by stage, not timers)
// ---------------------------------------------------------------------------

function ResearchProgressSteps({ currentStage }: { currentStage: ResearchStage }) {
  const stageIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="mt-3 space-y-1.5">
      {STAGE_ORDER.filter((s) => s !== "done").map((stage, i) => {
        const isComplete = i < stageIdx;
        const isCurrent = stage === currentStage;
        const isFuture = i > stageIdx;

        return (
          <div
            key={stage}
            className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
              isFuture ? "opacity-30" : "opacity-100"
            }`}
          >
            {isComplete ? (
              <Check className="h-3 w-3 text-[var(--pixel-accent)]" />
            ) : isCurrent ? (
              <Loader2 className="h-3 w-3 animate-spin text-[var(--pixel-accent)]" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-[var(--pixel-border-light)]" />
            )}
            <span
              className={
                isComplete || isCurrent
                  ? "text-[var(--pixel-text-primary)]"
                  : "text-[var(--pixel-text-muted)]"
              }
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source item (updated for paper vs web distinction)
// ---------------------------------------------------------------------------

function SourceItem({ source, index }: { source: ResearchSource; index: number }) {
  const isPaper = source.type === "paper";
  const TypeIcon = isPaper ? BookOpen : Globe;
  const typeBadge = isPaper ? "Academic" : source.domain || "Web";

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
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: isPaper
                ? "var(--pixel-accent-soft, rgba(99,102,241,0.15))"
                : "var(--pixel-success-soft, rgba(34,197,94,0.15))",
              color: isPaper ? "var(--pixel-accent)" : "var(--pixel-success)",
            }}
          >
            {typeBadge}
          </span>
          <p className="text-xs text-[var(--pixel-text-muted)] truncate">
            {source.authors.length > 0
              ? source.authors.slice(0, 2).join(", ")
              : ""}
            {source.year ? ` · ${source.year}` : ""}
          </p>
        </div>
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded p-1 text-[var(--pixel-text-muted)] hover:text-[var(--pixel-accent)]"
          title="Open source"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RAG search steps (papers mode — unchanged)
// ---------------------------------------------------------------------------

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
