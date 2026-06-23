/**
 * Pure citation-validation helper for the Research Desk (spec Req 5.2, RESEARCH-1).
 *
 * Lives in a plain module (not a "use server" file) because Next.js 16 only
 * allows async exports from server-action modules, and this is a synchronous
 * pure function. Imported by research.ts and its tests.
 */

/**
 * Strip citation markers [N] from `answer` where N is out of range
 * (N < 1 or N > sourceCount). Preserves valid in-range markers.
 *
 * Idempotent: running it twice yields the same result.
 */
export function validateResearchCitations(
  answer: string,
  sourceCount: number
): string {
  return answer.replace(/\[(\d+)\]/g, (match, numStr) => {
    const n = parseInt(numStr, 10);
    return n >= 1 && n <= sourceCount ? match : "";
  });
}

// ---------------------------------------------------------------------------
// Citation Grounding Check
// ---------------------------------------------------------------------------

/** Minimal stopword set for grounding checks (language-agnostic, kept small). */
const GROUNDING_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "not", "no", "as", "if", "than", "so", "this", "that", "it", "its",
  "bir", "ve", "de", "da", "ile", "için", "bu", "olan", "olarak",
]);

/**
 * Extract meaningful content words from text.
 * Returns lowercase words >2 chars, excluding stopwords.
 */
function extractContentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !GROUNDING_STOPWORDS.has(w))
  );
}

/**
 * Compute grounding score: what fraction of the sentence's content words
 * appear in the source's title+snippet.
 *
 * Returns 0–1. Higher = more grounded in the source.
 */
function groundingScore(sentenceWords: Set<string>, sourceWords: Set<string>): number {
  if (sentenceWords.size === 0) return 0;
  let overlap = 0;
  for (const w of sentenceWords) {
    if (sourceWords.has(w)) overlap++;
  }
  return overlap / sentenceWords.size;
}

/** Minimum grounding score for a citation to be considered valid.
 * Set higher than retrieval threshold (0.15) because at this stage we're
 * checking specific sentence-to-source alignment, not general topical relevance.
 */
const MIN_GROUNDING_SCORE = 0.20;

/**
 * Source snippet/title data needed for grounding checks.
 */
export interface GroundingSource {
  title: string;
  snippet: string;
}

/**
 * Validate citations by checking that each [N] in the answer is grounded
 * in the actual content of source N.
 *
 * For each sentence containing [N], computes lexical overlap between the
 * sentence's content words and source N's title+snippet. Strips citations
 * where overlap is below threshold and marks the claim as unverified.
 *
 * This catches "decorative citations" where the model citation-staples a
 * source number onto an unrelated claim.
 *
 * Known limitation: lexical overlap cannot detect semantic misrepresentation
 * (e.g., source says "X does NOT improve Y" but model writes "X improves Y [N]").
 * High word overlap, completely wrong claim. This check catches fabricated/irrelevant
 * citations, not misrepresented ones.
 *
 * @param answer      The synthesized answer text.
 * @param sources     Array of source data (title + snippet), 0-indexed.
 * @returns           The answer with ungrounded citations replaced by "(unverified)".
 */
export function validateCitationGrounding(
  answer: string,
  sources: GroundingSource[]
): string {
  if (sources.length === 0) return answer;

  // Pre-compute word sets for each source
  const sourceWordSets = sources.map((s) =>
    extractContentWords(`${s.title} ${s.snippet}`)
  );

  // Process each citation occurrence
  return answer.replace(
    /([^[]*?)(\[\d+\])/g,
    (fullMatch, precedingText: string, citation: string) => {
      const numMatch = citation.match(/\[(\d+)\]/);
      if (!numMatch) return fullMatch;

      const n = parseInt(numMatch[1], 10);
      if (n < 1 || n > sources.length) return precedingText; // Out of range, strip

      // Get the sentence context around this citation
      // Use the preceding text (up to 200 chars back) as the claim being cited
      const context = precedingText.slice(-200);
      const sentenceWords = extractContentWords(context);

      // Check grounding against the cited source
      const score = groundingScore(sentenceWords, sourceWordSets[n - 1]);

      if (score >= MIN_GROUNDING_SCORE) {
        return fullMatch; // Citation is grounded, keep it
      }

      // Citation is ungrounded — replace with a visible "unverified" marker
      // that matches the prompt's "Note (unverified): " convention and signals
      // intentional transparency rather than broken formatting.
      return `${precedingText} [unverified]`;
    }
  );
}
