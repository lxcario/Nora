"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DialogFrame, PixelButton, PixelInput } from "@/components/pixel-ui";
import type { AcademicKind } from "@/lib/supabase/database.types";
import {
  ingestAcademicPdf,
  getAcademicDocuments,
  deleteAcademicDocument,
  type AcademicDocument,
} from "@/app/(protected)/app/_actions/academic/ingest";
import { extractAcademicEvents } from "@/app/(protected)/app/_actions/academic/extract";

const KIND_OPTIONS: { label: string; value: AcademicKind }[] = [
  { label: "Academic calendar", value: "academic_calendar" },
  { label: "Curriculum", value: "curriculum" },
  { label: "Course catalog", value: "course_catalog" },
  { label: "Syllabus", value: "syllabus" },
  { label: "Handbook", value: "handbook" },
  { label: "Announcement", value: "announcement" },
];

const KIND_LABEL: Record<AcademicKind, string> = {
  academic_calendar: "Academic calendar",
  curriculum: "Curriculum",
  course_catalog: "Course catalog",
  syllabus: "Syllabus",
  handbook: "Handbook",
  announcement: "Announcement",
};

const STATUS_STYLE: Record<
  AcademicDocument["parseStatus"],
  { label: string; color: string }
> = {
  pending: { label: "Queued", color: "var(--pixel-text-secondary)" },
  processing: { label: "Processing", color: "var(--pixel-accent)" },
  ready: { label: "Ready", color: "var(--pixel-success)" },
  partial: { label: "Indexed (no embeddings)", color: "var(--pixel-warning)" },
  failed: { label: "Failed", color: "var(--pixel-error)" },
};

export function AcademicDocumentsPanel({
  initialDocuments,
}: {
  initialDocuments: AcademicDocument[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<AcademicDocument[]>(initialDocuments);
  const [kind, setKind] = useState<AcademicKind>("academic_calendar");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasInFlight = documents.some(
    (d) => d.parseStatus === "pending" || d.parseStatus === "processing"
  );

  // Light polling only while something is still processing.
  useEffect(() => {
    if (!hasInFlight) return;
    const id = setInterval(async () => {
      setDocuments(await getAcademicDocuments());
    }, 2500);
    return () => clearInterval(id);
  }, [hasInFlight]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: "error", text: "Choose a PDF to upload." });
      return;
    }
    setUploading(true);
    setMessage(null);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("academic_kind", kind);
    const res = await ingestAcademicPdf(fd);

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    if (res.error && !res.data) {
      setMessage({ kind: "error", text: res.error });
    } else if (res.data?.scanned) {
      setMessage({
        kind: "error",
        text: "That PDF looks scanned/image-only. Please upload a text-based PDF or paste the text — we don't run OCR.",
      });
    } else if (res.data?.status === "ready") {
      setMessage({ kind: "info", text: "Document indexed and ready." });
    } else if (res.data?.status === "partial") {
      setMessage({ kind: "info", text: "Document indexed (searchable; embeddings unavailable)." });
    } else if (res.error) {
      setMessage({ kind: "error", text: res.error });
    }

    setDocuments(await getAcademicDocuments());
  }

  async function handleDelete(id: string) {
    setDocuments((docs) => docs.filter((d) => d.id !== id));
    const res = await deleteAcademicDocument(id);
    if (!res.ok) {
      setMessage({ kind: "error", text: res.error ?? "Could not delete document." });
      setDocuments(await getAcademicDocuments());
    }
  }

  async function handleExtract(id: string) {
    setExtractingId(id);
    setMessage(null);
    const res = await extractAcademicEvents(id);
    setExtractingId(null);
    if (!res.ok) {
      setMessage({ kind: "error", text: res.error ?? "Could not extract dates." });
      return;
    }
    const c = res.counts!;
    setMessage({
      kind: "info",
      text: `Found ${c.kept} grounded date${c.kept === 1 ? "" : "s"}${
        c.unreleased > 0 ? `, ${c.unreleased} marked unreleased` : ""
      }. Review them below or on your planner.`,
    });
    // Refresh the page to show extracted events in the review panel
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <DialogFrame title="UPLOAD AN OFFICIAL DOCUMENT">
        <form onSubmit={handleUpload} className="space-y-3">
          <p className="text-xs text-[var(--pixel-text-secondary)]">
            Upload your university&apos;s official PDF (academic calendar, curriculum, syllabus…). We
            only use real, official documents — never invented dates.
          </p>

          <PixelInput
            type="select"
            label="Document type"
            value={kind}
            options={KIND_OPTIONS}
            onChange={(v) => setKind(v as AcademicKind)}
          />

          <div className="flex flex-col gap-1">
            <label className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
              PDF file
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="text-sm text-[var(--pixel-text-secondary)] file:mr-3 file:border-2 file:border-[var(--pixel-border)] file:bg-[var(--pixel-bg-surface)] file:px-3 file:py-1 file:font-pixel file:text-xs file:text-[var(--pixel-text-primary)]"
            />
          </div>

          {message && (
            <p
              className="text-xs"
              style={{
                color: message.kind === "error" ? "var(--pixel-error)" : "var(--pixel-success)",
              }}
              role={message.kind === "error" ? "alert" : undefined}
            >
              {message.text}
            </p>
          )}

          <PixelButton type="submit" variant="primary" loading={uploading}>
            Upload &amp; index
          </PixelButton>
        </form>
      </DialogFrame>

      <DialogFrame title="MY ACADEMIC DOCUMENTS">
        {documents.length === 0 ? (
          <p className="text-sm text-[var(--pixel-text-secondary)]">
            No academic documents yet. Upload your academic calendar to get real dates in your planner.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => {
              const status = STATUS_STYLE[doc.parseStatus];
              return (
                <li
                  key={doc.id}
                  className="pixel-panel pixel-panel-inset flex items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--pixel-text-primary)] truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-pixel text-[9px] px-1.5 py-0.5 border border-[var(--pixel-border)] text-[var(--pixel-text-secondary)]">
                        {doc.academicKind ? KIND_LABEL[doc.academicKind] : "Document"}
                      </span>
                      <span className="text-[10px] font-pixel" style={{ color: status.color }}>
                        {status.label}
                      </span>
                      {doc.parseStatus === "ready" && (
                        <span className="text-[10px] text-[var(--pixel-text-secondary)]">
                          {doc.chunkCount} chunks
                        </span>
                      )}
                    </div>
                    {doc.parseStatus === "failed" && doc.parseError && (
                      <p className="text-[10px] text-[var(--pixel-error)] mt-1 line-clamp-2">
                        {doc.parseError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(doc.parseStatus === "ready" || doc.parseStatus === "partial") && (
                      <button
                        type="button"
                        onClick={() => handleExtract(doc.id)}
                        disabled={extractingId === doc.id}
                        className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-accent)] text-[var(--pixel-accent)] hover:brightness-110 disabled:opacity-50"
                      >
                        {extractingId === doc.id ? "Reading…" : "Extract dates"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="font-pixel text-[10px] px-2 py-1 border-2 border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-error)] hover:border-[var(--pixel-error)]"
                      aria-label={`Delete ${doc.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogFrame>
    </div>
  );
}
