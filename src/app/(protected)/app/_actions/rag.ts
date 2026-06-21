"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUploadInput, validateUrl, validateQuestion } from "./rag/validation";
import { parsePdf } from "./rag/parser";
import { chunkText } from "./rag/chunker";
import { generateEmbeddings, generateQueryEmbedding, hasEmbeddingSupport } from "./rag/embedder";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { NORA_VOICE_RESEARCH } from "@/lib/nora-voice";
import { assertPublicHttpUrl } from "@/lib/ssrf";
import { classifyEventType } from "@/lib/academic/academic-extract";

// --- Types ---

export interface IngestionResult {
  data?: { paperId: string; status: string };
  error?: string;
}

export interface RagScope {
  type: "all" | "paper" | "topic" | "academic";
  paperId?: string;
  topicId?: string;
}

export interface Citation {
  paperId: string;
  paperTitle: string;
  sectionHeading: string;
  chunkIndex: number;
  snippet: string; // max 300 chars
}

export interface RagAnswer {
  answer: string;
  citations: Citation[];
  suggestedCards: { front: string; back: string }[];
}

// --- Constants ---

const MAX_DOWNLOAD_SIZE = 50 * 1024 * 1024; // 50 MB
const DOWNLOAD_TIMEOUT_MS = 30_000; // 30 seconds
const PDF_HEADER = "%PDF";
const LLM_TIMEOUT_MS = 30_000; // 30 seconds for LLM calls
const KEYWORD_TIMEOUT_MS = 8_000; // 8 seconds for keyword extraction

// --- Server Actions ---

/**
 * Ingest a PDF from a file upload.
 * Validates, uploads to storage, parses, chunks, embeds, and stores.
 */
export async function ingestPdf(formData: FormData): Promise<IngestionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  // Validate upload input
  const validation = validateUploadInput({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!validation.valid) return { error: validation.error };

  // Read buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Verify PDF header
  const header = buffer.slice(0, 4).toString("ascii");
  if (!header.startsWith(PDF_HEADER)) {
    return { error: "File does not appear to be a valid PDF" };
  }

  // Create paper record
  const title = file.name.replace(/\.pdf$/i, "");
  const { data: paper, error: insertError } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title,
      parse_status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !paper) {
    return { error: insertError?.message ?? "Failed to create paper record" };
  }

  const paperId = paper.id;
  const storagePath = `${user.id}/${paperId}.pdf`;

  try {
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Update storage path on paper
    await supabase
      .from("papers")
      .update({ storage_path: storagePath })
      .eq("id", paperId);

    // Parse PDF
    const parseResult = await parsePdf(buffer);

    // Update title from metadata if available
    if (parseResult.metadata.title) {
      await supabase
        .from("papers")
        .update({ title: parseResult.metadata.title })
        .eq("id", paperId);
    }

    // Update authors from metadata if available
    if (parseResult.metadata.author) {
      await supabase
        .from("papers")
        .update({ authors: [parseResult.metadata.author] })
        .eq("id", paperId);
    }

    // Chunk the text
    const chunks = chunkText(parseResult.sections);

    if (chunks.length === 0) {
      await supabase
        .from("papers")
        .update({
          parse_status: "failed",
          parse_error: "No content could be extracted from the PDF",
        })
        .eq("id", paperId);
      return { data: { paperId, status: "failed" }, error: "No content could be extracted" };
    }

    // Generate embeddings
    const texts = chunks.map((c) => c.content);
    let embeddings: (number[] | null)[];
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (embError) {
      // Partial failure — store chunks without embeddings
      const chunkRows = chunks.map((c) => ({
        user_id: user.id,
        paper_id: paperId,
        chunk_index: c.chunkIndex,
        content: c.content,
        section_heading: c.sectionHeading || null,
        embedding: null,
      }));
      await supabase.from("paper_chunks").insert(chunkRows);
      await supabase
        .from("papers")
        .update({
          parse_status: "partial",
          parse_error: `Embedding generation failed: ${embError instanceof Error ? embError.message : "Unknown error"}`,
          chunk_count: chunks.length,
        })
        .eq("id", paperId);
      revalidatePath("/app/research");
      return { data: { paperId, status: "partial" } };
    }

    // Store chunks with embeddings
    const chunkRows = chunks.map((c, i) => ({
      user_id: user.id,
      paper_id: paperId,
      chunk_index: c.chunkIndex,
      content: c.content,
      section_heading: c.sectionHeading || null,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }));
    await supabase.from("paper_chunks").insert(chunkRows);

    // Update paper to ready
    await supabase
      .from("papers")
      .update({
        parse_status: "ready",
        chunk_count: chunks.length,
      })
      .eq("id", paperId);

    revalidatePath("/app/research");
    return { data: { paperId, status: "ready" } };
  } catch (pipelineError) {
    // Mark as failed
    const errorMsg =
      pipelineError instanceof Error ? pipelineError.message : "Pipeline failed";
    await supabase
      .from("papers")
      .update({
        parse_status: "failed",
        parse_error: errorMsg.slice(0, 2000),
      })
      .eq("id", paperId);
    revalidatePath("/app/research");
    return { error: errorMsg };
  }
}

/**
 * Ingest a PDF from a URL.
 * Downloads with 30s timeout, verifies PDF header and size ≤ 50 MB,
 * then runs the same pipeline as ingestPdf.
 *
 * If paperId is provided, updates the existing paper record.
 * Otherwise creates a new one.
 */
export async function ingestFromUrl(
  url: string,
  paperId?: string
): Promise<IngestionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate URL (syntactic) then guard against SSRF (resolves DNS and
  // blocks private/loopback/link-local/metadata addresses before fetching).
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) return { error: urlValidation.error };

  const ssrfCheck = await assertPublicHttpUrl(url);
  if (!ssrfCheck.ok) return { error: ssrfCheck.error ?? "URL is not allowed" };

  // Download PDF with 30-second timeout
  let buffer: Buffer;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        // Do not auto-follow redirects: a redirect could point at an internal
        // address that bypassed the initial SSRF check.
        redirect: "manual",
        headers: {
          "User-Agent": "PixelStudyOS/1.0",
        },
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (
        fetchError instanceof Error &&
        (fetchError.name === "AbortError" || fetchError.message.includes("abort"))
      ) {
        return { error: "Download timed out" };
      }
      return { error: `Download failed: ${fetchError instanceof Error ? fetchError.message : "Network error"}` };
    }

    clearTimeout(timeoutId);

    // Reject redirects outright (opaqueredirect/3xx) to avoid SSRF via redirect.
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return { error: "URL redirects are not allowed for security reasons" };
    }

    // Check for non-2xx response
    if (!response.ok) {
      return { error: `Download failed: ${response.status}` };
    }

    // Read the response body as buffer
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);

    // Check file size ≤ 50 MB
    if (buffer.length > MAX_DOWNLOAD_SIZE) {
      return { error: "File exceeds the maximum allowed size of 50 MB" };
    }

    // Verify PDF header (%PDF)
    const header = buffer.slice(0, 4).toString("ascii");
    if (!header.startsWith(PDF_HEADER)) {
      return { error: "URL does not point to a PDF file" };
    }
  } catch (downloadError: unknown) {
    if (
      downloadError instanceof Error &&
      (downloadError.name === "AbortError" || downloadError.message.includes("abort"))
    ) {
      return { error: "Download timed out" };
    }
    return {
      error: `Download failed: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`,
    };
  }

  // Create or update paper record
  let currentPaperId: string;

  if (paperId) {
    // Update existing paper record
    const { error: updateError } = await supabase
      .from("papers")
      .update({
        parse_status: "processing",
        parse_error: null,
        url,
      })
      .eq("id", paperId)
      .eq("user_id", user.id);

    if (updateError) {
      return { error: `Failed to update paper record: ${updateError.message}` };
    }
    currentPaperId = paperId;
  } else {
    // Create new paper record
    const titleFromUrl = extractTitleFromUrl(url);
    const { data: paper, error: insertError } = await supabase
      .from("papers")
      .insert({
        user_id: user.id,
        title: titleFromUrl,
        url,
        parse_status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !paper) {
      return { error: insertError?.message ?? "Failed to create paper record" };
    }
    currentPaperId = paper.id;
  }

  const storagePath = `${user.id}/${currentPaperId}.pdf`;

  try {
    // Upload downloaded PDF to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("papers")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Update storage path on paper
    await supabase
      .from("papers")
      .update({ storage_path: storagePath })
      .eq("id", currentPaperId);

    // Set parse_status to "processing"
    await supabase
      .from("papers")
      .update({ parse_status: "processing" })
      .eq("id", currentPaperId);

    // Parse PDF
    const parseResult = await parsePdf(buffer);

    // Update title from metadata if available
    if (parseResult.metadata.title) {
      await supabase
        .from("papers")
        .update({ title: parseResult.metadata.title })
        .eq("id", currentPaperId);
    }

    // Update authors from metadata if available
    if (parseResult.metadata.author) {
      await supabase
        .from("papers")
        .update({ authors: [parseResult.metadata.author] })
        .eq("id", currentPaperId);
    }

    // Chunk the text
    const chunks = chunkText(parseResult.sections);

    if (chunks.length === 0) {
      await supabase
        .from("papers")
        .update({
          parse_status: "failed",
          parse_error: "No content could be extracted from the PDF",
        })
        .eq("id", currentPaperId);
      revalidatePath("/app/research");
      return { data: { paperId: currentPaperId, status: "failed" }, error: "No content could be extracted" };
    }

    // Generate embeddings
    const texts = chunks.map((c) => c.content);
    let embeddings: (number[] | null)[];
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (embError) {
      // Partial failure — store chunks without embeddings
      const chunkRows = chunks.map((c) => ({
        user_id: user.id,
        paper_id: currentPaperId,
        chunk_index: c.chunkIndex,
        content: c.content,
        section_heading: c.sectionHeading || null,
        embedding: null,
      }));
      await supabase.from("paper_chunks").insert(chunkRows);
      await supabase
        .from("papers")
        .update({
          parse_status: "partial",
          parse_error: `Embedding generation failed: ${embError instanceof Error ? embError.message : "Unknown error"}`,
          chunk_count: chunks.length,
        })
        .eq("id", currentPaperId);
      revalidatePath("/app/research");
      return { data: { paperId: currentPaperId, status: "partial" } };
    }

    // Store chunks with embeddings
    const chunkRows = chunks.map((c, i) => ({
      user_id: user.id,
      paper_id: currentPaperId,
      chunk_index: c.chunkIndex,
      content: c.content,
      section_heading: c.sectionHeading || null,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }));
    await supabase.from("paper_chunks").insert(chunkRows);

    // Update paper to ready with chunk_count
    await supabase
      .from("papers")
      .update({
        parse_status: "ready",
        chunk_count: chunks.length,
      })
      .eq("id", currentPaperId);

    revalidatePath("/app/research");
    return { data: { paperId: currentPaperId, status: "ready" } };
  } catch (pipelineError) {
    // Mark as failed
    const errorMsg =
      pipelineError instanceof Error ? pipelineError.message : "Pipeline failed";
    await supabase
      .from("papers")
      .update({
        parse_status: "failed",
        parse_error: errorMsg.slice(0, 2000),
      })
      .eq("id", currentPaperId);
    revalidatePath("/app/research");
    return { error: errorMsg };
  }
}

/**
 * RAG Question-Answering: dual-mode query engine.
 *
 * If OPENAI_API_KEY is set → vector search (embed question → match_paper_chunks RPC → top 8 chunks)
 * If not set → Postgres full-text search (Groq extracts keywords → tsquery on content_tsv → top 8 chunks)
 *
 * Both paths feed results into the same LLM synthesis step (Groq primary, OpenRouter fallback).
 *
 * Requirements: 6.1-6.10, 8.5, 12.2, 12.3, 13.2-13.5
 */
export async function queryRag(
  question: string,
  scope: RagScope
): Promise<{ data?: RagAnswer; error?: string }> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 2. Validate question (3-500 chars)
  const questionValidation = validateQuestion(question);
  if (!questionValidation.valid) return { error: questionValidation.error };

  // 2b. Academic scope: answer from the user's academic documents and, for date
  // questions, the structured academic_events table (Requirement 16.1–16.4).
  if (scope.type === "academic") {
    return queryAcademicRag(supabase, user.id, question);
  }

  // 3. Retrieve chunks (dual-mode)
  let retrievedChunks: RetrievedChunk[];

  try {
    // Hybrid retrieval: combine lexical (ts_rank_cd) + vector (cosine) via RRF.
    // When no embedding key is configured, query_embedding is null and the
    // function degrades to ts_rank_cd-ranked lexical search — never an unranked
    // scan. (spec Req 6.1, 6.2)
    let embedding: number[] | null = null;
    if (hasEmbeddingSupport()) {
      embedding = await generateQueryEmbedding(question);
      if (!embedding) {
        return { error: "Failed to generate query embedding" };
      }
    }

    const { data: hybridRows, error: rpcError } = await supabase.rpc(
      "match_paper_chunks_hybrid",
      {
        query_text: question,
        query_embedding: embedding ? JSON.stringify(embedding) : null,
        match_user_id: user.id,
        match_paper_id: scope.type === "paper" ? scope.paperId ?? null : null,
        match_topic_id: scope.type === "topic" ? scope.topicId ?? null : null,
        match_count: 8,
        rrf_k: 60,
        candidate_pool: 50,
      }
    );

    if (rpcError) {
      return { error: `Paper search failed: ${rpcError.message}` };
    }

    if (!hybridRows || hybridRows.length === 0) {
      // For topic scope with no results, check whether any papers exist at all.
      if (scope.type === "topic" && scope.topicId) {
        const { data: topicPapers } = await supabase
          .from("papers")
          .select("id")
          .eq("user_id", user.id)
          .eq("topic_id", scope.topicId);
        if (!topicPapers || topicPapers.length === 0) {
          return {
            data: {
              answer:
                "No indexed papers available for the selected topic. Upload papers associated with this topic to get started.",
              citations: [],
              suggestedCards: [],
            },
          };
        }
      }
      return {
        data: {
          answer:
            "No relevant content found in your papers. Try rephrasing your question or uploading more papers on this topic.",
          citations: [],
          suggestedCards: [],
        },
      };
    }

    // Fetch paper titles for citation building.
    const paperIds = [
      ...new Set(
        (hybridRows as { paper_id: string }[]).map((c) => c.paper_id)
      ),
    ];
    const { data: papers } = await supabase
      .from("papers")
      .select("id, title")
      .in("id", paperIds);

    const paperTitleMap = new Map<string, string>(
      (papers ?? []).map((p) => [p.id, p.title])
    );

    retrievedChunks = (
      hybridRows as {
        paper_id: string;
        chunk_index: number;
        content: string;
        section_heading: string | null;
        rrf_score: number;
      }[]
    ).map((c) => ({
      paperId: c.paper_id,
      paperTitle: paperTitleMap.get(c.paper_id) ?? "Unknown Paper",
      chunkIndex: c.chunk_index,
      content: c.content,
      sectionHeading: c.section_heading ?? "",
      similarity: c.rrf_score, // rrf_score is the unified relevance signal
    }));
  } catch (retrievalError) {
    const msg = retrievalError instanceof Error ? retrievalError.message : "Search failed";
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { error: "Paper search temporarily unavailable. Please retry." };
    }
    return { error: `Paper search failed: ${msg}` };
  }

  // 5. Synthesize answer using Groq (primary) / OpenRouter (fallback)
  try {
    const ragAnswer = await synthesizeRagAnswer(question, retrievedChunks);
    return { data: ragAnswer };
  } catch (synthesisError) {
    const msg = synthesisError instanceof Error ? synthesisError.message : "Synthesis failed";
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { error: "AI synthesis temporarily unavailable, please retry in 60 seconds" };
    }
    return { error: msg };
  }
}

// --- RAG Internal Types ---

interface RetrievedChunk {
  paperId: string;
  paperTitle: string;
  chunkIndex: number;
  content: string;
  sectionHeading: string;
  similarity: number;
}

// --- RAG Internal Helpers ---

/**
 * Extract 3-5 search keywords from a question using Groq.
 * Used in FTS mode (no OPENAI_API_KEY).
 */
async function extractSearchKeywordsForRag(question: string): Promise<string[]> {
  const naiveFallback = () =>
    question
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);

  if (!process.env.GROQ_API_KEY) {
    return naiveFallback();
  }

  try {
    const keywordsStr = (
      await callLLM({
        system:
          "Extract 3-5 search keywords from the following question. Return only the keywords separated by spaces, no explanation.",
        user: question,
        temperature: 0.3,
        maxTokens: 30,
        groqTimeoutMs: KEYWORD_TIMEOUT_MS,
        groqOnly: true,
      })
    ).trim();

    if (keywordsStr && keywordsStr.length > 2) {
      return keywordsStr.split(/\s+/).filter((w: string) => w.length > 0);
    }
  } catch {
    // Fall through to fallback
  }

  return naiveFallback();
}

/**
 * Build the RAG synthesis prompt from retrieved chunks.
 */
function buildRagPrompt(
  question: string,
  chunks: RetrievedChunk[]
): { systemPrompt: string; userMessage: string } {
  const chunksContext = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Paper: "${c.paperTitle}", Section: "${c.sectionHeading}"\n${c.content}`
    )
    .join("\n\n");

  const systemPrompt = `${NORA_VOICE_RESEARCH}

---

You are a research assistant helping a student understand their papers. Answer the question in 2-5 complete sentences using ONLY the provided source chunks. Always explain the context and significance, not just bare facts. Cite every claim using the format [Paper Title, Section]. If the information is insufficient to answer, say so. Also generate 1-5 flashcard pairs (question/answer) from the key facts in your answer.

Context chunks:
${chunksContext}`;

  const userMessage = `User question: ${question}

IMPORTANT: Write a detailed, multi-paragraph answer (at least 100 words). Explain the context, provide specific details from the sources, and be thorough. Do NOT give single-word or one-line answers.

After your detailed answer, on a new line write "---CITATIONS---" followed by the citations in JSON array format.
Then on a new line write "---CARDS---" followed by the flashcard pairs in JSON array format.

Example format:
[Your detailed multi-paragraph answer here with [Paper Title, Section] citations inline...]

---CITATIONS---
[{"paperId": "...", "paperTitle": "...", "sectionHeading": "...", "chunkIndex": 0, "snippet": "relevant quote"}]

---CARDS---
[{"front": "question?", "back": "detailed answer"}]`;

  return { systemPrompt, userMessage };
}

/**
 * Parse the LLM response into a RagAnswer structure.
 * Handles the split format: answer text, then ---CITATIONS---, then ---CARDS---
 */
function parseRagResponse(
  content: string,
  chunks: RetrievedChunk[]
): RagAnswer {
  // Split on markers
  const citationsSplit = content.split("---CITATIONS---");
  const answerPart = citationsSplit[0]?.trim() ?? content.trim();
  
  let citationsJson = "";
  let cardsJson = "";
  
  if (citationsSplit.length > 1) {
    const remainder = citationsSplit[1];
    const cardsSplit = remainder.split("---CARDS---");
    citationsJson = cardsSplit[0]?.trim() ?? "";
    cardsJson = cardsSplit[1]?.trim() ?? "";
  }

  // Parse answer (take everything before the markers, cap at 3000 chars)
  const answer = answerPart.slice(0, 3000) || content.slice(0, 3000);

  // Parse citations
  let citations: Citation[] = [];
  if (citationsJson) {
    try {
      const parsed = JSON.parse(citationsJson);
      if (Array.isArray(parsed)) {
        citations = parsed
          .filter((c: Record<string, unknown>) => c && c.paperTitle)
          .map((c: Record<string, unknown>) => ({
            paperId: (c.paperId as string) ?? chunks[0]?.paperId ?? "",
            paperTitle: (c.paperTitle as string) ?? "Unknown",
            sectionHeading: (c.sectionHeading as string) ?? "",
            chunkIndex: typeof c.chunkIndex === "number" ? c.chunkIndex : 0,
            snippet: ((c.snippet as string) ?? "").slice(0, 300),
          }));
      }
    } catch {
      // Fall through to default citations
    }
  }

  // If no citations parsed, build from chunks
  if (citations.length === 0) {
    citations = buildDefaultCitations(chunks);
  }

  // Parse suggested cards
  let suggestedCards: { front: string; back: string }[] = [];
  if (cardsJson) {
    try {
      const parsed = JSON.parse(cardsJson);
      if (Array.isArray(parsed)) {
        suggestedCards = parsed
          .filter((c: Record<string, unknown>) => c && c.front && c.back)
          .slice(0, 5)
          .map((c: Record<string, unknown>) => ({
            front: ((c.front as string) ?? "").slice(0, 200),
            back: ((c.back as string) ?? "").slice(0, 1000),
          }));
      }
    } catch {
      // Fall through
    }
  }

  // Ensure at least 1 card
  if (suggestedCards.length === 0) {
    suggestedCards = [{ front: "What are the key findings?", back: answer.slice(0, 200) }];
  }

  return { answer, citations, suggestedCards };
}
/**
 * Validates LLM-generated citations against the retrieved chunk set.
 *
 * For each citation:
 *   - Drop it when its paperId doesn't appear in the retrieved chunks (it
 *     wasn't retrieved, so the LLM hallucinated it).
 *   - Replace chunkIndex with the REAL index from the closest retrieved chunk
 *     (match by sectionHeading first, then fall back to the first chunk for
 *     that paper) — eliminates the "default to 0" anti-pattern. (Req 6.4)
 *
 * This gives RAG-1 guarantee: every emitted citation resolves to a row that
 * was actually returned by the retriever.
 */
function validateCitations(
  citations: Citation[],
  chunks: RetrievedChunk[]
): Citation[] {
  // Index chunks by paperId for fast lookup.
  const byPaper = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const list = byPaper.get(chunk.paperId) ?? [];
    list.push(chunk);
    byPaper.set(chunk.paperId, list);
  }

  const validated: Citation[] = [];
  for (const cite of citations) {
    const paperChunks = byPaper.get(cite.paperId);
    if (!paperChunks || paperChunks.length === 0) continue; // drop unresolvable

    // Prefer a chunk whose sectionHeading matches the citation's sectionHeading.
    const match =
      cite.sectionHeading
        ? (paperChunks.find(
            (c) =>
              c.sectionHeading &&
              c.sectionHeading.toLowerCase() ===
                cite.sectionHeading.toLowerCase()
          ) ?? paperChunks[0])
        : paperChunks[0];

    validated.push({
      ...cite,
      chunkIndex: match.chunkIndex, // real index — never defaults to 0
      sectionHeading: match.sectionHeading || cite.sectionHeading,
    });
  }
  return validated;
}

/**
 * Build default citations from retrieved chunks when LLM doesn't provide them.
 */
function buildDefaultCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.slice(0, 8).map((c) => ({
    paperId: c.paperId,
    paperTitle: c.paperTitle,
    sectionHeading: c.sectionHeading,
    chunkIndex: c.chunkIndex,
    snippet: c.content.slice(0, 300),
  }));
}

/**
 * Synthesize a RAG answer from retrieved chunks using Groq (primary) / OpenRouter (fallback).
 * Matches the Groq/OpenRouter pattern from research.ts.
 */
async function synthesizeRagAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<RagAnswer> {
  if (!hasLLMProvider()) {
    throw new Error("No AI key configured. Cannot synthesize answer.");
  }

  const { systemPrompt, userMessage } = buildRagPrompt(question, chunks);

  let content: string;
  try {
    content = await callLLM({
      system: systemPrompt,
      user: userMessage,
      temperature: 0.3,
      maxTokens: 4096,
      groqTimeoutMs: LLM_TIMEOUT_MS,
      openRouterTimeoutMs: LLM_TIMEOUT_MS,
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("abort"))
    ) {
      throw new Error("AI synthesis temporarily unavailable, please retry in 60 seconds");
    }
    throw err;
  }

  if (content && content.trim()) {
    const raw = parseRagResponse(content, chunks);
    // RAG-1: ensure every emitted citation resolves to an actual retrieved chunk.
    return {
      ...raw,
      citations: validateCitations(raw.citations, chunks),
    };
  }

  // Both providers failed or returned empty (Req 12.3)
  throw new Error("AI synthesis temporarily unavailable, please retry in 60 seconds");
}

// --- Helpers ---

/**
 * Extract a reasonable title from a URL (last path segment without .pdf extension).
 */
function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split("/").filter((s) => s.length > 0);
    const lastSegment = pathSegments[pathSegments.length - 1] || "Untitled";
    return decodeURIComponent(lastSegment.replace(/\.pdf$/i, ""));
  } catch {
    return "Untitled";
  }
}


// --- Types for status/retry/delete actions ---

type ParseStatus = "pending" | "processing" | "ready" | "partial" | "failed";

interface IngestionStatusData {
  paperId: string;
  parseStatus: ParseStatus;
  parseError: string | null;
  chunkCount: number;
}

interface UserPaper {
  id: string;
  title: string;
  parseStatus: ParseStatus;
  parseError: string | null;
  chunkCount: number;
  url: string | null;
  createdAt: string;
  topicId: string | null;
}

/**
 * Gets the current user's papers with RAG-specific fields (parse_status, chunk_count, etc.).
 */
export async function getUserPapers(): Promise<{ papers: UserPaper[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { papers: [] };

  const { data } = await supabase
    .from("papers")
    .select("id, title, parse_status, parse_error, chunk_count, url, created_at, topic_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    papers: (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      parseStatus: (p.parse_status ?? "pending") as ParseStatus,
      parseError: p.parse_error ?? null,
      chunkCount: p.chunk_count ?? 0,
      url: p.url ?? null,
      createdAt: p.created_at,
      topicId: p.topic_id ?? null,
    })),
  };
}

// --- Additional Server Actions ---

/**
 * Gets the current ingestion status of a paper.
 * Returns parse_status, parse_error, and chunk_count.
 *
 * Requirements: 10.3, 10.4, 11.4
 */
export async function getIngestionStatus(
  paperId: string
): Promise<{ data?: IngestionStatusData; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("papers")
    .select("id, parse_status, parse_error, chunk_count")
    .eq("id", paperId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Paper not found" };
  }

  return {
    data: {
      paperId: data.id,
      parseStatus: data.parse_status as ParseStatus,
      parseError: data.parse_error ?? null,
      chunkCount: data.chunk_count ?? 0,
    },
  };
}

/**
 * Retries ingestion for a paper that previously failed or partially succeeded.
 * Resets parse_status to "pending", clears parse_error, fetches the PDF from
 * Supabase Storage, and re-runs the full pipeline (parse → chunk → embed → store).
 *
 * Requirements: 10.3, 10.4, 14.6
 */
export async function retryIngestion(
  paperId: string
): Promise<{ data?: { paperId: string; status: string }; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify paper belongs to user and has a retriable status
  const { data: paper, error: fetchError } = await supabase
    .from("papers")
    .select("id, parse_status, storage_path")
    .eq("id", paperId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !paper) {
    return { error: fetchError?.message ?? "Paper not found" };
  }

  if (paper.parse_status !== "failed" && paper.parse_status !== "partial") {
    return {
      error: `Cannot retry ingestion: paper status is "${paper.parse_status}". Only "failed" or "partial" papers can be retried.`,
    };
  }

  if (!paper.storage_path) {
    return { error: "No PDF file stored for this paper. Cannot retry ingestion." };
  }

  // Reset status to pending and clear error (Req 14.6)
  const { error: resetError } = await supabase
    .from("papers")
    .update({ parse_status: "pending", parse_error: null })
    .eq("id", paperId)
    .eq("user_id", user.id);

  if (resetError) {
    return { error: `Failed to reset paper status: ${resetError.message}` };
  }

  // Set to processing
  await supabase
    .from("papers")
    .update({ parse_status: "processing" })
    .eq("id", paperId)
    .eq("user_id", user.id);

  try {
    // Fetch the PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("papers")
      .download(paper.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from("papers")
        .update({
          parse_status: "failed",
          parse_error: `Failed to download PDF: ${downloadError?.message ?? "File not found"}`,
        })
        .eq("id", paperId)
        .eq("user_id", user.id);
      return { error: `Failed to download PDF: ${downloadError?.message ?? "File not found"}` };
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the PDF
    const parseResult = await parsePdf(buffer);

    // Chunk the text
    const chunks = chunkText(parseResult.sections);

    if (chunks.length === 0) {
      await supabase
        .from("papers")
        .update({
          parse_status: "failed",
          parse_error: "No text chunks could be extracted from the document.",
        })
        .eq("id", paperId)
        .eq("user_id", user.id);
      return { error: "No text chunks could be extracted from the document." };
    }

    // Delete existing chunks before re-inserting
    await supabase
      .from("paper_chunks")
      .delete()
      .eq("paper_id", paperId)
      .eq("user_id", user.id);

    // Generate embeddings
    const texts = chunks.map((c) => c.content);
    let embeddings: (number[] | null)[];
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (embErr) {
      // Partial success: store chunks without embeddings
      const chunkRows = chunks.map((chunk) => ({
        user_id: user.id,
        paper_id: paperId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        section_heading: chunk.sectionHeading || null,
        embedding: null,
      }));

      await supabase.from("paper_chunks").insert(chunkRows);

      const errMsg = embErr instanceof Error ? embErr.message : "Embedding generation failed";
      await supabase
        .from("papers")
        .update({
          parse_status: "partial",
          parse_error: errMsg.slice(0, 2000),
          chunk_count: chunks.length,
        })
        .eq("id", paperId)
        .eq("user_id", user.id);

      return { data: { paperId, status: "partial" } };
    }

    // Store chunks with embeddings
    const chunkRows = chunks.map((chunk, i) => ({
      user_id: user.id,
      paper_id: paperId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      section_heading: chunk.sectionHeading || null,
      embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
    }));

    const { error: insertError } = await supabase
      .from("paper_chunks")
      .insert(chunkRows);

    if (insertError) {
      await supabase
        .from("papers")
        .update({
          parse_status: "failed",
          parse_error: `Failed to store chunks: ${insertError.message}`.slice(0, 2000),
        })
        .eq("id", paperId)
        .eq("user_id", user.id);
      return { error: `Failed to store chunks: ${insertError.message}` };
    }

    // Mark as ready
    await supabase
      .from("papers")
      .update({
        parse_status: "ready",
        parse_error: null,
        chunk_count: chunks.length,
      })
      .eq("id", paperId)
      .eq("user_id", user.id);

    revalidatePath("/app/research");
    return { data: { paperId, status: "ready" } };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Ingestion pipeline failed";
    await supabase
      .from("papers")
      .update({
        parse_status: "failed",
        parse_error: errMsg.slice(0, 2000),
      })
      .eq("id", paperId)
      .eq("user_id", user.id);
    return { error: errMsg };
  }
}

/**
 * Deletes a paper completely: chunks, storage file, and paper record.
 * Handles partial failures gracefully — reports but doesn't block on storage errors.
 *
 * Requirements: 10.5, 10.6, 10.7
 */
export async function deleteFullPaper(
  paperId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify paper belongs to user
  const { data: paper, error: fetchError } = await supabase
    .from("papers")
    .select("id, storage_path")
    .eq("id", paperId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !paper) {
    return { error: fetchError?.message ?? "Paper not found" };
  }

  const errors: string[] = [];

  // 1. Delete all paper_chunks for this paper
  const { error: chunksError } = await supabase
    .from("paper_chunks")
    .delete()
    .eq("paper_id", paperId)
    .eq("user_id", user.id);

  if (chunksError) {
    errors.push(`Could not remove indexed content: ${chunksError.message}`);
  }

  // 2. Delete PDF from Supabase Storage (if storage_path exists)
  if (paper.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("papers")
      .remove([paper.storage_path]);

    if (storageError) {
      // Report but don't block (Req 10.7 — partial failure handling)
      errors.push(`Could not remove PDF file: ${storageError.message}`);
    }
  }

  // 3. Delete the paper record
  const { error: deleteError } = await supabase
    .from("papers")
    .delete()
    .eq("id", paperId)
    .eq("user_id", user.id);

  if (deleteError) {
    // If we can't delete the paper record, that's a critical failure
    return {
      error: `Failed to delete paper record: ${deleteError.message}${errors.length > 0 ? ". Additional issues: " + errors.join("; ") : ""}`,
    };
  }

  revalidatePath("/app/research");

  // If there were non-blocking errors (storage), report them but still succeed
  if (errors.length > 0) {
    return { success: true, error: errors.join("; ") };
  }

  return { success: true };
}


/**
 * Generates suggested questions a student could ask about a paper's content.
 * Reads the paper's chunks and asks Groq to produce 5 relevant questions.
 */
export async function generateSuggestedQuestions(
  paperId: string
): Promise<{ data?: string[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch chunks for this paper
  const { data: chunks, error: chunksError } = await supabase
    .from("paper_chunks")
    .select("content")
    .eq("paper_id", paperId)
    .eq("user_id", user.id)
    .order("chunk_index", { ascending: true })
    .limit(5);

  if (chunksError || !chunks || chunks.length === 0) {
    return { data: [] };
  }

  // Combine chunk content (truncate to ~2000 chars to keep prompt small)
  const combinedContent = chunks.map((c) => c.content).join("\n\n").slice(0, 2000);

  if (!process.env.GROQ_API_KEY) return { data: [] };

  try {
    const text = (
      await callLLM({
        system:
          "Generate exactly 5 short questions (max 60 chars each) that a student could ask about the following document content. Return ONLY the questions, one per line, no numbering.",
        user: combinedContent,
        temperature: 0.7,
        maxTokens: 300,
        groqOnly: true,
      })
    ).trim();

    if (!text) return { data: [] };

    const questions = text
      .split("\n")
      .map((line: string) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((line: string) => line.length >= 10 && line.length <= 80)
      .slice(0, 5);

    return { data: questions };
  } catch {
    return { data: [] };
  }
}

// ===========================================================================
// Academic RAG (Requirement 16.1–16.4)
// Scope filtered to the user's academic documents; date questions answered from
// the structured academic_events table (exact, status-labelled) in preference
// to free-text chunks; unreleased/not-found answered explicitly (never guessed).
// ===========================================================================

const ACADEMIC_RAG_EVENT_LABEL: Record<string, string> = {
  semester_start: "Semester start",
  semester_end: "Semester end",
  registration: "Registration",
  add_drop: "Add / Drop",
  withdrawal_deadline: "Withdrawal deadline",
  midterm_period: "Midterms",
  final_period: "Finals",
  makeup_period: "Make-up exams",
  holiday: "Holiday",
  break: "Break",
  other: "Academic event",
};

function formatAcademicDate(start: string | null, end: string | null): string {
  if (!start) return "unreleased";
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

async function queryAcademicRag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  question: string
): Promise<{ data?: RagAnswer; error?: string }> {
  const { data: profile } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) {
    return {
      data: {
        answer:
          "Finish setting up your semester (university and term) to ask questions about your academic calendar and curriculum.",
        citations: [],
        suggestedCards: [],
      },
    };
  }

  // Route date questions to the structured events table.
  const askedType = classifyEventType(question);
  const isDateQuestion =
    askedType !== null ||
    /\b(when|date|dates|deadline|schedule|ne zaman|tarih|hangi g[uü]n)\b/i.test(question);
  if (isDateQuestion) {
    return answerAcademicDateQuestion(supabase, userId, profile.id, askedType);
  }

  // Otherwise answer from indexed academic chunks (curriculum, syllabi…).
  const { data: academicPapers } = await supabase
    .from("papers")
    .select("id, title")
    .eq("user_id", userId)
    .eq("academic_profile_id", profile.id)
    .not("academic_kind", "is", null);

  const paperIds = (academicPapers ?? []).map((p: { id: string }) => p.id);
  if (paperIds.length === 0) {
    return {
      data: {
        answer:
          "No academic documents are indexed yet. Upload your curriculum or syllabus from the My University page, or wait for automatic discovery to finish.",
        citations: [],
        suggestedCards: [],
      },
    };
  }
  const titleMap = new Map<string, string>(
    (academicPapers ?? []).map((p: { id: string; title: string }) => [p.id, p.title])
  );

  let chunks: RetrievedChunk[] = [];

  if (hasEmbeddingSupport()) {
    const embedding = await generateQueryEmbedding(question);
    if (embedding) {
      const { data: matched } = await supabase.rpc("match_paper_chunks", {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_paper_id: null,
        match_topic_id: null,
        match_threshold: 0.3,
        match_count: 24,
      });
      chunks = ((matched ?? []) as {
        paper_id: string;
        chunk_index: number;
        content: string;
        section_heading: string | null;
        similarity: number;
      }[])
        .filter((c) => paperIds.includes(c.paper_id))
        .slice(0, 8)
        .map((c) => ({
          paperId: c.paper_id,
          paperTitle: titleMap.get(c.paper_id) ?? "Document",
          chunkIndex: c.chunk_index,
          content: c.content,
          sectionHeading: c.section_heading ?? "",
          similarity: c.similarity,
        }));
    }
  }

  // FTS / fallback: pull chunks for the academic papers and let the LLM filter.
  if (chunks.length === 0) {
    const { data: fts } = await supabase
      .from("paper_chunks")
      .select("paper_id, chunk_index, content, section_heading")
      .eq("user_id", userId)
      .in("paper_id", paperIds)
      .limit(8);
    chunks = ((fts ?? []) as {
      paper_id: string;
      chunk_index: number;
      content: string;
      section_heading: string | null;
    }[]).map((c) => ({
      paperId: c.paper_id,
      paperTitle: titleMap.get(c.paper_id) ?? "Document",
      chunkIndex: c.chunk_index,
      content: c.content,
      sectionHeading: c.section_heading ?? "",
      similarity: 1,
    }));
  }

  if (chunks.length === 0) {
    return {
      data: {
        answer: "I couldn't find anything about that in your academic documents.",
        citations: [],
        suggestedCards: [],
      },
    };
  }

  try {
    const answer = await synthesizeRagAnswer(question, chunks);
    return { data: answer };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Synthesis failed";
    return { error: msg };
  }
}

async function answerAcademicDateQuestion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profileId: string,
  askedType: string | null
): Promise<{ data: RagAnswer }> {
  const { data: events } = await supabase
    .from("academic_events")
    .select("event_type, start_date, end_date, status, source_excerpt")
    .eq("user_id", userId)
    .eq("academic_profile_id", profileId)
    .eq("is_confirmed", true)
    .order("start_date", { ascending: true, nullsFirst: false });

  type Ev = {
    event_type: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    source_excerpt: string | null;
  };
  const list = (events ?? []) as Ev[];
  const label = (t: string) => ACADEMIC_RAG_EVENT_LABEL[t] ?? "Academic event";
  const statusNote = (s: string) =>
    s === "verified" ? "verified — official" : s === "inferred" ? "inferred — confirm if unsure" : "unreleased";

  const citationsFrom = (evs: Ev[]): Citation[] =>
    evs
      .filter((e) => e.source_excerpt)
      .slice(0, 5)
      .map((e) => ({
        paperId: "",
        paperTitle: "Academic calendar",
        sectionHeading: label(e.event_type),
        chunkIndex: 0,
        snippet: (e.source_excerpt ?? "").slice(0, 300),
      }));

  let answer: string;
  let citations: Citation[] = [];

  if (askedType) {
    const matches = list.filter((e) => e.event_type === askedType);
    const dated = matches.filter((e) => e.start_date && e.status !== "unreleased");
    if (dated.length > 0) {
      const parts = dated.map(
        (e) => `${formatAcademicDate(e.start_date, e.end_date)} (${statusNote(e.status)})`
      );
      answer = `${label(askedType)}: ${parts.join("; ")}.`;
      citations = citationsFrom(dated);
    } else if (matches.length > 0) {
      answer = `Your ${label(askedType).toLowerCase()} dates are not yet released by your university, so I can't give you a date — I won't guess. I'll surface them once they're published.`;
    } else {
      answer = `I don't have ${label(askedType).toLowerCase()} dates for your semester yet. You can upload the official academic calendar on the My University page.`;
    }
  } else {
    const dated = list.filter((e) => e.start_date && e.status !== "unreleased");
    if (dated.length === 0) {
      answer =
        "I don't have any confirmed academic dates for your semester yet. Upload your academic calendar or finish discovery on the My University page.";
    } else {
      const parts = dated
        .slice(0, 8)
        .map((e) => `${label(e.event_type)} — ${formatAcademicDate(e.start_date, e.end_date)}`);
      answer = `Here are your confirmed academic dates: ${parts.join("; ")}.`;
      citations = citationsFrom(dated);
    }
  }

  return { data: { answer, citations, suggestedCards: [] } };
}
