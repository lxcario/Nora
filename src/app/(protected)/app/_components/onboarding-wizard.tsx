"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DialogFrame, PixelButton, PixelInput } from "@/components/pixel-ui";
import { VALID_TERM_KINDS } from "@/lib/academic/identity-validation";
import type { TermKind } from "@/lib/supabase/database.types";
import {
  saveAcademicIdentity,
  setEnrolledCourseCodes,
} from "@/app/(protected)/app/_actions/academic/onboarding";
import {
  searchUniversities,
  type UniversitySearchResult,
} from "@/app/(protected)/app/_actions/academic/registry";

const STEPS = ["Institution", "Department", "Year & Term", "Courses", "Documents"] as const;

const TERM_KIND_LABELS: Record<TermKind, string> = {
  semester: "Semester",
  quarter: "Quarter",
  trimester: "Trimester",
  block: "Block",
};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);

  // Step 0 — institution
  const [uniQuery, setUniQuery] = useState("");
  const [selectedUni, setSelectedUni] = useState<UniversitySearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<UniversitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Step 1 — faculty / department (free-text only now — faculties/programs
  // are not prefetched in bulk anymore)
  const [facultyFreeText, setFacultyFreeText] = useState("");
  const [programFreeText, setProgramFreeText] = useState("");

  // Step 2 — year / term
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [termKind, setTermKind] = useState<TermKind>("semester");

  // Step 3 — courses
  const [courseCodesText, setCourseCodesText] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // ─── Debounced server search ─────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUniversities(q);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    // When the user has already selected a university, don't re-search
    if (selectedUni) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (uniQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      doSearch(uniQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [uniQuery, selectedUni, doSearch]);

  // ─── Selection helpers ───────────────────────────────────────────────────

  const usingRegistryUni = selectedUni !== null;

  function selectUniversity(u: UniversitySearchResult) {
    setSelectedUni(u);
    setUniQuery(u.name);
    setSuggestions([]);
  }

  function clearUniversitySelection(nextQuery: string) {
    setSelectedUni(null);
    setUniQuery(nextQuery);
  }

  // --- step gating ---
  const canAdvance = (() => {
    switch (step) {
      case 0:
        return usingRegistryUni || uniQuery.trim().length > 0;
      case 2:
        return year !== "" && term.trim().length > 0;
      default:
        return true; // faculty, courses, documents are optional
    }
  })();

  function next() {
    setGlobalError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setGlobalError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function stepForError(errorKey: string): number {
    if (errorKey === "university") return 0;
    if (errorKey === "yearOfStudy" || errorKey === "term" || errorKey === "termKind") return 2;
    return 0;
  }

  async function handleFinish() {
    setPending(true);
    setGlobalError(null);
    setFieldErrors({});

    const res = await saveAcademicIdentity({
      universityId: selectedUni?.id ?? null,
      universityNameRaw: selectedUni?.name ?? uniQuery,
      facultyId: null,
      facultyNameRaw: facultyFreeText,
      programId: null,
      programNameRaw: programFreeText,
      yearOfStudy: year,
      term,
      termKind,
    });

    if (!res.ok) {
      setPending(false);
      if (res.errors) {
        setFieldErrors(res.errors);
        const earliest = Math.min(...Object.keys(res.errors).map(stepForError));
        setStep(earliest);
      } else {
        setGlobalError(res.error ?? "Something went wrong. Please try again.");
      }
      return;
    }

    // Optional: persist explicitly entered course codes (best-effort).
    const codes = courseCodesText
      .split(/[\n,]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length > 0) {
      await setEnrolledCourseCodes(codes);
    }

    // Hard navigation so the app layout re-renders with the full game shell
    // (a shared layout is not re-rendered on a soft client navigation).
    window.location.assign("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pixel-grid-bg bg-[var(--pixel-bg-primary)]">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center space-y-1">
          <h1 className="font-pixel text-xl text-[var(--pixel-accent)]">SET UP YOUR SEMESTER</h1>
          <p className="text-xs text-[var(--pixel-text-secondary)]">
            Tell Nora where you study so it can find your real academic calendar and curriculum.
          </p>
        </div>

        <StepDots current={step} total={STEPS.length} labels={[...STEPS]} />

        <DialogFrame title={STEPS[step].toUpperCase()} variant="large">
          {globalError && (
            <div
              className="mb-3 border-2 p-2 text-xs"
              style={{
                borderColor: "var(--pixel-error)",
                color: "var(--pixel-error)",
                backgroundColor: "var(--pixel-bg-surface)",
              }}
              role="alert"
            >
              {globalError}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-3">
              <div className="relative">
                <PixelInput
                  type="search"
                  label="University"
                  placeholder="Type your university (e.g. ODTÜ, METU, Orta Doğu)"
                  value={uniQuery}
                  onChange={(v) => clearUniversitySelection(v as string)}
                  error={fieldErrors.university}
                />

                {!usingRegistryUni && searching && (
                  <p className="text-xs text-[var(--pixel-text-secondary)] animate-pulse mt-1">
                    Searching...
                  </p>
                )}

                {!usingRegistryUni && !searching && suggestions.length > 0 && (
                  <ul
                    className="absolute left-0 right-0 top-full mt-1 z-50 pixel-panel pixel-panel-inset divide-y divide-[var(--pixel-border)] max-h-[250px] overflow-y-auto animate-fade-in"
                  >
                    {suggestions.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => selectUniversity(u)}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--pixel-text-primary)] hover:bg-[var(--pixel-bg-primary)] transition-colors"
                        >
                          {u.name}
                          <span className="block text-[10px] text-[var(--pixel-text-secondary)]">
                            {u.primaryDomain}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {usingRegistryUni ? (
                <p className="text-xs text-[var(--pixel-success)]">
                  ✓ Matched {selectedUni?.name}. Change the text above to pick another.
                </p>
              ) : (
                uniQuery.trim().length > 0 &&
                !searching &&
                suggestions.length === 0 &&
                uniQuery.trim().length >= 2 && (
                  <p className="text-xs text-[var(--pixel-text-secondary)]">
                    Not in the list? We&apos;ll use &quot;{uniQuery.trim()}&quot; and try to discover it
                    automatically.
                  </p>
                )
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <PixelInput
                type="text"
                label="Faculty / School (optional)"
                placeholder="e.g. Faculty of Engineering"
                value={facultyFreeText}
                onChange={(v) => setFacultyFreeText(v as string)}
              />
              <PixelInput
                type="text"
                label="Department / Major (optional)"
                placeholder="e.g. Electrical & Electronics Engineering"
                value={programFreeText}
                onChange={(v) => setProgramFreeText(v as string)}
              />
              <p className="text-xs text-[var(--pixel-text-secondary)]">
                You can skip this — only your university, year, and term are required.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <PixelInput
                type="select"
                label="Year of study"
                value={year}
                options={[
                  { label: "Select year", value: "" },
                  ...[1, 2, 3, 4, 5, 6, 7, 8].map((y) => ({
                    label: `Year ${y}`,
                    value: String(y),
                  })),
                ]}
                onChange={(v) => setYear(v as string)}
                error={fieldErrors.yearOfStudy}
              />
              <PixelInput
                type="text"
                label="Current term"
                placeholder="e.g. 2025-2026 Fall / Güz"
                value={term}
                onChange={(v) => setTerm(v as string)}
                error={fieldErrors.term}
              />
              <div className="flex flex-wrap gap-2">
                {["Fall / Güz", "Spring / Bahar", "Summer / Yaz"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTerm(t)}
                    className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-text-primary)]"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <PixelInput
                type="select"
                label="Term structure"
                value={termKind}
                options={VALID_TERM_KINDS.map((k) => ({ label: TERM_KIND_LABELS[k], value: k }))}
                onChange={(v) => setTermKind(v as TermKind)}
                error={fieldErrors.termKind}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <PixelInput
                type="textarea"
                label="Your courses this term (optional)"
                placeholder="One code per line or comma-separated, e.g. EE301, EE306, MATH219"
                value={courseCodesText}
                onChange={(v) => setCourseCodesText(v as string)}
              />
              <p className="text-xs text-[var(--pixel-text-secondary)]">
                We&apos;ll match these against your department&apos;s curriculum once it&apos;s found.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--pixel-text-primary)]">
                You&apos;re all set. Nora will start finding your university&apos;s official academic
                calendar and curriculum in the background.
              </p>
              <p className="text-xs text-[var(--pixel-text-secondary)]">
                Have the official PDF already (e.g. the academic calendar)? You can upload it any time
                from the planner once you&apos;re inside — we only use real, official documents.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t-2 border-[var(--pixel-border)]">
            <PixelButton variant="secondary" size="small" onClick={back} disabled={step === 0 || pending}>
              Back
            </PixelButton>

            {step < STEPS.length - 1 ? (
              <PixelButton variant="primary" onClick={next} disabled={!canAdvance}>
                Next
              </PixelButton>
            ) : (
              <PixelButton variant="success" onClick={handleFinish} loading={pending}>
                Enter Nora
              </PixelButton>
            )}
          </div>
        </DialogFrame>
      </div>
    </div>
  );
}

function StepDots({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className="w-3 h-3 border-2"
            style={{
              borderColor: i <= current ? "var(--pixel-accent)" : "var(--pixel-border)",
              backgroundColor: i < current ? "var(--pixel-accent)" : "transparent",
            }}
          />
          <span
            className="font-pixel text-[8px] hidden sm:block"
            style={{ color: i === current ? "var(--pixel-accent)" : "var(--pixel-text-secondary)" }}
          >
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
