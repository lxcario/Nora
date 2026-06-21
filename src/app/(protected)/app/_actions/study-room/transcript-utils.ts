import { TranscriptSegment } from "@/lib/supabase/database.types";
import { NORA_VOICE_NOTES } from "@/lib/nora-voice";

/**
 * Slices a transcript array to include only segments whose offset
 * falls within [startSeconds, endSeconds).
 *
 * Algorithm:
 *   1. Filter: segment.offset >= startSeconds AND segment.offset < endSeconds
 *   2. Sort by offset ascending (should already be sorted)
 *   3. Return empty array if no matches (caller handles this)
 */
export function sliceTranscript(
  segments: TranscriptSegment[],
  startSeconds: number,
  endSeconds: number
): TranscriptSegment[] {
  return segments
    .filter((seg) => seg.offset >= startSeconds && seg.offset < endSeconds)
    .sort((a, b) => a.offset - b.offset);
}

/**
 * Parses a time input string in "MM:SS" or "HH:MM:SS" format to total seconds.
 * Returns null if the input is invalid.
 */
export function parseTimeInput(input: string): number | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  const parts = trimmed.split(":");

  if (parts.length === 2) {
    // MM:SS
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    // HH:MM:SS
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    if (hours < 0 || minutes < 0 || seconds < 0) return null;
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Formats total seconds into "MM:SS" or "H:MM:SS" string.
 */
export function formatSeconds(seconds: number): string {
  if (seconds < 0) seconds = 0;

  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Validates a time range for note generation.
 * Returns true if 0 <= start < end <= duration.
 */
export function validateTimeRange(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number
): { valid: boolean; error?: string } {
  if (typeof startSeconds !== "number" || isNaN(startSeconds)) {
    return { valid: false, error: "Start time must be a valid number." };
  }
  if (typeof endSeconds !== "number" || isNaN(endSeconds)) {
    return { valid: false, error: "End time must be a valid number." };
  }
  if (typeof durationSeconds !== "number" || isNaN(durationSeconds)) {
    return { valid: false, error: "Video duration must be a valid number." };
  }
  if (startSeconds < 0) {
    return { valid: false, error: "Start time cannot be negative." };
  }
  if (endSeconds <= startSeconds) {
    return { valid: false, error: "End time must be greater than start time." };
  }
  if (endSeconds > durationSeconds) {
    return { valid: false, error: "End time cannot exceed video duration." };
  }
  return { valid: true };
}

/**
 * Builds the LLM system prompt and user message for note generation.
 * Includes video title, formatted time range, and all segment text.
 */
export function buildNotePrompt(
  videoTitle: string,
  startSeconds: number,
  endSeconds: number,
  segments: TranscriptSegment[]
): { system: string; user: string } {
  const startFormatted = formatSeconds(startSeconds);
  const endFormatted = formatSeconds(endSeconds);

  const formattedSegments = segments
    .map((seg) => `[${formatSeconds(seg.offset)}] ${seg.text}`)
    .join("\n");

  const system = `${NORA_VOICE_NOTES}

---

You are an expert academic tutor. Analyze the provided timestamped transcript segment from the video "${videoTitle}" (segment: ${startFormatted} to ${endFormatted}).

Generate structured study materials. Your output must be a single, valid JSON object:

{
  "summary": "A concise academic summary of the segment (100-200 words).",
  "key_concepts": [
    {
      "concept": "Name of the concept",
      "definition": "Detailed explanation grounded in the segment.",
      "timestamp_citation": "MM:SS",
      "offset_seconds": <number>
    }
  ],
  "flashcards": [
    {
      "question": "An active-recall question testing a core concept.",
      "answer": "A precise, evidence-backed answer.",
      "offset_seconds": <number>
    }
  ]
}

Rules:
- Ground all content in the transcript text provided
- Timestamp citations must reference actual offsets from the segment
- Generate 3-7 key concepts and 3-5 flashcards
- Questions should test understanding, not just recall
- Keep summary factual and dense with information`;

  const user = `[TRANSCRIPT SEGMENT: ${startFormatted} to ${endFormatted}]\n${formattedSegments}\n[END SEGMENT]`;

  return { system, user };
}


// ---------------------------------------------------------------------------
// Offset validation (post-LLM, pre-return)
// ---------------------------------------------------------------------------

/**
 * Maximum allowed disagreement (seconds) between a citation string ("MM:SS")
 * and the corresponding numeric offset_seconds before we override one.
 *
 * Rationale: LLMs commonly round offsets to the nearest :10 or :15 mark (e.g.
 * a segment at [07:23] gets cited as offset 440 = 7:20). A 10-second window
 * absorbs that rounding while still catching genuine mismatches (e.g. citation
 * "05:30" = 330 vs offset 180 = 03:00, which differs by 150s >> 10s).
 *
 * For segments spanning 2-10 minutes, 10s is ~2-8% of the range — tight enough
 * to be meaningful, loose enough to avoid over-correcting round numbers.
 */
const CITATION_OFFSET_TOLERANCE_S = 10;

/**
 * Validates and corrects LLM-generated timestamp offsets against the actual
 * transcript segment boundaries.
 *
 * Strategy (clamp, don't drop):
 *   1. Parse timestamp_citation string to seconds; if it disagrees with
 *      offset_seconds by more than CITATION_OFFSET_TOLERANCE_S, trust the
 *      citation string (since the model sees [MM:SS] prefixes in the prompt).
 *   2. Clamp the resolved offset to [startSeconds, endSeconds].
 *   3. Reconcile: update both offset_seconds and timestamp_citation to agree.
 *
 * Rationale: The content (concept/definition) is still valuable even if the
 * offset is imprecise. Clamping keeps the student within the relevant segment
 * rather than losing the concept entirely.
 */
export function validateNoteOffsets(
  keyConcepts: {
    concept: string;
    definition: string;
    timestampCitation: string;
    offsetSeconds: number;
  }[],
  flashcards: {
    front: string;
    back: string;
    offsetSeconds: number;
  }[],
  startSeconds: number,
  endSeconds: number
): {
  keyConcepts: {
    concept: string;
    definition: string;
    timestampCitation: string;
    offsetSeconds: number;
  }[];
  flashcards: {
    front: string;
    back: string;
    offsetSeconds: number;
  }[];
  corrections: number;
} {
  let corrections = 0;

  const validatedConcepts = keyConcepts.map((kc) => {
    const resolved = resolveOffset(
      kc.offsetSeconds,
      kc.timestampCitation,
      startSeconds,
      endSeconds
    );
    if (resolved.corrected) corrections++;
    return {
      ...kc,
      offsetSeconds: resolved.offset,
      timestampCitation: formatSeconds(resolved.offset),
    };
  });

  const validatedFlashcards = flashcards.map((fc) => {
    const resolved = resolveOffset(
      fc.offsetSeconds,
      null, // flashcards don't have a citation string
      startSeconds,
      endSeconds
    );
    if (resolved.corrected) corrections++;
    return {
      ...fc,
      offsetSeconds: resolved.offset,
    };
  });

  return { keyConcepts: validatedConcepts, flashcards: validatedFlashcards, corrections };
}

/**
 * Resolve a single offset:
 *   1. If citation string parses to a valid time and disagrees with numeric
 *      offset by more than the tolerance, prefer the citation (the model sees
 *      [MM:SS] prefixes in the prompt, making it the more grounded signal).
 *   2. Guard against NaN / non-finite values — default to startSeconds.
 *   3. Clamp result to [start, end].
 */
function resolveOffset(
  numericOffset: number,
  citationStr: string | null,
  startSeconds: number,
  endSeconds: number
): { offset: number; corrected: boolean } {
  let best = numericOffset;

  // Cross-check: if citation string parses and meaningfully disagrees, trust it.
  if (citationStr) {
    const parsed = parseTimeCitation(citationStr);
    if (parsed !== null && Number.isFinite(parsed)) {
      if (!Number.isFinite(best) || Math.abs(parsed - best) > CITATION_OFFSET_TOLERANCE_S) {
        best = parsed;
      }
    }
  }

  // NaN / non-finite guard: if nothing resolved to a real number, fall back to
  // the segment start. Math.max/Math.min with NaN returns NaN in JS — this
  // explicit check prevents that from propagating silently.
  if (!Number.isFinite(best)) {
    return { offset: startSeconds, corrected: true };
  }

  // Clamp to segment bounds.
  const clamped = Math.max(startSeconds, Math.min(endSeconds, best));
  const corrected = clamped !== numericOffset;

  return { offset: clamped, corrected };
}

/**
 * Parse a "MM:SS" or "H:MM:SS" citation string to total seconds.
 * Returns null for unparseable strings.
 */
function parseTimeCitation(citation: string): number | null {
  if (!citation || typeof citation !== "string") return null;
  const trimmed = citation.trim();
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(s) || m < 0 || s < 0 || s >= 60) return null;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || s < 0) return null;
    return h * 3600 + m * 60 + s;
  }
  return null;
}
