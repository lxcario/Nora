"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import {
  evaluateExplanation,
  createCardsFromFeynman,
  getTopicScoreHistory,
  getFeynmanSource,
  setFeynmanSource,
  clearFeynmanSource,
  getIndexedPapersForSource,
  type GapAnalysis,
  type RefineContext,
  type TopicScorePoint,
  type FeynmanSourceRef,
  type IndexedPaperSummary,
} from "@/app/(protected)/app/_actions/feynman";
import { getCompletionSuggestion } from "@/app/(protected)/app/_actions/autocomplete";
import {
  Send,
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageCircleQuestion,
  Layers,
  Check,
  Edit2,
  X,
  Save,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Paperclip,
  FileText,
  BookOpen,
  Trash2,
} from "lucide-react";
import { VoiceInput } from "./voice-input";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { SuccessCheck } from "@/app/(protected)/app/_components/success-check";
import { useSessionStats } from "@/app/(protected)/app/_components/session-stats-context";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

interface TopicOption {
  id: string;
  name: string;
  subjectName: string;
  subjectColor: string;
}

export function FeynmanEditor({ topics, defaultTopicId }: { topics: TopicOption[]; defaultTopicId?: string }) {
  const [selectedTopic, setSelectedTopic] = useState(
    (defaultTopicId && topics.some((t) => t.id === defaultTopicId) ? defaultTopicId : topics[0]?.id) ?? ""
  );
  const [explanation, setExplanation] = useState("");
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cardsSaved, setCardsSaved] = useState(false);
  const { addReward } = useSessionStats();

  // Iterative refine loop state
  const [attempt, setAttempt] = useState(0);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [previousGaps, setPreviousGaps] = useState<string[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const evaluatingRef = useRef(false); // double-submit guard

  // Per-topic score history (for the progress sparkline)
  const [scoreHistory, setScoreHistory] = useState<TopicScorePoint[]>([]);

  // Source attachment (spec Req 3.1)
  const [currentSource, setCurrentSource] = useState<FeynmanSourceRef | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  const loadScoreHistory = useCallback(async (topicId: string) => {
    if (!topicId) {
      setScoreHistory([]);
      return;
    }
    const { points } = await getTopicScoreHistory(topicId);
    setScoreHistory(points);
  }, []);

  // Reward feedback state
  const [showXpToast, setShowXpToast] = useState(false);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Autocomplete state
  const [suggestion, setSuggestion] = useState("");
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentTopic = topics.find((t) => t.id === selectedTopic);

  // Fetch suggestion after 2 seconds of inactivity
  const fetchSuggestion = useCallback(
    async (text: string) => {
      if (!currentTopic) return;
      setIsFetchingSuggestion(true);
      const result = await getCompletionSuggestion(
        currentTopic.name,
        currentTopic.subjectName,
        text
      );
      if (result.suggestion) {
        setSuggestion(result.suggestion);
      }
      setIsFetchingSuggestion(false);
    },
    [currentTopic]
  );

  // Debounced suggestion trigger
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (isPending) return;

    if (explanation === "" && currentTopic) {
      debounceRef.current = setTimeout(() => fetchSuggestion(""), 500);
      return;
    }

    if (explanation.length > 0) {
      debounceRef.current = setTimeout(() => {
        setSuggestion("");
        fetchSuggestion(explanation);
      }, 2000);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [explanation, currentTopic, isPending, fetchSuggestion]);

  // Beforeunload guard: prevent accidental data loss when explanation has unsaved content.
  // Only active when the user has typed a meaningful explanation (>50 chars) and
  // hasn't yet received an evaluation (analysis === null).
  useEffect(() => {
    const hasUnsavedWork = explanation.length > 50 && analysis === null;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedWork) {
        e.preventDefault();
        // Modern browsers ignore custom messages but still show a generic prompt.
        e.returnValue = "";
      }
    }

    if (hasUnsavedWork) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [explanation, analysis]);

  // Fetch suggestion when topic changes
  useEffect(() => {
    // Reset the per-topic refine/score state when switching topics.
    setAnalysis(null);
    setError(null);
    setAttempt(0);
    setPreviousScore(null);
    setPreviousGaps([]);
    setIsRefining(false);
    setScoreDelta(null);

    loadScoreHistory(selectedTopic);

    // Load the source attachment for the newly selected topic.
    setIsLoadingSource(true);
    setCurrentSource(null);
    getFeynmanSource(selectedTopic).then((src) => {
      setCurrentSource(src);
      setIsLoadingSource(false);
    });

    if (explanation === "" && currentTopic) {
      const t = setTimeout(() => {
        setSuggestion("");
        fetchSuggestion("");
      }, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSuggestion(""), 0);
    return () => clearTimeout(t);
  }, [selectedTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      const newText = explanation
        ? explanation + (explanation.endsWith(" ") ? "" : " ") + suggestion
        : suggestion;
      setExplanation(newText);
      setSuggestion("");
    }
  }

  function handleEvaluate() {
    if (evaluatingRef.current) return; // prevent double-submit
    evaluatingRef.current = true;

    setError(null);
    setAnalysis(null);
    setCardsSaved(false);
    setSuggestion("");

    const refine: RefineContext | undefined =
      isRefining && previousScore !== null
        ? {
            attemptNumber: attempt + 1,
            previousScore,
            previousGaps,
          }
        : undefined;

    startTransition(async () => {
      try {
        const result = await evaluateExplanation(selectedTopic, explanation, refine);
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          const newScore = result.data.score.score;
          setScoreDelta(
            refine && previousScore !== null ? newScore - previousScore : null
          );
          setAnalysis(result.data);
          setAttempt((a) => a + 1);
          setPreviousScore(newScore);
          setPreviousGaps(
            result.data.segments
              .filter((s) => s.status !== "green")
              .map((s) => s.feedback)
              .filter(Boolean)
          );
          setIsRefining(false);
          setShowXpToast(true);
          setTimeout(() => setShowXpToast(false), 3000);
          addReward(15, 5);
          loadScoreHistory(selectedTopic);
        }
      } finally {
        evaluatingRef.current = false;
      }
    });
  }

  // Enter refine mode: keep the explanation editable, hide prior feedback,
  // and scroll back to the editor so the student can revise and re-explain.
  function handleRefine() {
    setIsRefining(true);
    setAnalysis(null);
    setError(null);
    setScoreDelta(null);
    setCardsSaved(false);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => textareaRef.current?.focus(), 300);
  }

  return (
    <div className="space-y-5">
      {/* Reward feedback */}
      <XpToast xp={15} coins={5} visible={showXpToast} />
      <SuccessCheck message="Cards saved to your deck!" visible={showSuccessCheck} />

      {/* Topic selector */}
      <DialogFrame title="Select Topic">
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

        {scoreHistory.length > 0 && (
          <div className="mt-3 border-t border-[var(--pixel-border-light)] pt-3">
            <ScoreSparkline points={scoreHistory} />
          </div>
        )}
      </DialogFrame>

      {/* Source attachment (spec Req 3.1) */}
      <SourceSection
        topicId={selectedTopic}
        currentSource={currentSource}
        isLoading={isLoadingSource}
        onSourceChange={(src) => setCurrentSource(src)}
      />

      {/* Explanation editor */}
      <div ref={editorRef}>
      <DialogFrame title={isRefining ? `Refine Your Explanation (attempt ${attempt + 1})` : "Your Explanation"}>
        {isRefining && (
          <div className="mb-3 flex items-start gap-2 rounded p-2 text-xs border border-[var(--pixel-accent)] bg-[var(--pixel-bg-secondary)] text-[var(--pixel-text-secondary)]">
            <RefreshCw className="h-3.5 w-3.5 mt-0.5 text-[var(--pixel-accent)] shrink-0" />
            <span>
              Revise your explanation to close the gaps from your last attempt
              {previousScore !== null ? ` (scored ${previousScore}/100)` : ""}, then
              re-evaluate to see if your score improves.
            </span>
          </div>
        )}
        <div className="relative">
          {/* Ghost suggestion layer */}
          {suggestion && !explanation && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded px-3 py-2 text-sm text-[var(--pixel-text-muted)] whitespace-pre-wrap">
              {suggestion}
            </div>
          )}
          {suggestion && explanation && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded px-3 py-2 text-sm whitespace-pre-wrap">
              <span className="invisible">{explanation}</span>
              <span className="text-[var(--pixel-text-muted)]">
                {explanation.endsWith(" ") ? "" : " "}{suggestion}
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
              setSuggestion("");
            }}
            onKeyDown={handleKeyDown}
            rows={10}
            placeholder={suggestion ? "" : "Start typing your explanation..."}
            className="relative z-10 w-full resize-y bg-transparent"
          />
        </div>

        {/* Status bar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--pixel-text-muted)]">
              {explanation.length} characters
              {explanation.length < 50 && explanation.length > 0 && (
                <span className="text-[var(--pixel-warning)]"> — {50 - explanation.length} more needed</span>
              )}
            </span>
            {suggestion && (
              <span className="rounded px-1.5 py-0.5 text-xs bg-[var(--pixel-bg-elevated)] text-[var(--pixel-text-secondary)]">
                Tab to add this prompt — then finish it in your words
              </span>
            )}
            {isFetchingSuggestion && (
              <span className="flex items-center gap-1 text-xs text-[var(--pixel-text-muted)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <VoiceInput onTranscript={(text) => setExplanation((prev) => prev + (prev ? " " : "") + text)} />
            <PixelButton
              variant="primary"
              onClick={handleEvaluate}
              disabled={isPending || explanation.length < 50}
              loading={isPending}
            >
              {isPending ? "Evaluating..." : isRefining ? "Re-evaluate" : "Evaluate with AI"}
            </PixelButton>
          </div>
        </div>
      </DialogFrame>
      </div>

      {/* Loading state */}
      {isPending && (
        <DialogFrame>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--pixel-accent)]" />
            <div>
              <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                Evaluating your explanation...
              </p>
              <p className="text-xs text-[var(--pixel-text-secondary)]">
                The AI is analyzing your understanding of {currentTopic?.name ?? "this topic"}.
              </p>
            </div>
          </div>
          <EvaluationSteps />
        </DialogFrame>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg p-4 text-sm border-2 border-[var(--pixel-error)] bg-[var(--pixel-bg-secondary)] text-[var(--pixel-error)]">
          {error}
        </div>
      )}

      {/* AI Feedback */}
      {analysis && (
        <div className="space-y-5">
          {/* Grounding badge (spec Req 3.2, 3.4) */}
          <div
            className="flex items-center gap-2 rounded px-3 py-2 text-xs"
            style={{
              border: `2px solid ${analysis.grounded ? "var(--pixel-success)" : "var(--pixel-warning)"}`,
              backgroundColor: `color-mix(in srgb, ${analysis.grounded ? "var(--pixel-success)" : "var(--pixel-warning)"} 10%, transparent)`,
              color: analysis.grounded ? "var(--pixel-success)" : "var(--pixel-warning)",
            }}
          >
            {analysis.grounded ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>
              {analysis.grounded ? (
                <>Verified against {analysis.sourceLabel} — feedback cites specific source passages.</>
              ) : (
                <><strong>Unverified</strong> — no source attached. Feedback reflects the model&apos;s
                  general knowledge and may contain errors. Attach a source above for grounded feedback.</>
              )}
            </span>
          </div>

          {/* Comprehension score */}
          <ScoreCard
            score={analysis.score}
            delta={scoreDelta}
            attempt={attempt}
            onRefine={handleRefine}
            disabled={isPending}
          />

          {/* Questions */}
          <DialogFrame title="Questions Worth Exploring">
            <p className="mb-2 text-xs text-[var(--pixel-text-muted)]">
              These might help deepen your understanding.
            </p>
            <ul className="space-y-2">
              {analysis.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--pixel-text-secondary)]">
                  <MessageCircleQuestion className="h-4 w-4 mt-0.5 text-[var(--pixel-accent)] shrink-0" />
                  {q}
                </li>
              ))}
            </ul>
          </DialogFrame>

          {/* Paraphrase */}
          <DialogFrame title="How Nora Understood You">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 mt-0.5 text-[var(--pixel-accent)] shrink-0" />
              <p className="text-sm italic text-[var(--pixel-text-secondary)]">
                &ldquo;{analysis.paraphrase}&rdquo;
              </p>
            </div>
          </DialogFrame>

          {/* Gap Analysis */}
          <DialogFrame title="Where You Stand">
            <div className="space-y-3">
              {analysis.segments.map((seg, i) => (
                <div
                  key={i}
                  className="rounded p-3 border-l-4"
                  style={{
                    borderLeftColor:
                      seg.status === "green" ? "var(--pixel-success)"
                      : seg.status === "amber" ? "var(--pixel-warning)"
                      : "var(--pixel-error)",
                    backgroundColor: "var(--pixel-bg-secondary)",
                  }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {seg.status === "green" && <CheckCircle className="h-4 w-4 text-[var(--pixel-success)]" />}
                    {seg.status === "amber" && <AlertTriangle className="h-4 w-4 text-[var(--pixel-warning)]" />}
                    {seg.status === "red" && <XCircle className="h-4 w-4 text-[var(--pixel-error)]" />}
                    <span className="text-xs font-medium uppercase text-[var(--pixel-text-muted)]">
                      {seg.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--pixel-text-primary)]">
                    &ldquo;{seg.text}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-[var(--pixel-text-secondary)]">
                    {seg.feedback}
                  </p>
                </div>
              ))}
            </div>
          </DialogFrame>

          {/* Suggested Cards */}
          {analysis.suggestedCards.length > 0 && (
            <SuggestedCardsEditor
              cards={analysis.suggestedCards}
              topicId={selectedTopic}
              onSaved={() => {
                setCardsSaved(true);
                setShowSuccessCheck(true);
                setTimeout(() => setShowSuccessCheck(false), 3000);
              }}
              saved={cardsSaved}
            />
          )}
        </div>
      )}
    </div>
  );
}


// ─── Source Attachment (spec Req 3.1) ───────────────────────────────────────

/**
 * Shows the current Feynman source (if any) and lets the user attach,
 * change, or remove it. Three source types: indexed paper, pasted notes.
 * (Video transcript support is wired in Task 12.)
 */
function SourceSection({
  topicId,
  currentSource,
  isLoading,
  onSourceChange,
}: {
  topicId: string;
  currentSource: FeynmanSourceRef | null;
  isLoading: boolean;
  onSourceChange: (src: FeynmanSourceRef | null) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<"paper" | "notes">("paper");
  const [papers, setPapers] = useState<IndexedPaperSummary[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [notesText, setNotesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Load indexed papers when the picker opens.
  async function handleOpenPicker() {
    setShowPicker(true);
    setSelectedPaperId("");
    setNotesText("");
    if (papers.length === 0) {
      setLoadingPapers(true);
      const list = await getIndexedPapersForSource();
      setPapers(list);
      setLoadingPapers(false);
    }
  }

  async function handleSave() {
    if (pickerTab === "paper" && !selectedPaperId) return;
    if (pickerTab === "notes" && !notesText.trim()) return;
    setSaving(true);

    let ref: FeynmanSourceRef;
    if (pickerTab === "paper") {
      const paper = papers.find((p) => p.id === selectedPaperId);
      ref = { type: "paper", paperId: selectedPaperId, paperTitle: paper?.title };
    } else {
      ref = { type: "notes", notes: notesText.trim() };
    }

    await setFeynmanSource(topicId, ref);
    onSourceChange(ref);
    setShowPicker(false);
    setSaving(false);
  }

  async function handleClear() {
    setClearing(true);
    await clearFeynmanSource(topicId);
    onSourceChange(null);
    setClearing(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--pixel-text-muted)" }}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading source...
      </div>
    );
  }

  return (
    <div>
      {/* Current source badge */}
      {currentSource ? (
        <div
          className="flex items-center gap-2 rounded px-3 py-2 text-sm"
          style={{
            border: "2px solid var(--pixel-accent)",
            backgroundColor: "color-mix(in srgb, var(--pixel-accent) 8%, transparent)",
          }}
        >
          {currentSource.type === "paper" ? (
            <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--pixel-accent)" }} />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--pixel-accent)" }} />
          )}
          <div className="flex-1 min-w-0">
            <span className="font-pixel text-[9px] uppercase" style={{ color: "var(--pixel-accent)" }}>
              {currentSource.type === "paper" ? "Paper source" : "Notes source"}
            </span>
            <p
              className="truncate text-xs"
              style={{ color: "var(--pixel-text-primary)" }}
              title={
                currentSource.type === "paper"
                  ? currentSource.paperTitle
                  : currentSource.notes?.slice(0, 80)
              }
            >
              {currentSource.type === "paper"
                ? (currentSource.paperTitle ?? "Indexed paper")
                : `"${currentSource.notes?.slice(0, 60) ?? ""}…"`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleOpenPicker}
              className="font-pixel text-[9px] px-1.5 py-0.5"
              style={{ color: "var(--pixel-accent)", border: "1px solid var(--pixel-accent)" }}
            >
              Change
            </button>
            <button
              onClick={handleClear}
              disabled={clearing}
              title="Remove source (switch to unverified mode)"
              className="p-0.5"
              style={{ color: "var(--pixel-text-muted)" }}
            >
              {clearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 rounded px-3 py-2 text-xs"
          style={{
            border: "2px dashed var(--pixel-border)",
            color: "var(--pixel-text-muted)",
          }}
        >
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            No source attached — feedback will be labeled{" "}
            <strong>unverified</strong>.
          </span>
          <button
            onClick={handleOpenPicker}
            className="font-pixel text-[9px] px-2 py-0.5 shrink-0"
            style={{
              color: "var(--pixel-accent)",
              border: "1px solid var(--pixel-accent)",
            }}
          >
            Attach source
          </button>
        </div>
      )}

      {/* Picker panel */}
      {showPicker && (
        <div
          className="mt-2 rounded p-4 space-y-3"
          style={{
            border: "2px solid var(--pixel-border)",
            backgroundColor: "var(--pixel-bg-secondary)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
              Attach a source
            </span>
            <button
              onClick={() => setShowPicker(false)}
              style={{ color: "var(--pixel-text-muted)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(["paper", "notes"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPickerTab(tab)}
                className="font-pixel text-[9px] px-2 py-1 capitalize"
                style={{
                  border: "2px solid",
                  borderColor: pickerTab === tab ? "var(--pixel-accent)" : "var(--pixel-border)",
                  color:
                    pickerTab === tab
                      ? "var(--pixel-accent)"
                      : "var(--pixel-text-secondary)",
                  backgroundColor:
                    pickerTab === tab
                      ? "color-mix(in srgb, var(--pixel-accent) 10%, transparent)"
                      : "transparent",
                }}
              >
                {tab === "paper" ? "Indexed paper" : "Paste notes"}
              </button>
            ))}
          </div>

          {/* Paper picker */}
          {pickerTab === "paper" && (
            <div className="space-y-2">
              {loadingPapers ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading papers…
                </div>
              ) : papers.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                  No indexed papers found. Upload and index a PDF in the Research Desk first.
                </p>
              ) : (
                <select
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  className="w-full text-sm"
                >
                  <option value="">Select a paper…</option>
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.chunkCount} chunks)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Notes picker */}
          {pickerTab === "notes" && (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={6}
              placeholder="Paste your lecture notes, textbook excerpt, or key facts here…"
              className="w-full resize-y text-sm"
            />
          )}

          {/* Save */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPicker(false)}
              className="font-pixel text-[9px] px-2 py-1"
              style={{ color: "var(--pixel-text-muted)" }}
            >
              Cancel
            </button>
            <PixelButton
              variant="primary"
              size="small"
              onClick={handleSave}
              disabled={
                saving ||
                (pickerTab === "paper" && !selectedPaperId) ||
                (pickerTab === "notes" && !notesText.trim())
              }
              loading={saving}
            >
              Attach
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Per-topic Progress Sparkline ───────────────────────────────────────

function verdictColor(score: number): string {
  if (score >= 65) return "var(--pixel-success)";
  if (score >= 40) return "var(--pixel-warning)";
  return "var(--pixel-error)";
}

function ScoreSparkline({ points }: { points: TopicScorePoint[] }) {
  const latest = points[points.length - 1]?.score ?? 0;
  const first = points[0]?.score ?? 0;
  const trend = latest - first;

  // SVG geometry
  const W = 220;
  const H = 48;
  const pad = 4;
  const n = points.length;

  // X positions evenly spaced; Y inverted (0 score = bottom).
  const coords = points.map((p, i) => {
    const x = n === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1);
    const y = pad + (1 - p.score / 100) * (H - pad * 2);
    return { x, y, score: p.score };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-[var(--pixel-text-secondary)]">
          Progress on this topic ({n} attempt{n === 1 ? "" : "s"})
        </span>
        {n > 1 && (
          <span
            className="inline-flex items-center gap-0.5 text-xs"
            style={{
              color:
                trend > 0
                  ? "var(--pixel-success)"
                  : trend < 0
                  ? "var(--pixel-error)"
                  : "var(--pixel-text-muted)",
            }}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {trend > 0 ? `+${trend}` : trend}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-12 flex-1"
          role="img"
          aria-label={`Comprehension scores over ${n} attempts, latest ${latest} out of 100`}
        >
          {/* 50% reference line */}
          <line
            x1={pad}
            y1={H / 2}
            x2={W - pad}
            y2={H / 2}
            stroke="var(--pixel-border-light)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {n > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--pixel-accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === coords.length - 1 ? 3.5 : 2.5}
              fill={verdictColor(c.score)}
            >
              <title>{`${c.score}/100`}</title>
            </circle>
          ))}
        </svg>
        <div className="flex flex-col items-end shrink-0">
          <span
            className="font-pixel text-lg leading-none"
            style={{ color: verdictColor(latest) }}
          >
            {latest}
          </span>
          <span className="text-[10px] text-[var(--pixel-text-muted)]">latest</span>
        </div>
      </div>
    </div>
  );
}


// ─── Comprehension Score Card ───────────────────────────────────────────

function ScoreCard({
  score,
  delta,
  attempt,
  onRefine,
  disabled,
}: {
  score: GapAnalysis["score"];
  delta: number | null;
  attempt: number;
  onRefine: () => void;
  disabled: boolean;
}) {
  const color =
    score.verdict === "strong"
      ? "var(--pixel-success)"
      : score.verdict === "solid"
      ? "var(--pixel-success)"
      : score.verdict === "partial"
      ? "var(--pixel-warning)"
      : "var(--pixel-error)";

  return (
    <DialogFrame title="Understanding">
      <div className="flex items-center gap-4">
        {/* Numeric score */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <span className="font-pixel text-3xl leading-none" style={{ color }}>
            {score.score}
          </span>
          <span className="text-[10px] text-[var(--pixel-text-muted)]">/ 100</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Verdict + delta */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color }}>
              {score.label}
            </span>
            {delta !== null && (
              <span
                className="inline-flex items-center gap-0.5 text-xs"
                style={{
                  color:
                    delta > 0
                      ? "var(--pixel-success)"
                      : delta < 0
                      ? "var(--pixel-error)"
                      : "var(--pixel-text-muted)",
                }}
              >
                {delta > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : delta < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {delta > 0 ? `+${delta}` : delta} vs last attempt
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--pixel-bg-elevated)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score.score}%`, backgroundColor: color }}
            />
          </div>

          {/* Counts */}
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--pixel-text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-[var(--pixel-success)]" />
              {score.counts.green}
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-[var(--pixel-warning)]" />
              {score.counts.amber}
            </span>
            <span className="inline-flex items-center gap-1">
              <XCircle className="h-3 w-3 text-[var(--pixel-error)]" />
              {score.counts.red}
            </span>
            <span className="text-[var(--pixel-text-muted)]">· attempt {attempt}</span>
          </div>
        </div>

        {/* Refine CTA */}
        <button
          onClick={onRefine}
          disabled={disabled}
          title="Revise your explanation and try to raise your score"
          className="inline-flex shrink-0 items-center gap-2 self-start text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refine
        </button>
      </div>
    </DialogFrame>
  );
}


// ─── Suggested Cards Editor ─────────────────────────────────────────────

interface EditableCard {
  front: string;
  back: string;
  selected: boolean;
  editing: boolean;
}

function SuggestedCardsEditor({
  cards,
  topicId,
  onSaved,
  saved,
}: {
  cards: { front: string; back: string }[];
  topicId: string;
  onSaved: () => void;
  saved: boolean;
}) {
  const [editableCards, setEditableCards] = useState<EditableCard[]>(
    cards.map((c) => ({ front: c.front, back: c.back, selected: true, editing: false }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = editableCards.filter((c) => c.selected).length;

  function toggleSelect(index: number) {
    setEditableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  function toggleEdit(index: number) {
    setEditableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, editing: !c.editing } : c))
    );
  }

  function updateCard(index: number, field: "front" | "back", value: string) {
    setEditableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  async function handleSaveSelected() {
    const toSave = editableCards
      .filter((c) => c.selected && c.front.trim() && c.back.trim())
      .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));

    if (toSave.length === 0) return;

    setSaving(true);
    setError(null);

    const result = await createCardsFromFeynman(topicId, toSave);
    if (result.error) {
      setError(result.error);
    } else {
      onSaved();
    }
    setSaving(false);
  }

  return (
    <DialogFrame title="Suggested Flashcards">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--pixel-accent)]" />
          <span className="text-xs text-[var(--pixel-text-secondary)]">
            {selectedCount} of {editableCards.length} selected
          </span>
        </div>
        {!saved ? (
          <PixelButton
            variant="success"
            size="small"
            onClick={handleSaveSelected}
            disabled={saving || selectedCount === 0}
            loading={saving}
          >
            Save Selected ({selectedCount})
          </PixelButton>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-[var(--pixel-success)]">
            <Check className="h-4 w-4" />
            Cards saved!
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-[var(--pixel-error)]">{error}</p>}

      <div className="space-y-2">
        {editableCards.map((card, i) => (
          <div
            key={i}
            className="rounded border p-3 transition-colors"
            style={{
              borderColor: card.selected ? "var(--pixel-success)" : "var(--pixel-border)",
              backgroundColor: card.selected ? "rgba(125, 168, 86, 0.05)" : "var(--pixel-bg-primary)",
              opacity: card.selected ? 1 : 0.6,
            }}
          >
            {card.editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-[var(--pixel-text-muted)]">Front (question)</label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => updateCard(i, "front", e.target.value)}
                    className="mt-0.5 w-full text-sm"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--pixel-text-muted)]">Back (answer)</label>
                  <textarea
                    value={card.back}
                    onChange={(e) => updateCard(i, "back", e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full text-sm"
                    maxLength={1000}
                  />
                </div>
                <button
                  onClick={() => toggleEdit(i)}
                  className="text-xs"
                  style={{ color: "var(--pixel-accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  Done editing
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--pixel-text-primary)]">
                    Q: {card.front}
                  </p>
                  <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
                    A: {card.back}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleEdit(i)}
                    title="Edit card"
                    className="p-1 transition-colors"
                    style={{ color: "var(--pixel-text-muted)", background: "none", border: "none" }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSelect(i)}
                    title={card.selected ? "Reject card" : "Include card"}
                    className="p-1 transition-colors"
                    style={{
                      color: card.selected ? "var(--pixel-success)" : "var(--pixel-text-muted)",
                      background: "none",
                      border: "none",
                    }}
                  >
                    {card.selected ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DialogFrame>
  );
}


// ─── Evaluation Steps Animation ─────────────────────────────────────────

function EvaluationSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 4000),
      setTimeout(() => setStep(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    "Reading your explanation...",
    "Asking probing questions...",
    "Identifying knowledge gaps...",
    "Generating flashcard suggestions...",
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
          <span className={i <= step ? "text-[var(--pixel-text-primary)]" : "text-[var(--pixel-text-muted)]"}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
