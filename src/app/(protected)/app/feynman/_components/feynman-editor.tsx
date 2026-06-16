"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import {
  evaluateExplanation,
  createCardsFromFeynman,
  type GapAnalysis,
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
} from "lucide-react";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { SuccessCheck } from "@/app/(protected)/app/_components/success-check";

interface TopicOption {
  id: string;
  name: string;
  subjectName: string;
  subjectColor: string;
}

export function FeynmanEditor({ topics }: { topics: TopicOption[] }) {
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id ?? "");
  const [explanation, setExplanation] = useState("");
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cardsSaved, setCardsSaved] = useState(false);

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
    // Clear existing debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Don't fetch while evaluating
    if (isPending) return;

    // Fetch initial suggestion when empty
    if (explanation === "" && currentTopic) {
      debounceRef.current = setTimeout(() => fetchSuggestion(""), 500);
      return;
    }

    // Fetch continuation after 2 seconds of not typing
    if (explanation.length > 0) {
      debounceRef.current = setTimeout(() => {
        setSuggestion(""); // Clear old suggestion before fetching new one
        fetchSuggestion(explanation);
      }, 2000);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [explanation, currentTopic, isPending, fetchSuggestion]);

  // Also fetch suggestion when topic changes
  useEffect(() => {
    if (explanation === "" && currentTopic) {
      const t = setTimeout(() => {
        setSuggestion("");
        fetchSuggestion("");
      }, 500);
      return () => clearTimeout(t);
    }
    // Clear suggestion via timeout to avoid sync setState in effect
    const t = setTimeout(() => setSuggestion(""), 0);
    return () => clearTimeout(t);
  }, [selectedTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Tab to accept suggestion
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
    setError(null);
    setAnalysis(null);
    setCardsSaved(false);
    setSuggestion("");

    startTransition(async () => {
      const result = await evaluateExplanation(selectedTopic, explanation);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setAnalysis(result.data);
        // Show XP toast for completing Feynman evaluation (+15 XP, +5 coins)
        setShowXpToast(true);
        setTimeout(() => setShowXpToast(false), 100);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Reward feedback */}
      <XpToast xp={15} coins={5} visible={showXpToast} />
      <SuccessCheck message="Cards saved to your deck!" visible={showSuccessCheck} />

      {/* Topic selector */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Select Topic
        </label>
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.subjectName} → {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Explanation editor with inline suggestions */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your Explanation
        </label>

        {/* Textarea with ghost suggestion overlay */}
        <div className="relative mt-1">
          {/* Ghost suggestion layer (behind textarea) */}
          {suggestion && !explanation && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2 text-sm text-zinc-400/70 dark:text-zinc-500/70 whitespace-pre-wrap">
              {suggestion}
            </div>
          )}
          {suggestion && explanation && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2 text-sm whitespace-pre-wrap">
              <span className="invisible">{explanation}</span>
              <span className="text-zinc-400/70 dark:text-zinc-500/70">
                {explanation.endsWith(" ") ? "" : " "}{suggestion}
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
              setSuggestion(""); // Clear suggestion immediately on typing
            }}
            onKeyDown={handleKeyDown}
            rows={10}
            placeholder={suggestion ? "" : "Start typing your explanation..."}
            className="relative z-10 block w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm caret-zinc-100 placeholder:text-zinc-500 dark:border-zinc-700"
          />
        </div>

        {/* Status bar */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-400">
              {explanation.length} characters
              {explanation.length < 50 && explanation.length > 0
                ? " (need at least 50)"
                : ""}
            </p>
            {suggestion && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                Press Tab to accept suggestion
              </span>
            )}
            {isFetchingSuggestion && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </span>
            )}
          </div>
          <button
            onClick={handleEvaluate}
            disabled={isPending || explanation.length < 50}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isPending ? "Evaluating..." : "Evaluate with AI"}
          </button>
        </div>
      </div>

      {/* Loading state with step animation */}
      {isPending && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Evaluating your explanation...
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400">
                The AI is analyzing your understanding of {currentTopic?.name ?? "this topic"}.
              </p>
            </div>
          </div>
          <EvaluationSteps />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* AI Feedback */}
      {analysis && (
        <div className="space-y-6">
          {/* Questions */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageCircleQuestion className="h-4 w-4 text-indigo-500" />
              Probing Questions
            </h3>
            <ul className="space-y-2">
              {analysis.questions.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span className="mt-0.5 text-indigo-500">•</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Paraphrase */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-violet-500" />
              How the AI Understood You
            </h3>
            <p className="text-sm italic text-zinc-600 dark:text-zinc-400">
              &ldquo;{analysis.paraphrase}&rdquo;
            </p>
          </div>

          {/* Gap Analysis */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-sm font-semibold">Gap Analysis</h3>
            <div className="space-y-3">
              {analysis.segments.map((seg, i) => (
                <div
                  key={i}
                  className={`rounded-md border-l-4 p-3 ${
                    seg.status === "green"
                      ? "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                      : seg.status === "amber"
                        ? "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10"
                        : "border-l-red-500 bg-red-50 dark:bg-red-900/10"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {seg.status === "green" && (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    )}
                    {seg.status === "amber" && (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    {seg.status === "red" && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-xs font-medium uppercase">
                      {seg.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    &ldquo;{seg.text}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {seg.feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Cards — Per-card edit/accept/reject */}
          {analysis.suggestedCards.length > 0 && (
            <SuggestedCardsEditor
              cards={analysis.suggestedCards}
              topicId={selectedTopic}
              onSaved={() => {
                setCardsSaved(true);
                setShowSuccessCheck(true);
                setTimeout(() => setShowSuccessCheck(false), 100);
              }}
              saved={cardsSaved}
            />
          )}
        </div>
      )}
    </div>
  );
}


// ─── Per-Card Edit/Accept/Reject Component ─────────────────────────────

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
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-sky-500" />
          Suggested Flashcards
          <span className="text-xs font-normal text-zinc-500">
            {selectedCount} of {editableCards.length} selected
          </span>
        </h3>
        {!saved ? (
          <button
            onClick={handleSaveSelected}
            disabled={saving || selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Selected ({selectedCount})
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" />
            Cards saved!
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-500">{error}</p>
      )}

      <div className="space-y-2">
        {editableCards.map((card, i) => (
          <div
            key={i}
            className={`rounded-md border p-3 transition-colors ${
              card.selected
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
                : "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-700 dark:bg-zinc-800"
            }`}
          >
            {card.editing ? (
              // Edit mode
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-zinc-500">Front (question)</label>
                  <input
                    type="text"
                    value={card.front}
                    onChange={(e) => updateCard(i, "front", e.target.value)}
                    className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Back (answer)</label>
                  <textarea
                    value={card.back}
                    onChange={(e) => updateCard(i, "back", e.target.value)}
                    rows={2}
                    className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    maxLength={1000}
                  />
                </div>
                <button
                  onClick={() => toggleEdit(i)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Done editing
                </button>
              </div>
            ) : (
              // Display mode
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Q: {card.front}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    A: {card.back}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleEdit(i)}
                    title="Edit card"
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSelect(i)}
                    title={card.selected ? "Reject card" : "Include card"}
                    className={`rounded p-1 ${
                      card.selected
                        ? "text-emerald-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        : "text-zinc-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/20"
                    }`}
                  >
                    {card.selected ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Animated Step Progress for AI Evaluation ─────────────────────────

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
