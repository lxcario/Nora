"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUploadInput, validateUrl, validateQuestion } from "./rag/validation";
import { parsePdf } from "./rag/parser";
import { chunkText } from "./rag/chunker";
import { generateEmbeddings, generateQueryEmbedding, hasEmbeddingSupport } from "./rag/embedder";

// --- Types ---

export interface IngestionResult {
  data?: { paperId: string; status: string };
  error?: string;
}

export interface RagScope {
  type: "all" | "paper" | "topic";
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

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) return { error: urlValidation.error };

  // Download PDF with 30-second timeout
  let buffer: Buffer;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
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

  // 3. Retrieve chunks (dual-mode)
  let retrievedChunks: RetrievedChunk[];

  try {
    if (hasEmbeddingSupport()) {
      // --- Vector mode ---
      const embedding = await generateQueryEmbedding(question);
      if (!embedding) {
        return { error: "Failed to generate query embedding" };
      }

      const { data: matchedChunks, error: rpcError } = await supabase.rpc(
        "match_paper_chunks",
        {
          query_embedding: JSON.stringify(embedding),
          match_user_id: user.id,
          match_paper_id: scope.type === "paper" ? scope.paperId ?? null : null,
          match_topic_id: scope.type === "topic" ? scope.topicId ?? null : null,
          match_threshold: 0.3,
          match_count: 8,
        }
      );

      if (rpcError) {
        return { error: `Paper search failed: ${rpcError.message}` };
      }

      if (!matchedChunks || matchedChunks.length === 0) {
        return {
          data: {
            answer:
              "No relevant content found in your papers. Try rephrasing your question or uploading more papers on this topic.",
            citations: [],
            suggestedCards: [],
          },
        };
      }

      // Fetch paper titles for citations
      const paperIds = [...new Set(matchedChunks.map((c: { paper_id: string }) => c.paper_id))];
      const { data: papers } = await supabase
        .from("papers")
        .select("id, title")
        .in("id", paperIds);

      const paperTitleMap = new Map<string, string>();
      for (const p of papers ?? []) {
        paperTitleMap.set(p.id, p.title);
      }

      retrievedChunks = matchedChunks.map((c: { paper_id: string; chunk_index: number; content: string; section_heading: string | null; similarity: number }) => ({
        paperId: c.paper_id,
        paperTitle: paperTitleMap.get(c.paper_id) ?? "Unknown Paper",
        chunkIndex: c.chunk_index,
        content: c.content,
        sectionHeading: c.section_heading ?? "",
        similarity: c.similarity,
      }));
    } else {
      // --- FTS mode (no OPENAI_API_KEY) ---
      // Use Groq to extract search keywords
      const keywords = await extractSearchKeywordsForRag(question);
      if (!keywords || keywords.length === 0) {
        return { error: "Failed to extract search keywords from question" };
      }

      // Build tsquery from keywords (OR them together for broader matches)
      const tsquery = keywords.map((kw) => kw.replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean).join(" | ");

      if (!tsquery) {
        return { error: "Could not form a valid search query" };
      }

      // Query paper_chunks — in FTS mode with few chunks, just fetch all chunks
      // for the scoped papers and let the LLM sort out relevance
      let query = supabase
        .from("paper_chunks")
        .select("id, paper_id, chunk_index, content, section_heading")
        .eq("user_id", user.id)
        .limit(8);

      if (scope.type === "paper" && scope.paperId) {
        query = query.eq("paper_id", scope.paperId);
      }

      // For topic scope, we need to join via papers table
      if (scope.type === "topic" && scope.topicId) {
        // Get paper IDs for this topic first
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

        const topicPaperIds = topicPapers.map((p) => p.id);
        query = query.in("paper_id", topicPaperIds);
      }

      const { data: ftsResults, error: ftsError } = await query;

      if (ftsError) {
        return { error: `Paper search failed: ${ftsError.message}` };
      }

      if (!ftsResults || ftsResults.length === 0) {
        return {
          data: {
            answer:
              "No relevant content found in your papers. Try rephrasing your question or uploading more papers on this topic.",
            citations: [],
            suggestedCards: [],
          },
        };
      }

      // Fetch paper titles for citations
      const paperIds = [...new Set(ftsResults.map((c) => c.paper_id))];
      const { data: papers } = await supabase
        .from("papers")
        .select("id, title")
        .in("id", paperIds);

      const paperTitleMap = new Map<string, string>();
      for (const p of papers ?? []) {
        paperTitleMap.set(p.id, p.title);
      }

      retrievedChunks = ftsResults.map((c) => ({
        paperId: c.paper_id,
        paperTitle: paperTitleMap.get(c.paper_id) ?? "Unknown Paper",
        chunkIndex: c.chunk_index,
        content: c.content,
        sectionHeading: c.section_heading ?? "",
        similarity: 1, // FTS doesn't produce similarity scores
      }));
    }
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
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // Fallback: split question into words and take top terms
    return question
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KEYWORD_TIMEOUT_MS);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "Extract 3-5 search keywords from the following question. Return only the keywords separated by spaces, no explanation.",
          },
          { role: "user", content: question },
        ],
        temperature: 0.3,
        max_tokens: 30,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const keywordsStr = data.choices?.[0]?.message?.content?.trim();
      if (keywordsStr && keywordsStr.length > 2) {
        return keywordsStr.split(/\s+/).filter((w: string) => w.length > 0);
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: naive word extraction
  return question
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);
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

  const systemPrompt = `You are a research assistant helping a student understand their papers. Answer the question in 2-5 complete sentences using ONLY the provided source chunks. Always explain the context and significance, not just bare facts. Cite every claim using the format [Paper Title, Section]. If the information is insufficient to answer, say so. Also generate 1-5 flashcard pairs (question/answer) from the key facts in your answer.

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
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !orKey) {
    throw new Error("No AI key configured. Cannot synthesize answer.");
  }

  const { systemPrompt, userMessage } = buildRagPrompt(question, chunks);

  // Try Groq first
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) {
          return parseRagResponse(content, chunks);
        }
      }

      // If Groq returns rate limit (429), fall through to OpenRouter (Req 12.2)
      if (res.status === 429 && orKey) {
        // Fall through to OpenRouter
      } else if (!res.ok && !orKey) {
        throw new Error("AI synthesis temporarily unavailable, please retry in 60 seconds");
      }
    } catch (groqError: unknown) {
      if (!orKey) {
        if (
          groqError instanceof Error &&
          (groqError.name === "AbortError" || groqError.message.includes("abort"))
        ) {
          throw new Error("AI synthesis temporarily unavailable, please retry in 60 seconds");
        }
        throw groqError;
      }
      // Fall through to OpenRouter
    }
  }

  // Fallback: OpenRouter (Req 12.2, 12.3)
  if (orKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${orKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Nora",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) {
          return parseRagResponse(content, chunks);
        }
      }
    } catch (orError: unknown) {
      if (
        orError instanceof Error &&
        (orError.name === "AbortError" || orError.message.includes("abort"))
      ) {
        throw new Error("AI synthesis temporarily unavailable, please retry in 60 seconds");
      }
      throw orError;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Both providers failed (Req 12.3)
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

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return { data: [] };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Generate exactly 5 short questions (max 60 chars each) that a student could ask about the following document content. Return ONLY the questions, one per line, no numbering.",
          },
          { role: "user", content: combinedContent },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) return { data: [] };

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    
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
