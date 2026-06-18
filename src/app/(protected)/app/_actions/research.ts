"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { callLLM, hasLLMProvider, stripCodeFences } from "@/lib/llm";
import { rewardBatch } from "./gamification";
import { searchOpenAlex } from "@/lib/academic-search/openalex";
import { searchCrossref } from "@/lib/academic-search/crossref";
import type { AcademicWork } from "@/lib/academic-search/types";
import { validateResearchCitations } from "@/lib/research-citations";

export interface ResearchSource {
  title: string;
  authors: string[];
  year: number | null;
  url: string | null;
  snippet: string;
  type: "book" | "paper" | "wiki";
  /** DOI for Unpaywall OA lookup (Task 10). */
  doi?: string | null;
  /** Direct OA PDF URL once Unpaywall has been queried (Task 10). */
  oaPdfUrl?: string | null;
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  suggestedCards: { front: string; back: string }[];
  /**
   * True when fewer than 2 academic sources were found and the system
   * declined to synthesize a literature review from parametric memory alone.
   * (spec Req 5.3)
   */
  insufficientSources?: boolean;
}

/** Minimum number of distinct sources required to synthesize an answer. */
const MIN_SOURCES_FOR_SYNTHESIS = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deduplicate AcademicWork results from multiple providers by DOI.
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

/** Map an AcademicWork to the ResearchSource DTO used by the UI. */
function mapWorkToSource(w: AcademicWork): ResearchSource {
  return {
    title: w.title,
    authors: w.authors,
    year: w.year,
    url: w.url,
    snippet: w.abstract?.slice(0, 400) ?? "(no abstract available)",
    type: "paper",
    doi: w.doi,
    oaPdfUrl: w.oaPdfUrl,
  };
}

/**
 * Strip citation markers [N] from `answer` where N is out of range.
 * Implemented in a pure module (server-action files can only export async).
 */

// ---------------------------------------------------------------------------
// performResearch
// ---------------------------------------------------------------------------

/**
 * Performs AI-powered research on a topic using real academic sources.
 *
 * Flow (spec Req 5.1–5.4):
 *   1. Query OpenAlex (primary, CC0) + Crossref (supplementary) in parallel.
 *   2. Deduplicate by DOI; cap at 8 sources.
 *   3. If fewer than 2 sources found → return "insufficient sources" (never
 *      hallucinate a literature review from parametric memory alone).
 *   4. Synthesize answer constrained to retrieved abstracts; cite as [N].
 *   5. Validate every [N] marker maps to an actual retrieved source; strip
 *      any that don't.
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

  // 1. Fetch from real academic APIs in parallel (spec Req 5.1).
  const [openAlexWorks, crossrefWorks] = await Promise.all([
    searchOpenAlex(query, { limit: 6 }),
    searchCrossref(query, { limit: 4 }),
  ]);

  // 2. Deduplicate and cap (OpenAlex wins on DOI collisions).
  const works = deduplicateWorks([...openAlexWorks, ...crossrefWorks]).slice(0, 8);
  const sources: ResearchSource[] = works.map(mapWorkToSource);

  // 3. Insufficient sources branch (spec Req 5.3).
  if (sources.length < MIN_SOURCES_FOR_SYNTHESIS) {
    return {
      data: {
        answer:
          "I couldn't find enough academic sources to answer this question reliably. " +
          "Try rephrasing with more specific academic terms, or search for a narrower topic. " +
          "I won't present unsourced claims as a literature review.",
        sources,
        suggestedCards: [],
        insufficientSources: true,
      },
    };
  }

  // 4. Synthesize answer constrained to retrieved abstracts.
  const aiResult = await synthesizeResearch(query, sources);
  if (aiResult.error) return { error: aiResult.error };

  // 5. Validate citations (RESEARCH-1): strip any [N] without a backing source.
  const cleanedAnswer = validateResearchCitations(
    aiResult.answer!,
    sources.length
  );

  return {
    data: {
      answer: cleanedAnswer,
      sources,
      suggestedCards: aiResult.suggestedCards!,
    },
  };
}

async function extractSearchKeywords(query: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) return query;

  try {
    const keywords = (
      await callLLM({
        system: `Extract 2-4 optimal search keywords from the user's research question. Return ONLY the keywords separated by spaces — no explanation, no quotes, no punctuation. Think about what technical terms would return good results on Wikipedia and book searches.

Examples:
- "How can I become a good person?" → "ethics morality virtue self-improvement"
- "What is the difference between x64 and x86?" → "x86-64 architecture processor comparison"
- "How does spaced repetition work?" → "spaced repetition memory learning science"
- "Can you explain quantum entanglement?" → "quantum entanglement physics mechanics"`,
        user: query,
        temperature: 0.3,
        maxTokens: 30,
        groqTimeoutMs: 8000,
        groqOnly: true,
      })
    ).trim();

    if (keywords && keywords.length > 2) return keywords;
  } catch {
    // Fall through
  }

  return query; // fallback to original
}

async function synthesizeResearch(
  query: string,
  sources: ResearchSource[]
): Promise<{ answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string }> {
  if (!hasLLMProvider()) return { error: "No AI key configured" };

  // Build a numbered source list from the retrieved abstracts.
  const sourcesContext = sources
    .map(
      (s, i) =>
        `[${i + 1}] "${s.title}"` +
        (s.authors.length > 0 ? ` by ${s.authors.slice(0, 3).join(", ")}` : "") +
        (s.year ? ` (${s.year})` : "") +
        (s.doi ? ` DOI:${s.doi}` : "") +
        `\n   ${s.snippet}`
    )
    .join("\n\n");

  // Grounded synthesis prompt (spec Req 5.2, 5.4):
  // - Citations must map to numbered sources above.
  // - Any claim NOT found in the abstracts must be visibly labeled.
  const systemPrompt = `You are a research assistant helping a university student. You have retrieved the following academic sources for their question.

RETRIEVED SOURCES (numbered):
${sourcesContext}

YOUR TASK:
1. Write a thorough research summary (6–10 paragraphs) that answers the student's question.
2. Every factual claim MUST cite a retrieved source using its number [1], [2], etc.
3. If you include knowledge not found in the above abstracts, you MUST label it explicitly:
   "Note (model knowledge, unverified by sources): ..."
4. Do NOT emit a citation number [N] unless it maps to one of the numbered sources above.
5. Synthesise across sources — identify agreements, disagreements, and gaps.
6. Generate 4–8 flashcard Q/A pairs covering the key findings from the sources.

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

    if (!content.trim()) return { error: "AI synthesis failed" };
    return parseSynthesisResponse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research failed";
    if (msg.includes("abort")) return { error: "Research timed out. Try a simpler question." };
    return { error: msg };
  }
}

/**
 * Parses the research synthesis JSON, with progressive recovery for the
 * common failure mode of raw (unescaped) control characters inside strings.
 */
function parseSynthesisResponse(
  content: string
): { answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string } {
  const jsonStr = stripCodeFences(content);

  try {
    const parsed = JSON.parse(jsonStr);
    return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
  } catch {
    // Escape stray control characters (newlines/tabs) that break JSON strings.
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
      // Last resort: extract the answer text directly.
      const answerMatch = jsonStr.match(/"answer"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"suggestedCards|"\s*})/);
      if (answerMatch) {
        return { answer: answerMatch[1].replace(/\\n/g, "\n"), suggestedCards: [] };
      }
      return { error: "Failed to parse AI response" };
    }
  }
}

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
 * the existing Paper RAG pipeline (`ingestFromUrl`). (spec Req 5.6)
 *
 * Flow:
 *   1. Look up the DOI with Unpaywall to get `best_oa_location.url_for_pdf`.
 *   2. Run SSRF guard on the PDF URL before downloading.
 *   3. Call the existing `ingestFromUrl` pipeline (parse → chunk → embed).
 *   4. Optionally link the ingested paper to a known paper record and topic.
 *
 * Gracefully returns an error when:
 *   - Unpaywall has no OA PDF for this DOI.
 *   - `ACADEMIC_API_EMAIL` is not configured (Req 8.5).
 *   - The PDF URL resolves to a private/metadata address (SSRF guard).
 */
export async function ingestOpenAccessPdf(
  doi: string,
  options: {
    /** Existing `papers.id` to update in-place (from a prior `saveSource` call). */
    existingPaperId?: string;
    /** Associate the new paper record with a topic. */
    topicId?: string;
    /** Override title for the paper record (from the research source). */
    title?: string;
    /** Authors array. */
    authors?: string[];
    /** Publication year. */
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

  // 1. Resolve OA PDF URL from Unpaywall (email from env; null = not configured).
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

  // 2. SSRF guard — the OA PDF URL comes from an external API; validate it.
  const { assertPublicHttpUrl } = await import("@/lib/ssrf");
  const ssrfCheck = await assertPublicHttpUrl(pdfUrl);
  if (!ssrfCheck.ok) {
    return { error: `OA PDF URL is not safe to download: ${ssrfCheck.error}` };
  }

  // 3. If we don't already have a paper record, create one with the known
  //    metadata so the ingested paper has a proper title from the start.
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
      // Duplicate DOI — find the existing record and re-ingest it.
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

  // 4. Ingest from the validated OA PDF URL using the existing pipeline.
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

  // Award XP for all cards in a single DB round-trip
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
