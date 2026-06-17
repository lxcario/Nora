"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parsePdf } from "../rag/parser";
import type { Section } from "../rag/parser";
import { chunkText } from "../rag/chunker";
import { generateEmbeddings } from "../rag/embedder";
import { validateUploadInput, validateUrl } from "../rag/validation";
import { assertPublicHttpUrl } from "@/lib/ssrf";
import type { AcademicKind } from "@/lib/supabase/database.types";

// --- Constants (mirror rag.ts) ---
const MAX_DOWNLOAD_SIZE = 50 * 1024 * 1024; // 50 MB
const DOWNLOAD_TIMEOUT_MS = 30_000;
const PDF_HEADER = "%PDF";

const ACADEMIC_KINDS: readonly AcademicKind[] = [
  "academic_calendar",
  "curriculum",
  "course_catalog",
  "syllabus",
  "handbook",
  "announcement",
] as const;

export interface AcademicIngestResult {
  data?: { paperId: string; status: string; scanned?: boolean };
  error?: string;
}

function isAcademicKind(v: unknown): v is AcademicKind {
  return typeof v === "string" && (ACADEMIC_KINDS as readonly string[]).includes(v);
}

// --- Shared profile lookup ---

async function getCurrentProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Shared parse → chunk → embed → store core for academic documents.
 * REUSES the existing pipeline modules unchanged (parser/chunker/embedder)
 * and the `paper_chunks` table. Tags nothing here — tagging happens on the
 * `papers` row at creation time.
 *
 * Scanned/image-only PDFs surface as parsePdf throwing the "<20 non-whitespace
 * characters" error; we mark the paper failed with a manual-upload hint and do
 * NOT attempt OCR (Requirement 6.5).
 */
async function runAcademicPipeline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paperId: string,
  buffer: Buffer
): Promise<{ status: string; scanned: boolean }> {
  let parseResult;
  try {
    parseResult = await parsePdf(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parsing failed";
    const scanned = msg.includes("fewer than 20 non-whitespace");
    await supabase
      .from("papers")
      .update({
        parse_status: "failed",
        parse_error: (scanned
          ? "This looks like a scanned/image-only PDF. Please upload a text-based PDF or paste the text — we do not run OCR. "
          : ""
        ).concat(msg).slice(0, 2000),
      })
      .eq("id", paperId);
    return { status: "failed", scanned };
  }

  if (parseResult.metadata.title) {
    await supabase
      .from("papers")
      .update({ title: parseResult.metadata.title })
      .eq("id", paperId);
  }

  const chunks = chunkText(parseResult.sections);
  if (chunks.length === 0) {
    await supabase
      .from("papers")
      .update({
        parse_status: "failed",
        parse_error: "No content could be extracted from the document.",
      })
      .eq("id", paperId);
    return { status: "failed", scanned: false };
  }

  const texts = chunks.map((c) => c.content);
  let embeddings: (number[] | null)[];
  try {
    embeddings = await generateEmbeddings(texts);
  } catch (embErr) {
    // Partial: store chunks without embeddings (FTS still works via content_tsv).
    await supabase.from("paper_chunks").insert(
      chunks.map((c) => ({
        user_id: userId,
        paper_id: paperId,
        chunk_index: c.chunkIndex,
        content: c.content,
        section_heading: c.sectionHeading || null,
        embedding: null,
      }))
    );
    await supabase
      .from("papers")
      .update({
        parse_status: "partial",
        parse_error: `Embedding generation failed: ${
          embErr instanceof Error ? embErr.message : "Unknown error"
        }`.slice(0, 2000),
        chunk_count: chunks.length,
      })
      .eq("id", paperId);
    return { status: "partial", scanned: false };
  }

  await supabase.from("paper_chunks").insert(
    chunks.map((c, i) => ({
      user_id: userId,
      paper_id: paperId,
      chunk_index: c.chunkIndex,
      content: c.content,
      section_heading: c.sectionHeading || null,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }))
  );

  await supabase
    .from("papers")
    .update({ parse_status: "ready", chunk_count: chunks.length })
    .eq("id", paperId);

  return { status: "ready", scanned: false };
}

// --- Public actions ---

/**
 * Ingest an academic PDF from a file upload, tagged with its academic_kind and
 * the owning academic profile. Reuses the existing pipeline + `papers` bucket.
 * Requirements: 6.1, 6.2, 6.3, 6.5.
 */
export async function ingestAcademicPdf(formData: FormData): Promise<AcademicIngestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profileId = await getCurrentProfileId(supabase, user.id);
  if (!profileId) return { error: "Complete onboarding before uploading academic documents." };

  const kindRaw = formData.get("academic_kind");
  if (!isAcademicKind(kindRaw)) {
    return { error: "Please choose what kind of document this is." };
  }
  const academicKind: AcademicKind = kindRaw;

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  const validation = validateUploadInput({ name: file.name, type: file.type, size: file.size });
  if (!validation.valid) return { error: validation.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.slice(0, 4).toString("ascii").startsWith(PDF_HEADER)) {
    return { error: "File does not appear to be a valid PDF" };
  }

  const title = file.name.replace(/\.pdf$/i, "");
  const { data: paper, error: insertError } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title,
      parse_status: "processing",
      academic_kind: academicKind,
      academic_profile_id: profileId,
    })
    .select("id")
    .single();

  if (insertError || !paper) {
    return { error: insertError?.message ?? "Failed to create document record" };
  }

  const paperId = paper.id;
  const storagePath = `${user.id}/${paperId}.pdf`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    await supabase.from("papers").update({ storage_path: storagePath }).eq("id", paperId);

    const { status, scanned } = await runAcademicPipeline(supabase, user.id, paperId, buffer);
    revalidatePath("/app/planner");
    return {
      data: { paperId, status, scanned },
      error: status === "failed" ? "Could not extract text from this document." : undefined,
    };
  } catch (pipelineError) {
    const errorMsg = pipelineError instanceof Error ? pipelineError.message : "Pipeline failed";
    await supabase
      .from("papers")
      .update({ parse_status: "failed", parse_error: errorMsg.slice(0, 2000) })
      .eq("id", paperId);
    revalidatePath("/app/planner");
    return { error: errorMsg };
  }
}

/**
 * Ingest an academic PDF from an official URL (SSRF-guarded), tagged with its
 * kind and profile. Used by manual URL entry now and the discovery pipeline
 * later (Task 9). Requirements: 5.1, 6.1, 6.2, 6.3, 6.5.
 */
export async function ingestAcademicUrl(
  url: string,
  kind: AcademicKind
): Promise<AcademicIngestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profileId = await getCurrentProfileId(supabase, user.id);
  if (!profileId) return { error: "Complete onboarding before adding academic documents." };

  if (!isAcademicKind(kind)) return { error: "Invalid document kind." };

  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) return { error: urlValidation.error };

  // SSRF guard: blocks private/loopback/link-local/metadata addresses.
  const ssrfCheck = await assertPublicHttpUrl(url);
  if (!ssrfCheck.ok) return { error: ssrfCheck.error ?? "URL is not allowed" };

  let buffer: Buffer;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual", // a redirect could bypass the SSRF check
        headers: { "User-Agent": "PixelStudyOS/1.0" },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const m = fetchError instanceof Error ? fetchError.message : "Network error";
      if (fetchError instanceof Error && (fetchError.name === "AbortError" || m.includes("abort"))) {
        return { error: "Download timed out" };
      }
      return { error: `Download failed: ${m}` };
    }
    clearTimeout(timeoutId);

    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return { error: "URL redirects are not allowed for security reasons" };
    }
    if (!response.ok) return { error: `Download failed: ${response.status}` };

    buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_DOWNLOAD_SIZE) {
      return { error: "File exceeds the maximum allowed size of 50 MB" };
    }
    if (!buffer.slice(0, 4).toString("ascii").startsWith(PDF_HEADER)) {
      return { error: "URL does not point to a PDF file" };
    }
  } catch (downloadError) {
    const m = downloadError instanceof Error ? downloadError.message : "Unknown error";
    return { error: `Download failed: ${m}` };
  }

  const titleFromUrl = (() => {
    try {
      const segs = new URL(url).pathname.split("/").filter(Boolean);
      return decodeURIComponent((segs[segs.length - 1] || "Academic document").replace(/\.pdf$/i, ""));
    } catch {
      return "Academic document";
    }
  })();

  const { data: paper, error: insertError } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title: titleFromUrl,
      url,
      parse_status: "processing",
      academic_kind: kind,
      academic_profile_id: profileId,
    })
    .select("id")
    .single();

  if (insertError || !paper) {
    return { error: insertError?.message ?? "Failed to create document record" };
  }

  const paperId = paper.id;
  const storagePath = `${user.id}/${paperId}.pdf`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    await supabase.from("papers").update({ storage_path: storagePath }).eq("id", paperId);

    const { status, scanned } = await runAcademicPipeline(supabase, user.id, paperId, buffer);
    revalidatePath("/app/planner");
    return {
      data: { paperId, status, scanned },
      error: status === "failed" ? "Could not extract text from this document." : undefined,
    };
  } catch (pipelineError) {
    const errorMsg = pipelineError instanceof Error ? pipelineError.message : "Pipeline failed";
    await supabase
      .from("papers")
      .update({ parse_status: "failed", parse_error: errorMsg.slice(0, 2000) })
      .eq("id", paperId);
    revalidatePath("/app/planner");
    return { error: errorMsg };
  }
}

// --- Reads / management ---

export interface AcademicDocument {
  id: string;
  title: string;
  academicKind: AcademicKind | null;
  parseStatus: "pending" | "processing" | "ready" | "partial" | "failed";
  parseError: string | null;
  chunkCount: number;
  url: string | null;
  createdAt: string;
}

/**
 * List the current user's ingested academic documents (tagged papers) with
 * their kind and parse status. Requirement 6.3, 11.1.
 */
export async function getAcademicDocuments(): Promise<AcademicDocument[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const profileId = await getCurrentProfileId(supabase, user.id);
  if (!profileId) return [];

  const { data } = await supabase
    .from("papers")
    .select("id, title, academic_kind, parse_status, parse_error, chunk_count, url, created_at")
    .eq("user_id", user.id)
    .eq("academic_profile_id", profileId)
    .not("academic_kind", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    title: string;
    academic_kind: AcademicKind | null;
    parse_status: AcademicDocument["parseStatus"] | null;
    parse_error: string | null;
    chunk_count: number | null;
    url: string | null;
    created_at: string;
  };

  return ((data ?? []) as Row[]).map((p) => ({
    id: p.id,
    title: p.title,
    academicKind: p.academic_kind,
    parseStatus: p.parse_status ?? "pending",
    parseError: p.parse_error,
    chunkCount: p.chunk_count ?? 0,
    url: p.url,
    createdAt: p.created_at,
  }));
}

/**
 * Delete an academic document the user owns (removes the paper row — chunks
 * cascade — and the stored PDF). Re-verifies ownership (Requirement 17.4).
 */
export async function deleteAcademicDocument(
  paperId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: paper } = await supabase
    .from("papers")
    .select("id, storage_path")
    .eq("id", paperId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!paper) return { ok: false, error: "Document not found" };

  if (paper.storage_path) {
    await supabase.storage.from("papers").remove([paper.storage_path]);
  }
  const { error } = await supabase
    .from("papers")
    .delete()
    .eq("id", paperId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/academic");
  revalidatePath("/app/planner");
  return { ok: true };
}

// --- Markdown ingestion (for scraped HTML pages, Requirement 6.4) ---

/** Split cleaned markdown into sections at ATX headings for the chunker. */
function markdownToSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let heading = "";
  let buffer: string[] = [];

  const flush = () => {
    const paragraphs = buffer.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 0) sections.push({ heading, paragraphs });
    buffer = [];
  };

  for (const line of lines) {
    const h = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (h) {
      flush();
      heading = h[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  if (sections.length === 0 && markdown.trim()) {
    sections.push({ heading: "", paragraphs: [markdown.trim()] });
  }
  return sections;
}

/**
 * Ingest cleaned markdown (from a scraped official HTML page) through the same
 * chunk → embed → store pipeline, tagged with its academic kind and profile.
 * Used by the discovery `fetch_source` handler for non-PDF sources.
 */
export async function ingestAcademicMarkdown(
  markdown: string,
  opts: { title: string; url?: string | null; kind: AcademicKind }
): Promise<AcademicIngestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const profileId = await getCurrentProfileId(supabase, user.id);
  if (!profileId) return { error: "No academic profile" };

  if (!isAcademicKind(opts.kind)) return { error: "Invalid document kind." };
  if (markdown.replace(/\s/g, "").length < 20) {
    return { error: "Scraped page had too little text to index." };
  }

  const { data: paper, error: insertError } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title: opts.title.slice(0, 300),
      url: opts.url ?? null,
      parse_status: "processing",
      academic_kind: opts.kind,
      academic_profile_id: profileId,
    })
    .select("id")
    .single();
  if (insertError || !paper) {
    return { error: insertError?.message ?? "Failed to create document record" };
  }

  const paperId = paper.id;
  const chunks = chunkText(markdownToSections(markdown));
  if (chunks.length === 0) {
    await supabase
      .from("papers")
      .update({ parse_status: "failed", parse_error: "No content could be extracted." })
      .eq("id", paperId);
    return { data: { paperId, status: "failed" }, error: "No content extracted" };
  }

  let embeddings: (number[] | null)[];
  try {
    embeddings = await generateEmbeddings(chunks.map((c) => c.content));
  } catch {
    embeddings = chunks.map(() => null);
  }

  await supabase.from("paper_chunks").insert(
    chunks.map((c, i) => ({
      user_id: user.id,
      paper_id: paperId,
      chunk_index: c.chunkIndex,
      content: c.content,
      section_heading: c.sectionHeading || null,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }))
  );
  await supabase
    .from("papers")
    .update({ parse_status: "ready", chunk_count: chunks.length })
    .eq("id", paperId);

  return { data: { paperId, status: "ready" } };
}
