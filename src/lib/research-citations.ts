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
