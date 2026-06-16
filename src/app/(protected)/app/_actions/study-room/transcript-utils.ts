import { TranscriptSegment } from "@/lib/supabase/database.types";

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

  const system = `You are an expert academic tutor. Analyze the provided timestamped transcript segment from the video "${videoTitle}" (segment: ${startFormatted} to ${endFormatted}).

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
