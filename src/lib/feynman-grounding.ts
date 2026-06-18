/**
 * Pure helpers for grounded Feynman evaluation (spec Req 3.2–3.4).
 *
 * These convert a source (indexed paper chunks, pasted notes, or a video
 * transcript) into a set of citeable "passages", and build the grounded
 * evaluation prompt that instructs the model to judge the student's
 * explanation ONLY against those passages — citing passage ids for any
 * amber/red segment.
 *
 * No database, no network, no LLM calls — easy to unit-test.
 */

/** A single citeable source passage shown to the evaluator. */
export interface SourcePassage {
  /** Citation key the evaluator references in feedback, e.g. "P1", "N2". */
  id: string;
  /** The passage text (already truncated to a safe length). */
  text: string;
  /** Human-readable provenance, e.g. '"Paper Title" — Methods (chunk 4)'. */
  location: string;
}

/** Max characters kept per passage. */
const MAX_PASSAGE_CHARS = 700;
/** Max number of passages injected into a single prompt. */
const MAX_PASSAGES = 8;

/** Label rendered in the UI / feedback when no source is attached. */
export const UNVERIFIED_LABEL = "unverified (no source attached)";

// ---------------------------------------------------------------------------
// Passage builders
// ---------------------------------------------------------------------------

/** Clamp a passage's text to MAX_PASSAGE_CHARS, trimming whitespace. */
function clampPassageText(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > MAX_PASSAGE_CHARS ? `${t.slice(0, MAX_PASSAGE_CHARS)}…` : t;
}

/**
 * Split free-form text (notes or a transcript) into citeable passages.
 *
 * Splits on blank lines first; long paragraphs are windowed into ~700-char
 * chunks. Each passage gets an id `${prefix}${n}` and shares the given location.
 *
 * @param text      Raw source text.
 * @param prefix    Citation id prefix, e.g. "N" for notes, "T" for transcript.
 * @param location  Provenance label applied to every passage.
 */
export function textToPassages(
  text: string,
  prefix: string,
  location: string
): SourcePassage[] {
  if (!text || !text.trim()) return [];

  // Split on blank lines into paragraph-ish blocks.
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Window any block longer than the per-passage cap.
  const windows: string[] = [];
  for (const block of blocks) {
    if (block.length <= MAX_PASSAGE_CHARS) {
      windows.push(block);
    } else {
      for (let i = 0; i < block.length; i += MAX_PASSAGE_CHARS) {
        windows.push(block.slice(i, i + MAX_PASSAGE_CHARS));
      }
    }
    if (windows.length >= MAX_PASSAGES) break;
  }

  return windows.slice(0, MAX_PASSAGES).map((w, i) => ({
    id: `${prefix}${i + 1}`,
    text: clampPassageText(w),
    location,
  }));
}

/**
 * Build passages from retrieved paper chunks.
 *
 * @param chunks     Retrieved chunks (already relevance-ranked).
 * @param paperTitle Title used in each passage's provenance label.
 */
export function chunksToPassages(
  chunks: { content: string; sectionHeading?: string | null; chunkIndex: number }[],
  paperTitle: string
): SourcePassage[] {
  return chunks.slice(0, MAX_PASSAGES).map((c, i) => {
    const section = c.sectionHeading?.trim() || "section";
    return {
      id: `P${i + 1}`,
      text: clampPassageText(c.content),
      location: `"${paperTitle}" — ${section} (chunk ${c.chunkIndex})`,
    };
  });
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Render the passages block injected into the grounded prompt.
 */
export function renderPassagesContext(passages: SourcePassage[]): string {
  return passages
    .map((p) => `[${p.id}] (${p.location})\n${p.text}`)
    .join("\n\n");
}

/**
 * Build the grounded evaluation system prompt.
 *
 * Differs from the default prompt in that the model is told its ONLY source of
 * truth is the provided passages, and that every amber/red segment's feedback
 * MUST cite the passage id(s) that the student contradicts or omits (Req 3.2, 3.3).
 *
 * @param topicName   Topic display name.
 * @param subjectName Subject display name.
 * @param passages    Retrieved source passages (must be non-empty for grounding).
 */
export function buildGroundedPrompt(
  topicName: string,
  subjectName: string,
  passages: SourcePassage[]
): string {
  const passageIds = passages.map((p) => p.id).join(", ");

  return `You are the "Inquisitive Student" — a careful evaluator. The student is studying: ${topicName} (Subject: ${subjectName}).

CRITICAL GROUNDING RULE:
You are given SOURCE PASSAGES below. They are your ONLY source of truth. Judge the accuracy of the student's explanation STRICTLY against these passages. Do NOT use outside knowledge to mark something correct or incorrect — if the passages don't address a claim, treat it as unverifiable and say so rather than guessing.

SOURCE PASSAGES (cite these by id, e.g. [${passageIds || "P1"}]):
${renderPassagesContext(passages)}

Your job:
1. Read the student's explanation and assess it ONLY against the passages above.
2. Ask 2-3 probing questions grounded in the source material (edge cases, implications).
3. Paraphrase what the student explained.
4. Break their explanation into segments and classify each:
   - "green" = supported by the passages and accurate
   - "amber" = partially supported, oversimplified, or vague vs the passages
   - "red" = contradicted by the passages, or a key point the passages cover is missing
5. For EVERY amber or red segment, the "feedback" MUST cite the specific passage id
   (e.g. "Contradicts [P2]: ...", or "Missing — see [N1]: ...") that the student
   contradicts or omits. Quote or paraphrase the relevant passage.
6. Suggest 3-5 flashcard Q/A pairs drawn from the passages.

RULES:
- Do NOT accept questions as explanations. If the student asks questions instead of explaining, mark everything RED and tell them to EXPLAIN.
- Never invent facts that are not in the passages.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "questions": ["grounded question 1", "question 2", "question 3"],
  "paraphrase": "your restatement of what they explained",
  "segments": [
    {"text": "exact quote from their explanation", "status": "green|amber|red", "feedback": "evaluation citing [passage id] for amber/red"}
  ],
  "suggestedCards": [
    {"front": "Question from the source?", "back": "Answer grounded in the passages"}
  ]
}`;
}
