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
import { validateResearchCitations, validateCitationGrounding, type GroundingSource } from "@/lib/research-citations";
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
 * Run parallel search across both academic and web legs.
 * Always runs both — the cost is negligible (parallel API calls) and
 * limiting to one leg causes missed results for borderline queries.
 */
async function parallelSearch(
  query: string,
  _intent: QueryIntent
): Promise<SearchResults> {
  // Academic leg: OpenAlex + Crossref + Semantic Scholar (always run)
  const academicPromise = Promise.all([
    searchOpenAlex(query, { limit: 6 }),
    searchCrossref(query, { limit: 4 }),
    searchSemanticScholar(query, { limit: 5 }),
  ]).then(([oaWorks, crWorks, s2Works]) => {
    const allWorks = deduplicateWorks([...oaWorks, ...crWorks, ...s2Works]);
    return allWorks.slice(0, 8).map(mapWorkToSource);
  });

  // Web leg: Tavily (always run if configured)
  const webPromise = hasTavilyKey()
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
// Step 3: Source Assembly & Relevance Filtering
// ---------------------------------------------------------------------------

/**
 * Tokenize text into meaningful words for relevance scoring.
 * Strips punctuation, lowercases, removes very short words and stopwords.
 */
function tokenize(text: string): Set<string> {
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "this", "that", "these", "those",
    "it", "its", "not", "no", "as", "if", "than", "then", "so", "very",
    "bir", "ve", "de", "da", "ile", "için", "bu", "olan", "olarak", "gibi",
    "den", "dan", "ya", "veya", "ama", "her", "daha", "çok", "en",
    "yang", "dan", "dari", "ke", "di", "ini", "itu", "dengan", "untuk",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
  );
}

/**
 * Score a source's relevance to a query using term overlap.
 * Returns a score between 0 and 1.
 *
 * Uses both title and snippet, with title terms weighted 2x.
 */
function scoreSourceRelevance(source: ResearchSource, queryTokens: Set<string>): number {
  if (queryTokens.size === 0) return 0.5; // Can't score, pass through

  const titleTokens = tokenize(source.title);
  const snippetTokens = tokenize(source.snippet);

  // Count query terms found in title (weight 2x) and snippet (weight 1x)
  let matchScore = 0;
  let maxPossible = queryTokens.size * 2; // Best case: all query terms in title

  for (const qt of queryTokens) {
    if (titleTokens.has(qt)) matchScore += 2;
    else if (snippetTokens.has(qt)) matchScore += 1;
  }

  // Normalize to 0–1 range
  return Math.min(matchScore / maxPossible, 1);
}

/** Minimum relevance score for a source to be included in synthesis. */
const MIN_RELEVANCE_SCORE = 0.15;

/**
 * Filter sources by relevance to the query.
 * Removes sources with near-zero topical overlap.
 *
 * Floor logic: only backfill below-threshold sources if ALL sources scored
 * low (i.e., the query itself is hard to match). If at least one source
 * passes threshold, only return those that pass — don't pad with garbage.
 */
function filterByRelevance(
  sources: ResearchSource[],
  query: string
): ResearchSource[] {
  const queryTokens = tokenize(query);

  const scored = sources.map((s) => ({
    source: s,
    score: scoreSourceRelevance(s, queryTokens),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Keep sources above threshold
  const relevant = scored.filter((s) => s.score >= MIN_RELEVANCE_SCORE);

  if (relevant.length > 0) {
    // At least some sources are relevant — return only those, no padding
    return relevant.map((s) => s.source);
  }

  // No source passed threshold — the query is likely too niche or
  // all retrieval results are off-topic. Return top 3 by score as
  // best-effort (better than nothing for synthesis to acknowledge gaps).
  return scored.slice(0, 3).map((s) => s.source);
}

/**
 * Assemble and cap the combined source list.
 * Academic sources come first, then web sources.
 * Applies relevance filtering to remove off-topic sources.
 */
function assembleSources(
  academicSources: ResearchSource[],
  webSources: ResearchSource[],
  query: string
): ResearchSource[] {
  const combined = [...academicSources, ...webSources];
  const capped = combined.slice(0, MAX_COMBINED_SOURCES);
  return filterByRelevance(capped, query);
}

// ---------------------------------------------------------------------------
// Step 4: Synthesis
// ---------------------------------------------------------------------------

/**
 * Detect and remove repetition loops from LLM output.
 * Splits by paragraph, detects duplicates (normalized), keeps first occurrence.
 */
function deduplicateParagraphs(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length <= 3) return text;

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const para of paragraphs) {
    // Normalize: lowercase, collapse whitespace, strip citation markers for comparison
    const normalized = para
      .toLowerCase()
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Skip if we've seen this paragraph (or very similar — first 100 chars match)
    const fingerprint = normalized.slice(0, 120);
    if (seen.has(fingerprint)) continue;

    // Also check for high overlap with any existing paragraph (>80% shared words)
    let isDuplicate = false;
    const words = new Set(normalized.split(" ").filter((w) => w.length > 3));
    for (const existingFp of seen) {
      const existingWords = new Set(existingFp.split(" ").filter((w: string) => w.length > 3));
      if (existingWords.size === 0 || words.size === 0) continue;
      let overlap = 0;
      for (const w of words) {
        if (existingWords.has(w)) overlap++;
      }
      const overlapRatio = overlap / Math.min(words.size, existingWords.size);
      if (overlapRatio > 0.75) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(fingerprint);
      unique.push(para);
    }
  }

  return unique.join("\n\n");
}

/**
 * Assign credibility tiers to sources for prompt context.
 * Tier 1: Peer-reviewed academic papers with abstracts
 * Tier 2: Academic papers without abstracts / reputable web (.edu, .gov, mdpi, ieee, springer, etc.)
 * Tier 3: General web sources (blogs, product pages, videos)
 */
function getSourceTier(source: ResearchSource): 1 | 2 | 3 {
  if (source.type === "paper") {
    if (source.snippet && !source.snippet.includes("(no abstract available)")) {
      return 1;
    }
    return 2;
  }
  // Web source — check domain reputation
  const domain = source.domain?.toLowerCase() ?? "";
  const reputableDomains = [
    ".edu", ".gov", ".ac.", "ieee.org", "springer.com", "wiley.com",
    "nature.com", "sciencedirect.com", "mdpi.com", "arxiv.org",
    "nih.gov", "pubmed", "researchgate.net",
  ];
  if (reputableDomains.some((d) => domain.includes(d))) return 2;
  return 3;
}

function buildSourceContext(sources: ResearchSource[]): string {
  return sources
    .map((s, i) => {
      const tier = getSourceTier(s);
      const tierLabel =
        tier === 1
          ? "⭐ PEER-REVIEWED"
          : tier === 2
          ? "📚 REPUTABLE"
          : "🌐 GENERAL WEB";
      const typeLabel = s.type === "paper" ? "Academic" : "Web";
      const authorLine =
        s.authors.length > 0 ? ` by ${s.authors.slice(0, 3).join(", ")}` : "";
      const yearLine = s.year ? ` (${s.year})` : "";
      const doiLine = s.doi ? ` DOI:${s.doi}` : "";
      const domainLine = s.domain ? ` [${s.domain}]` : "";

      return (
        `[${i + 1}] ${tierLabel} | ${typeLabel}: "${s.title}"${authorLine}${yearLine}${doiLine}${domainLine}\n` +
        `   ${s.snippet}`
      );
    })
    .join("\n\n");
}

async function synthesizeResearch(
  query: string,
  sources: ResearchSource[]
): Promise<{ answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string }> {
  if (!hasLLMProvider()) return { error: "No AI key configured. Please add a GROQ_API_KEY in your environment settings." };

  const sourcesContext = buildSourceContext(sources);

  // Count tiers for adaptive instructions
  const tier1Count = sources.filter((s) => getSourceTier(s) === 1).length;
  const tier3Count = sources.filter((s) => getSourceTier(s) === 3).length;

  const credibilityNote =
    tier3Count > 0
      ? `\nCREDIBILITY NOTE: Sources marked "GENERAL WEB" (blogs, product pages) should be cited with lower confidence. Prefer peer-reviewed and reputable sources for core claims. Use web sources only for supplementary context, definitions, or to fill gaps.`
      : "";

  // ── Adaptive section structure based on source count ──────────────────────
  // Few sources → fewer sections, to prevent the model from fabricating content
  // to fill sections that have no source support.
  const sectionInstructions = sources.length <= 2
    ? `YOUR TASK — write a FOCUSED research synthesis using EXACTLY these sections:

## SECTION 1: Overview (1–2 paragraphs)
Define the topic and summarize what the available sources tell us. Include specific details, numbers, and data points from the sources.

## SECTION 2: Key Details (1–2 paragraphs)
Expand on the most important findings or mechanisms described in the sources. Extract concrete information — no vague summaries.

## SECTION 3: Gaps & Limitations (1 paragraph — MAX 3 sentences)
Acknowledge what the sources do NOT cover. Be specific about what's missing.

NOTE: You only have ${sources.length} source(s). Do NOT attempt to fill sections with content that isn't backed by these sources. Short, honest, and specific is far better than long and fabricated.`
    : sources.length <= 5
    ? `YOUR TASK — write a structured research synthesis using EXACTLY these sections:

## SECTION 1: Background & Definitions (1–2 paragraphs)
Define key terms and establish context.

## SECTION 2: Core Mechanisms & Technical Details (1–2 paragraphs)
Explain HOW the technology/concept works. Include specific numbers from the sources.

## SECTION 3: Applications & Current State (1 paragraph)
Where is this being used today?

## SECTION 4: Limitations & Conclusion (1 paragraph — MAX 4 sentences)
What's missing from these sources? One-sentence takeaway.`
    : `YOUR TASK — write a structured research synthesis using EXACTLY these sections:

## SECTION 1: Background & Definitions (1–2 paragraphs)
Define key terms and establish context. What is this topic about? Why does it matter?

## SECTION 2: Core Mechanisms & Technical Details (2–3 paragraphs)
Explain HOW the technology/concept works. Include specific numbers: voltages, temperatures, frequencies, efficiencies, percentages from the sources. No vague statements — if a source says "3.3 eV bandgap" or ">100kHz switching," include those figures.

## SECTION 3: Comparative Analysis (1–2 paragraphs)
If the question involves comparing things (e.g., materials, approaches, old vs. new), directly compare them with a table-like structure or explicit side-by-side statements. If no comparison is asked, compare to the status quo or alternatives mentioned in sources.

## SECTION 4: Applications & Current State (1–2 paragraphs)
Where is this being used today? What are real-world deployments, products, or industry trends?

## SECTION 5: Limitations & Open Questions (1 paragraph)
What do the sources NOT answer? What are acknowledged limitations, challenges, or gaps?

## SECTION 6: Conclusion (1 paragraph — MAX 3 sentences)
One-paragraph takeaway. Do NOT repeat earlier content. State the single most important finding.`;

  const cardCount = Math.max(6, Math.min(8, sources.length + 2));

  const systemPrompt = `${NORA_VOICE_RESEARCH}

---

You are a research assistant helping a university student. You have retrieved ${sources.length} sources (${tier1Count} peer-reviewed, ${sources.length - tier1Count} other) for their question.

RETRIEVED SOURCES (numbered, with credibility tier):
${sourcesContext}
${credibilityNote}

${sectionInstructions}

CITATION RULES:
- Every factual claim MUST cite [N] referencing a source above.
- Prefer Tier 1 (⭐) sources for core claims.
- If you use knowledge NOT in the sources, prefix with "Note (unverified): "
- Do NOT emit [N] unless N is a valid source number (1–${sources.length}).
- Do NOT use "According to [N], X" as your default sentence pattern. Vary your citation style: inline [N], parenthetical, or end-of-sentence.

ANTI-REPETITION RULES:
- NEVER write "more research is needed" or "further studies are required" — it's filler.
- NEVER repeat a point you already made. Each sentence must add new information.
- STOP writing immediately after the final section's conclusion. Do not add any text after.
- If you catch yourself repeating, STOP and move to the next section.

EMPTY SECTION RULE:
- If a section has NO supporting sources with relevant information, write exactly: "No relevant sources were retrieved for this section." Do NOT fabricate citations or make up claims to fill the section.
- It is BETTER to have a short, honest section than a long section with decorative citations that don't actually support the claims.
- Only cite a source if you can point to SPECIFIC content from that source's snippet/abstract that backs your claim.

FLASHCARDS: Generate ${cardCount} Q/A pairs (aim for 5-8) testing specific technical details (numbers, comparisons, mechanisms, definitions). Cover different aspects of the topic — do NOT cluster all cards on one subtopic. Include at least one card that tests a comparison or trade-off, and one that tests a specific number/metric from the sources.

Respond ONLY with valid JSON. Use \\n for newlines inside strings. No markdown code fences:
{"answer":"Section 1...\\n\\nSection 2...","suggestedCards":[{"front":"Q","back":"A"}]}`;

  const userMessage = `Research question: "${query}"`;

  try {
    const content = await callLLM({
      system: systemPrompt,
      user: userMessage,
      temperature: 0.3,
      maxTokens: 5000,
      frequencyPenalty: 0.6,
      presencePenalty: 0.4,
      groqTimeoutMs: 60000,
      openRouterTimeoutMs: 60000,
    });

    if (!content.trim()) return { error: "The AI provider is temporarily busy. Try again in a few seconds, or simplify your question." };

    const parsed = parseSynthesisResponse(content);
    if (parsed.error) return parsed;

    // Post-process: detect and strip repetition loops
    if (parsed.answer) {
      parsed.answer = deduplicateParagraphs(parsed.answer);
    }

    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research failed";
    if (msg.includes("abort")) return { error: "Research timed out — the question may be too broad. Try narrowing it down." };
    return { error: `Something went wrong: ${msg}. Please try again.` };
  }
}

/**
 * Parses the research synthesis JSON with progressive recovery.
 * Handles common LLM JSON failures: unescaped newlines, quotes inside text,
 * truncated output, and mixed content before/after JSON.
 */
function parseSynthesisResponse(
  content: string
): { answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string } {
  const jsonStr = stripCodeFences(content).trim();

  // ── Attempt 1: Direct parse ────────────────────────────────────────────────
  try {
    const parsed = JSON.parse(jsonStr);
    return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
  } catch {
    // Continue to recovery strategies
  }

  // ── Attempt 2: Fix unescaped control characters ────────────────────────────
  const fixedControl = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    return "";
  });
  try {
    const parsed = JSON.parse(fixedControl);
    return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
  } catch {
    // Continue
  }

  // ── Attempt 3: Extract answer field manually with balanced-quote parsing ───
  // Find "answer" key and extract value between balanced quotes,
  // handling escaped quotes inside the value.
  const answerStart = jsonStr.indexOf('"answer"');
  if (answerStart !== -1) {
    // Find the opening quote of the value
    const colonPos = jsonStr.indexOf(":", answerStart + 8);
    if (colonPos !== -1) {
      const valueStart = jsonStr.indexOf('"', colonPos + 1);
      if (valueStart !== -1) {
        // Walk forward to find the unescaped closing quote
        let answer = "";
        let i = valueStart + 1;
        while (i < jsonStr.length) {
          if (jsonStr[i] === "\\" && i + 1 < jsonStr.length) {
            // Escaped character — keep both
            answer += jsonStr[i] + jsonStr[i + 1];
            i += 2;
          } else if (jsonStr[i] === '"') {
            // Unescaped quote — check if it's likely the end of the value
            // (followed by comma, closing brace, or "suggestedCards")
            const remaining = jsonStr.slice(i + 1).trimStart();
            if (
              remaining.startsWith(",") ||
              remaining.startsWith("}") ||
              remaining.startsWith('"suggestedCards') ||
              remaining.length === 0
            ) {
              break; // End of answer value
            }
            // Otherwise it's an unescaped quote inside the text — escape it
            answer += '\\"';
            i++;
          } else {
            answer += jsonStr[i];
            i++;
          }
        }

        // Process the answer: unescape standard sequences
        const processedAnswer = answer
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");

        if (processedAnswer.length > 50) {
          // Try to extract suggestedCards too
          const cards = extractSuggestedCards(jsonStr);
          return { answer: processedAnswer, suggestedCards: cards };
        }
      }
    }
  }

  // ── Attempt 4: Broad regex for any substantial text block ──────────────────
  // If the response is mostly prose with some JSON wrapping that's broken
  const proseMatch = jsonStr.match(/"answer"\s*:\s*"([\s\S]{50,})$/);
  if (proseMatch) {
    // Strip trailing incomplete JSON
    let text = proseMatch[1];
    // Remove trailing "} or ,"suggestedCards... if present
    text = text.replace(/"\s*,?\s*"suggestedCards[\s\S]*$/, "");
    text = text.replace(/"\s*}\s*$/, "");
    const cleanText = text
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    if (cleanText.length > 50) {
      return { answer: cleanText, suggestedCards: [] };
    }
  }

  // ── Attempt 5: The LLM may have output prose without JSON wrapper ──────────
  // If content is long enough and doesn't look like JSON at all, just use it.
  if (jsonStr.length > 200 && !jsonStr.startsWith("{")) {
    return { answer: jsonStr, suggestedCards: [] };
  }

  return { error: "Failed to parse AI response" };
}

/**
 * Attempts to extract suggestedCards array from a (possibly malformed) JSON string.
 */
function extractSuggestedCards(jsonStr: string): { front: string; back: string }[] {
  const cardsStart = jsonStr.indexOf('"suggestedCards"');
  if (cardsStart === -1) return [];

  // Find the array opening bracket
  const bracketStart = jsonStr.indexOf("[", cardsStart);
  if (bracketStart === -1) return [];

  // Find the matching closing bracket (count nesting)
  let depth = 0;
  let bracketEnd = -1;
  for (let i = bracketStart; i < jsonStr.length; i++) {
    if (jsonStr[i] === "[") depth++;
    else if (jsonStr[i] === "]") {
      depth--;
      if (depth === 0) {
        bracketEnd = i;
        break;
      }
    }
  }

  if (bracketEnd === -1) {
    // Try to find at least partial cards — find the last complete }
    const partialStr = jsonStr.slice(bracketStart);
    const lastBrace = partialStr.lastIndexOf("}");
    if (lastBrace > 0) {
      bracketEnd = bracketStart + lastBrace + 1;
      // Force-close the array
      const arrayStr = jsonStr.slice(bracketStart, bracketEnd) + "]";
      try {
        const cards = JSON.parse(arrayStr);
        if (Array.isArray(cards)) {
          return cards.filter(
            (c: unknown) =>
              typeof c === "object" &&
              c !== null &&
              "front" in c &&
              "back" in c &&
              typeof (c as Record<string, unknown>).front === "string" &&
              typeof (c as Record<string, unknown>).back === "string"
          ) as { front: string; back: string }[];
        }
      } catch {
        return [];
      }
    }
    return [];
  }

  const arrayStr = jsonStr.slice(bracketStart, bracketEnd + 1);
  // Fix control characters before parsing
  const fixedArray = arrayStr.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    return "";
  });

  try {
    const cards = JSON.parse(fixedArray);
    if (Array.isArray(cards)) {
      return cards.filter(
        (c: unknown) =>
          typeof c === "object" &&
          c !== null &&
          "front" in c &&
          "back" in c &&
          typeof (c as Record<string, unknown>).front === "string" &&
          typeof (c as Record<string, unknown>).back === "string"
      ) as { front: string; back: string }[];
    }
  } catch {
    // Try individual card extraction via regex
    const cardMatches = arrayStr.matchAll(
      /\{\s*"front"\s*:\s*"([^"]*(?:\\.[^"]*)*)"\s*,\s*"back"\s*:\s*"([^"]*(?:\\.[^"]*)*)"\s*\}/g
    );
    const cards: { front: string; back: string }[] = [];
    for (const m of cardMatches) {
      cards.push({
        front: m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n"),
        back: m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n"),
      });
    }
    return cards;
  }

  return [];
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
  const sources = assembleSources(academicSources, webSources, query.trim());

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

  // Validate citations: strip any [N] not backed by a real source index.
  let cleanedAnswer = validateResearchCitations(
    aiResult.answer!,
    sources.length
  );

  // Grounding check: strip citations where the claim has near-zero overlap
  // with the cited source's actual content.
  const groundingSources: GroundingSource[] = sources.map((s) => ({
    title: s.title,
    snippet: s.snippet,
  }));
  cleanedAnswer = validateCitationGrounding(cleanedAnswer, groundingSources);

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
