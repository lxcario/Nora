"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateExam } from "@/app/(protected)/app/_actions/exam";
import { DialogFrame, PixelButton, PixelInput } from "@/components/pixel-ui";
import { Upload, FileText, Loader2, BookOpen, Zap, Clock } from "lucide-react";

export function ExamSetup() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 100 * 1024 * 1024) {
        setError("File too large. Maximum 100 MB.");
        return;
      }
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported.");
        return;
      }
      setFile(selected);
      setError(null);
    }
  }

  function handleGenerate() {
    if (!file && notes.trim().length < 100) {
      setError("Please upload a PDF or paste at least 100 characters of notes.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("mode", mode);
      formData.set("timerEnabled", String(timerEnabled));
      formData.set("notes", notes);
      formData.set("paperIds", "");
      if (file) formData.set("file", file);

      const result = await generateExam(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        router.push(`/app/exam/${result.data.examId}`);
      }
    });
  }

  const hasSource = !!file || notes.trim().length >= 100;

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <DialogFrame title="EXAM MODE">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className="pixel-panel pixel-panel-inset flex items-center gap-3 p-4 text-left transition-all"
            style={{
              borderColor: mode === "quick" ? "var(--pixel-accent)" : "var(--pixel-border)",
              borderWidth: "2px",
              backgroundColor: mode === "quick" ? "color-mix(in srgb, var(--pixel-accent) 10%, var(--pixel-bg-surface))" : undefined,
            }}
          >
            <Zap className="h-5 w-5 shrink-0" style={{ color: mode === "quick" ? "var(--pixel-accent)" : "var(--pixel-text-secondary)" }} />
            <div>
              <span className="font-pixel text-sm block" style={{ color: "var(--pixel-text-primary)" }}>
                Quick Quiz
              </span>
              <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                10 questions · 10 min
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("full")}
            className="pixel-panel pixel-panel-inset flex items-center gap-3 p-4 text-left transition-all"
            style={{
              borderColor: mode === "full" ? "var(--pixel-accent)" : "var(--pixel-border)",
              borderWidth: "2px",
              backgroundColor: mode === "full" ? "color-mix(in srgb, var(--pixel-accent) 10%, var(--pixel-bg-surface))" : undefined,
            }}
          >
            <BookOpen className="h-5 w-5 shrink-0" style={{ color: mode === "full" ? "var(--pixel-accent)" : "var(--pixel-text-secondary)" }} />
            <div>
              <span className="font-pixel text-sm block" style={{ color: "var(--pixel-text-primary)" }}>
                Full Exam
              </span>
              <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                20 questions · 30 min
              </span>
            </div>
          </button>
        </div>

        {/* Timer toggle */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimerEnabled(!timerEnabled)}
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: "var(--pixel-text-secondary)" }}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timer: </span>
            <span className="font-pixel" style={{ color: timerEnabled ? "var(--pixel-success)" : "var(--pixel-text-muted)" }}>
              {timerEnabled ? "ON" : "OFF (calm mode)"}
            </span>
          </button>
        </div>
      </DialogFrame>

      {/* Source material */}
      <DialogFrame title="YOUR STUDY MATERIAL">
        <p className="text-xs mb-3" style={{ color: "var(--pixel-text-secondary)" }}>
          Upload a PDF (lecture slides, textbook chapter, paper) or paste your notes below. The exam will ONLY test content from what you provide.
        </p>

        {/* PDF Upload */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full pixel-panel pixel-panel-inset flex items-center justify-center gap-3 p-4 transition-colors"
            style={{
              borderStyle: "dashed",
              borderColor: file ? "var(--pixel-success)" : "var(--pixel-border)",
              backgroundColor: file ? "color-mix(in srgb, var(--pixel-success) 8%, var(--pixel-bg-surface))" : undefined,
            }}
          >
            {file ? (
              <>
                <FileText className="h-5 w-5" style={{ color: "var(--pixel-success)" }} />
                <span className="text-sm" style={{ color: "var(--pixel-success)" }}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" style={{ color: "var(--pixel-text-secondary)" }} />
                <span className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
                  Upload PDF (max 100 MB)
                </span>
              </>
            )}
          </button>
          {file && (
            <button
              type="button"
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="mt-1 text-xs"
              style={{ color: "var(--pixel-error)" }}
            >
              Remove file
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--pixel-border)" }} />
          <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>OR / AND</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--pixel-border)" }} />
        </div>

        {/* Notes textarea */}
        <div>
          <label className="font-pixel text-[10px] block mb-1" style={{ color: "var(--pixel-text-secondary)" }}>
            PASTE YOUR NOTES
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your lecture notes, textbook excerpts, or study material here..."
            rows={6}
            className="w-full resize-y text-sm"
            style={{
              backgroundColor: "var(--pixel-bg-primary)",
              border: "2px solid var(--pixel-border)",
              color: "var(--pixel-text-primary)",
              padding: "12px",
            }}
            maxLength={50000}
          />
          <span className="text-[10px] block text-right mt-0.5" style={{ color: "var(--pixel-text-muted)" }}>
            {notes.length.toLocaleString()} / 50,000
          </span>
        </div>
      </DialogFrame>

      {/* Error */}
      {error && (
        <div
          className="px-4 py-3 text-sm"
          style={{
            color: "var(--pixel-error)",
            border: "2px solid var(--pixel-error)",
            backgroundColor: "color-mix(in srgb, var(--pixel-error) 8%, var(--pixel-bg-surface))",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Generate button */}
      <PixelButton
        variant="primary"
        onClick={handleGenerate}
        disabled={isPending || !hasSource}
        loading={isPending}
        className="w-full"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating exam from your material...
          </span>
        ) : (
          `Generate ${mode === "quick" ? "Quick Quiz (10 Q)" : "Full Exam (20 Q)"}`
        )}
      </PixelButton>

      {isPending && (
        <p className="text-center text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          AI is reading your material and crafting questions. This takes 10-20 seconds.
        </p>
      )}
    </div>
  );
}
