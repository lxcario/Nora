"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { callLLM, hasLLMProvider, stripCodeFences } from "@/lib/llm";
import { rewardBatch } from "./gamification";
import { searchOpenAlex } from "@/lib/academic-search/openalex";
import { searchCrossref } from "@/lib/academic-search/crossref";
import { searchSemanticScholar } from "@/lib/academic-search/semantic-scholar";
import type { AcademicWork } from "@/lib/academic-search/types";
import { searchTavily, hasTavilyKey, type TavilyResult } from "@/lib/web-search/tavily";
import { validateResearchCitations } from "@/lib/research-citations";
import { NORA_VOICE_RESEARCH } from "@/lib/nora-voice";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ResearchSource {
  title: string;
  authors: string[];
  year: number | null;
  url: string | null;
  snippet: string;
  /** Source category — used by UI to render distinct badges. */
  type: "paper" | "web";
  /** Domain for web sources (e.g. "wikipedia.org"). */
  domain?: string;
  /** DOI for academic sources. */
  doi?: string | null;
  /** Direct OA PDF URL (academic sources only). */
  oaPdfUrl?: string | null;
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  suggestedCards: { front: string; back: string }[];
  /**
   * True when too few sources were found across both legs and the system
   * declined to synthesize from parametric memory alone.
   */
  insufficientSources?: boolean;
  /** Pipeline metadata for UI progress display. */
  pipeline: PipelineMetadata;
}

/** Query classification result. */
export type QueryIntent = "academic" | "general" | "both";

/** Metadata about what the pipeline did — drives the progress UI. */
export interface PipelineMetadata {
  intent: QueryIntent;
  academicSourceCount: number;
  webSourceCount: number;
  totalSources: number;
  synthesisModel: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum total sources (academic + web combined) to synthesize. */
const MIN_SOURCES_FOR_SYNTHESIS = 2;
/** Maximum combined sources fed to synthesis. */
const MAX_COMBINED_SOURCES = 12;

// ---------------------------------------------------------------------------
// Step 1: Query Classification
// ---------------------------------------------------------------------------

/**
 * Classify the query as academic-leaning, general-leaning, or both.
 * Uses a fast, cheap LLM call (groqOnly, low maxTokens).
 * Falls back to "both" if classification fails.
 */
async function classifyQuery(query: string): Promise<QueryIntent> {
  if (!hasLLMProvider()) return "both";

  try {
    const response = await callLLM({
      system: `Classify the user's research question into exactly one category. Respond with ONLY one word — no explanation:
- "academic" — primarily about published research, scientific findings, theories, peer-reviewed studies
- "general" — about everyday knowledge, current events, how-to, general facts, non-academic topics
- "both" — has both academic and general components, or you're unsure

Examples:
"What are the effects of sleep deprivation on memory?" → academic
"What's the capital of France?" → general
"How does spaced repetition work and what apps use it?" → both
"Meta-analysis of CBT effectiveness for anxiety" → academic
"Best study techniques for exams" → both`,
      user: query,
      temperature: 0,
      maxTokens: 10,
      groqTimeoutMs: 5000,
      groqOnly: true,
    });

    const cleaned = response.trim().toLowerCase();
    if (cleaned === "academic" || cleaned === "general" || cleaned === "both") {
      return cleaned;
    }
    return "both";
  } catch {
    return "both";
  }
}

// ---------------------------------------------------------------------------
// Step 2: Parallel Search
// ---------------------------------------------------------------------------

/**
 * Deduplicate AcademicWork results from multiple providers by DOI/title.
 * OpenAlex entries win when DOIs collide.
 */
function deduplicateWorks(works: AcademicWork[]): AcademicWork[] {
  const seen = new Map<string, AcademicWork>();
  for (const w of works) {
    const key = w.doi?.toLowerCase() ?? `${w.source}:${w.title.toLowerCase().slice(0, 60)}`;
    if (!seen.has(key)) seen.set(key, w);
  }
  return [...seen.values()];
}

/** Map an AcademicWork to the ResearchSource DTO. */
function mapWorkToSource(w: AcademicWork & { tldr?: string | null }): ResearchSource {
  // Prefer TLDR over raw abstract when available (richer context).
  const snippet = w.tldr
    ? `TLDR: ${w.tldr}\n${w.abstract?.slice(0, 300) ?? ""}`
    : w.abstract?.slice(0, 400) ?? "(no abstract available)";

  return {
    title: w.title,
    authors: w.authors,
    year: w.year,
    url: w.url,
    snippet,
    type: "paper",
    doi: w.doi,
    oaPdfUrl: w.oaPdfUrl,
  };
}

/** Map a Tavily web result to the ResearchSource DTO. */
function mapTavilyToSource(r: TavilyResult): ResearchSource {
  return {
    title: r.title,
    authors: [],
    year: null,
    url: r.url,
    snippet: r.content || r.snippet,
    type: "web",
    domain: r.domain,
  };
}

interface SearchResults {
  academicSources: ResearchSource[];
  webSources: ResearchSource[];
}

/**
 * Run parallel search across academic and web legs based on query intent.
 */
async function parallelSearch(
  query: string,
  intent: QueryIntent
): Promise<SearchResults> {
  const runAcademic = intent === "academic" || intent === "both";
  const runWeb = intent === "general" || intent === "both";

  // Academic leg: OpenAlex + Crossref + Semantic Scholar
  const academicPromise = runAcademic
    ? Promise.all([
        searchOpenAlex(query, { limit: 6 }),
        searchCrossref(query, { limit: 4 }),
        searchSemanticScholar(query, { limit: 5 }),
      ]).then(([oaWorks, crWorks, s2Works]) => {
        const allWorks = deduplicateWorks([...oaWorks, ...crWorks, ...s2Works]);
        return allWorks.slice(0, 8).map(mapWorkToSource);
      })
    : Promise.resolve([]);

  // Web leg: Tavily (only if configured)
  const webPromise =
    runWeb && hasTavilyKey()
      ? searchTavily(query, { maxResults: 5, searchDepth: "basic" }).then(
          (results) => results.map(mapTavilyToSource)
        )
      : Promise.resolve([]);

  const [academicSources, webSources] = await Promise.all([
    academicPromise,
    webPromise,
  ]);

  return { academicSources, webSources };
}

// ---------------------------------------------------------------------------
// Step 3: Source Assembly
// ---------------------------------------------------------------------------

/**
 * Assemble and cap the combined source list.
 * Academic sources come first, then web sources.
 */
function assembleSources(
  academicSources: ResearchSource[],
  webSources: ResearchSource[]
): ResearchSource[] {
  const combined = [...academicSources, ...webSources];
  return combined.slice(0, MAX_COMBINED_SOURCES);
}

// ---------------------------------------------------------------------------
// Step 4: Synthesis
// ---------------------------------------------------------------------------

async function synthesizeResearch(
  query: string,
  sources: ResearchSource[]
): Promise<{ answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string }> {
  if (!hasLLMProvider()) return { error: "No AI key configured" };

  // Build a numbered source list distinguishing academic from web.
  const sourcesContext = sources
    .map((s, i) => {
      const typeLabel = s.type === "paper" ? "📄 Academic" : "🌐 Web";
      const authorLine =
        s.authors.length > 0 ? ` by ${s.authors.slice(0, 3).join(", ")}` : "";
      const yearLine = s.year ? ` (${s.year})` : "";
      const doiLine = s.doi ? ` DOI:${s.doi}` : "";
      const domainLine = s.domain ? ` [${s.domain}]` : "";

      return (
        `[${i + 1}] ${typeLabel}: "${s.title}"${authorLine}${yearLine}${doiLine}${domainLine}\n` +
        `   ${s.snippet}`
      );
    })
    .join("\n\n");

  const systemPrompt = `${NORA_VOICE_RESEARCH}

---

You are a research assistant helping a university student. You have retrieved the following sources — both peer-reviewed academic papers and web pages — for their question.

RETRIEVED SOURCES (numbered):
${sourcesContext}

YOUR TASK:
1. Write a thorough, well-structured research summary (6–10 paragraphs) that answers the student's question comprehensively.
2. Every factual claim MUST cite a retrieved source using its number [1], [2], etc.
3. Distinguish between academic sources (peer-reviewed, higher confidence) and web sources (general, verify independently) in your narrative where relevant.
4. If you include knowledge not found in the above sources, you MUST label it explicitly: "Note (model knowledge, unverified by sources): ..."
5. Do NOT emit a citation number [N] unless it maps to one of the numbered sources above.
6. Synthesise across sources — identify agreements, disagreements, and gaps.
7. Generate 4–8 flashcard Q/A pairs covering the key findings.

IMPORTANT: If the sources do not cover the question well, say so explicitly rather than inventing citations.

Respond ONLY with valid JSON (use \\n for newlines inside strings):
{"answer":"...","suggestedCards":[{"front":"...","back":"..."}]}`;

  const userMessage = `Research question: "${query}"`;

  try {
    const content = await callLLM({
      system: systemPrompt,
      user: userMessage,
      temperature: 0.4,
      maxTokens: 4096,
      groqTimeoutMs: 45000,
      openRouterTimeoutMs: 45000,
    });

    if (!content.trim()) return { error: "AI synthesis failed — empty response." };
    return parseSynthesisResponse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research failed";
    if (msg.includes("abort")) return { error: "Research timed out. Try a simpler question." };
    return { error: msg };
  }
}

/**
 * Parses the research synthesis JSON with progressive recovery.
 */
function parseSynthesisResponse(
  content: string
): { answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string } {
  const jsonStr = stripCodeFences(content);

  try {
    const parsed = JSON.parse(jsonStr);
    return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
  } catch {
    // Escape stray control characters that break JSON.
    const fixedJson = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
      if (ch === "\n") return "\\n";
      if (ch === "\r") return "\\r";
      if (ch === "\t") return "\\t";
      return "";
    });
    try {
      const parsed = JSON.parse(fixedJson);
      return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
    } catch {
      // Last resort: regex extraction.
      const answerMatch = jsonStr.match(/"answer"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"suggestedCards|"\s*})/);
      if (answerMatch) {
        return { answer: answerMatch[1].replace(/\\n/g, "\n"), suggestedCards: [] };
      }
      return { error: "Failed to parse AI response" };
    }
  }
}

// ---------------------------------------------------------------------------
// Main pipeline: performResearch
// ---------------------------------------------------------------------------

/**
 * Performs AI-powered research using a hybrid academic + web search pipeline.
 *
 * Pipeline:
 *   1. Classify query intent (academic / general / both) — ~1s
 *   2. Parallel search: academic APIs + Tavily web search — ~3-6s
 *   3. Assemble and cap sources — instant
 *   4. Synthesize with citations (Groq/OpenRouter) — ~5-15s
 *
 * Total expected latency: 10-25s (vs. old pipeline's 3-6s).
 */
export async function performResearch(query: string): Promise<{
  data?: ResearchResult;
  error?: string;
}> {
  if (!query?.trim() || query.trim().length < 5) {
    return { error: "Enter a more detailed research question (at least 5 characters)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const rateCheck = checkRateLimit(user.id, "research", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
    if (!rateCheck.allowed) {
      return { error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)} seconds.` };
    }
  }

  // ── Step 1: Classify query intent ──────────────────────────────────────────
  const intent = await classifyQuery(query.trim());

  // ── Step 2: Parallel search ────────────────────────────────────────────────
  const { academicSources, webSources } = await parallelSearch(query.trim(), intent);

  // ── Step 3: Assemble sources ───────────────────────────────────────────────
  const sources = assembleSources(academicSources, webSources);

  // Insufficient sources check — applies to COMBINED total.
  if (sources.length < MIN_SOURCES_FOR_SYNTHESIS) {
    return {
      data: {
        answer:
          "I couldn't find enough sources to answer this question reliably. " +
          "Try rephrasing with more specific terms, or search for a narrower topic. " +
          "I won't present unsourced claims as research.",
        sources,
        suggestedCards: [],
        insufficientSources: true,
        pipeline: {
          intent,
          academicSourceCount: academicSources.length,
          webSourceCount: webSources.length,
          totalSources: sources.length,
          synthesisModel: "none",
        },
      },
    };
  }

  // ── Step 4: Synthesize ─────────────────────────────────────────────────────
  const aiResult = await synthesizeResearch(query.trim(), sources);
  if (aiResult.error) return { error: aiResult.error };

  // Validate citations: strip any [N] not backed by a real source.
  const cleanedAnswer = validateResearchCitations(
    aiResult.answer!,
    sources.length
  );

  return {
    data: {
      answer: cleanedAnswer,
      sources,
      suggestedCards: aiResult.suggestedCards!,
      pipeline: {
        intent,
        academicSourceCount: academicSources.length,
        webSourceCount: webSources.length,
        totalSources: sources.length,
        synthesisModel: process.env.GROQ_API_KEY ? "groq" : "openrouter",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Other exports (unchanged)
// ---------------------------------------------------------------------------

/**
 * Saves a paper/book to the user's collection.
 */
export async function saveSource(
  source: ResearchSource,
  topicId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("papers").insert({
    user_id: user.id,
    topic_id: topicId || null,
    title: source.title,
    authors: source.authors,
    year: source.year,
    citation_count: 0,
    abstract: source.snippet,
    url: source.url,
    doi: source.doi ?? null,
    oa_url: source.oaPdfUrl ?? null,
    semantic_scholar_id: null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already saved." };
    return { error: error.message };
  }

  revalidatePath("/app/research");
  return { success: true };
}

/**
 * Ingests an open-access PDF for a DOI via Unpaywall, feeding it into
 * the existing Paper RAG pipeline (`ingestFromUrl`).
 */
export async function ingestOpenAccessPdf(
  doi: string,
  options: {
    existingPaperId?: string;
    topicId?: string;
    title?: string;
    authors?: string[];
    year?: number | null;
  } = {}
): Promise<{ data?: { paperId: string; status: string }; error?: string }> {
  const trimmedDoi = doi?.trim();
  if (!trimmedDoi || !trimmedDoi.startsWith("10.")) {
    return { error: "A valid DOI is required (must start with '10.')." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { lookupUnpaywall } = await import("@/lib/academic-search/unpaywall");
  const oaResult = await lookupUnpaywall(trimmedDoi);

  if (!oaResult) {
    return {
      error:
        "Unpaywall lookup failed or ACADEMIC_API_EMAIL is not configured. " +
        "Set it in your .env to enable open-access PDF ingestion.",
    };
  }
  if (!oaResult.isOa || !oaResult.bestOaLocation?.urlForPdf) {
    return {
      error:
        `No open-access PDF found for DOI "${trimmedDoi}". ` +
        "This paper may not be freely available.",
    };
  }

  const pdfUrl = oaResult.bestOaLocation.urlForPdf;

  const { assertPublicHttpUrl } = await import("@/lib/ssrf");
  const ssrfCheck = await assertPublicHttpUrl(pdfUrl);
  if (!ssrfCheck.ok) {
    return { error: `OA PDF URL is not safe to download: ${ssrfCheck.error}` };
  }

  let paperId: string | undefined = options.existingPaperId;

  if (!paperId) {
    const title = options.title ?? oaResult.title ?? trimmedDoi;
    const { data: created, error: insertError } = await supabase
      .from("papers")
      .insert({
        user_id: user.id,
        title,
        authors: options.authors ?? [],
        year: options.year ?? null,
        url: oaResult.bestOaLocation.url ?? pdfUrl,
        doi: trimmedDoi,
        oa_url: pdfUrl,
        topic_id: options.topicId ?? null,
        parse_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existing } = await supabase
          .from("papers")
          .select("id")
          .eq("user_id", user.id)
          .eq("doi", trimmedDoi)
          .single();
        paperId = existing?.id;
      } else {
        return { error: `Failed to create paper record: ${insertError.message}` };
      }
    } else {
      paperId = created?.id;
    }
  }

  const { ingestFromUrl } = await import(
    "@/app/(protected)/app/_actions/rag"
  );
  return ingestFromUrl(pdfUrl, paperId);
}

/**
 * Creates flashcards from research findings.
 */
export async function createCardsFromResearch(
  topicId: string,
  cards: { front: string; back: string }[]
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cardsToInsert = cards.map((card) => ({
    user_id: user.id,
    topic_id: topicId || null,
    front: card.front,
    back: card.back,
    source_type: "research" as const,
  }));

  const { error } = await supabase.from("cards").insert(cardsToInsert);
  if (error) return { error: error.message };

  await rewardBatch("card_created", cards.length);

  revalidatePath("/app/review");
  return { success: true, count: cards.length };
}

/**
 * Gets the user's saved papers/books.
 */
export async function getSavedPapers(): Promise<{
  papers: {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    abstract: string | null;
    url: string | null;
    topic_name: string | null;
  }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { papers: [] };

  const { data } = await supabase
    .from("papers")
    .select("id, title, authors, year, abstract, url, topics(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    papers: (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors ?? [],
      year: p.year,
      abstract: p.abstract,
      url: p.url,
      topic_name: (p.topics as unknown as { name: string } | null)?.name ?? null,
    })),
  };
}

/**
 * Deletes a saved paper.
 */
export async function deletePaper(paperId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("papers").delete().eq("id", paperId).eq("user_id", user.id);
  revalidatePath("/app/research");
  return { success: true };
}
