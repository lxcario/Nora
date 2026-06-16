/**
 * Transcript Provider — abstraction layer for fetching YouTube video transcripts.
 *
 * This is a PURE UTILITY file — no "use server" directive.
 * Provides a provider interface for transcript extraction with fallback support.
 *
 * Primary: YouTubeCaptionProvider (youtube-transcript-plus)
 * Fallback: WhisperProvider (Groq Whisper API — stubbed, best-effort)
 */

import {
  fetchTranscript as ytFetchTranscript,
  type TranscriptSegment as YTTranscriptSegment,
} from "youtube-transcript-plus";

import { TranscriptSegment } from "@/lib/supabase/database.types";

// === TranscriptProvider Interface ===

/**
 * Interface for transcript extraction providers.
 * Each provider has a name (used as the `source` field) and a fetch method
 * that returns normalized TranscriptSegment[] for a given YouTube video ID.
 */
export interface TranscriptProvider {
  name: string;
  fetch(youtubeId: string): Promise<TranscriptSegment[]>;
}

// === YouTubeCaptionProvider (primary) ===

/**
 * Extracts captions via YouTube's InnerTube API using youtube-transcript-plus.
 *
 * This is the primary (fast, zero-cost) provider. It accesses YouTube's
 * auto-generated or manually uploaded caption tracks without requiring
 * an API key. May be subject to regional blocking or rate limiting.
 */
export class YouTubeCaptionProvider implements TranscriptProvider {
  name = "youtube";

  async fetch(youtubeId: string): Promise<TranscriptSegment[]> {
    // fetchTranscript returns TranscriptSegment[] from youtube-transcript-plus
    // Each segment has: text, duration, offset, lang
    const rawSegments: YTTranscriptSegment[] = await ytFetchTranscript(youtubeId, {
      lang: "en",
    });

    // Normalize to our internal TranscriptSegment format (drop `lang` field)
    return parseTranscriptResponse(rawSegments);
  }
}

// === WhisperProvider (fallback) ===

/**
 * Fallback provider that transcribes audio via Groq Whisper API.
 *
 * TODO: Full implementation requires:
 * 1. Extract audio stream URL from YouTube video (ytdl-core or yt-dlp)
 * 2. Download audio or stream it to Groq Whisper endpoint
 * 3. Parse Whisper response (with timestamps) into TranscriptSegment[]
 *
 * This is a best-effort fallback for videos without available captions.
 * Higher latency (proportional to video length) and consumes Groq API quota.
 */
export class WhisperProvider implements TranscriptProvider {
  name = "whisper";

  async fetch(youtubeId: string): Promise<TranscriptSegment[]> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY not configured — Whisper fallback unavailable");
    }

    // TODO: Implement full Whisper transcription flow:
    //
    // Step 1: Get audio URL from YouTube video
    //   - Use ytdl-core or yt-dlp to extract audio-only stream URL
    //   - e.g.: const info = await ytdl.getInfo(youtubeId);
    //           const audioUrl = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio' }).url;
    //
    // Step 2: Send audio to Groq Whisper API
    //   - POST to https://api.groq.com/openai/v1/audio/transcriptions
    //   - model: "whisper-large-v3"
    //   - response_format: "verbose_json" (includes word-level timestamps)
    //   - Include audio file/URL in multipart form data
    //
    // Step 3: Parse Whisper response into TranscriptSegment[]
    //   - Map each segment/word group to { text, offset, duration }
    //   - Group words into ~10-second segments for consistency with caption format
    //
    // For now, throw to trigger "All providers failed" error:
    throw new Error(
      `WhisperProvider not yet implemented for video: ${youtubeId}. ` +
      "Audio download + Groq Whisper transcription requires ytdl-core or similar."
    );
  }
}

// === Orchestrator ===

/**
 * Tries transcript providers in sequence and returns the first successful result.
 *
 * Order:
 * 1. YouTubeCaptionProvider — fast, free, uses InnerTube API
 * 2. WhisperProvider — slower, costs Groq quota, handles videos without captions
 *
 * @param youtubeId - The 11-character YouTube video ID
 * @returns Object with normalized segments array and the source provider name
 * @throws Error if all providers fail
 */
export async function getTranscript(youtubeId: string): Promise<{
  segments: TranscriptSegment[];
  source: "youtube" | "whisper";
}> {
  const providers: TranscriptProvider[] = [
    new YouTubeCaptionProvider(),
    new WhisperProvider(),
  ];

  for (const provider of providers) {
    try {
      const segments = await provider.fetch(youtubeId);
      return { segments, source: provider.name as "youtube" | "whisper" };
    } catch (err) {
      console.warn(`[TranscriptProvider] ${provider.name} failed:`, err);
      continue;
    }
  }

  throw new Error("All transcript providers failed");
}

// === Response Normalization ===

/**
 * Normalizes raw transcript response data into our internal TranscriptSegment format.
 *
 * Handles the youtube-transcript-plus response shape (which includes a `lang` field)
 * and ensures all segments have valid numeric offset/duration and non-empty text.
 *
 * @param rawSegments - Raw segment array from any transcript source
 * @returns Normalized TranscriptSegment[] with guaranteed valid types
 */
export function parseTranscriptResponse(
  rawSegments: Array<{ text?: string; offset?: number; duration?: number; lang?: string }>
): TranscriptSegment[] {
  return rawSegments
    .filter((seg) => {
      // Must have non-empty text
      if (!seg.text || typeof seg.text !== "string" || seg.text.trim().length === 0) {
        return false;
      }
      // Must have valid numeric offset (non-negative)
      if (typeof seg.offset !== "number" || seg.offset < 0 || !isFinite(seg.offset)) {
        return false;
      }
      // Must have valid positive duration
      if (typeof seg.duration !== "number" || seg.duration <= 0 || !isFinite(seg.duration)) {
        return false;
      }
      return true;
    })
    .map((seg) => ({
      text: seg.text!.trim(),
      offset: seg.offset!,
      duration: seg.duration!,
    }));
}
