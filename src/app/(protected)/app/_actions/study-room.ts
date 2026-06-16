"use server";

import { createClient } from "@/lib/supabase/server";
import {
  TranscriptSegment,
  VideoRecord,
  NoteRecord,
} from "@/lib/supabase/database.types";
import { VideoSearchResult } from "./study-room/search-heuristic";
import {
  validateSearchQuery,
  buildSearchQuery,
  filterAndRankVideos,
  extractYouTubeId,
  YouTubeVideoMetadata,
} from "./study-room/search-heuristic";
import { getTranscript } from "./study-room/transcript-provider";
import {
  validateTimeRange,
  sliceTranscript,
  buildNotePrompt,
} from "./study-room/transcript-utils";
import { rewardAction, rewardBatch } from "./gamification";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// === Constants ===

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/** YouTube video category IDs */
const CATEGORY_EDUCATION = "27";
const CATEGORY_SCIENCE_TECH = "28";

/** Max results from search.list (fetch extra for heuristic filtering) */
const SEARCH_MAX_RESULTS = 20;

// === Helpers ===

/**
 * Parses an ISO 8601 duration string (e.g. PT4M13S, PT1H2M3S) to seconds.
 * Returns 0 for unparseable durations.
 */
function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Checks if a YouTube API error response indicates quota exhaustion.
 */
function isQuotaExhausted(status: number, body: string): boolean {
  if (status !== 403) return false;
  try {
    const parsed = JSON.parse(body);
    const errors = parsed?.error?.errors ?? [];
    return errors.some(
      (e: { reason?: string }) =>
        e.reason === "quotaExceeded" || e.reason === "dailyLimitExceeded"
    );
  } catch {
    // If body isn't valid JSON, treat any 403 as potential quota issue
    return true;
  }
}

// === Exported Server Actions ===

/**
 * Searches YouTube for educational videos using a two-step pipeline:
 * 1. search.list → get video IDs (filtered by category + duration)
 * 2. videos.list → get full metadata (duration, stats, thumbnails)
 * 3. Heuristic scoring → filter and rank by educational relevance
 *
 * Returns up to 10 scored results.
 */
export async function searchVideos(query: string): Promise<{
  data?: VideoSearchResult[];
  error?: string;
}> {
  // Validate input
  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Rate limit check (YouTube API is quota-sensitive)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const rateCheck = checkRateLimit(user.id, "video_search", RATE_LIMITS.video_search.maxRequests, RATE_LIMITS.video_search.windowMs);
    if (!rateCheck.allowed) {
      return { error: `Too many searches. Please wait ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)} seconds.` };
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { error: "YouTube API key not configured. Please contact support." };
  }

  // Build search query with exclusion modifiers
  const fullQuery = buildSearchQuery(validation.trimmed);

  // Step 1: search.list — try Education category first, fallback to Science & Tech
  let videoIds: string[] = [];

  for (const categoryId of [CATEGORY_EDUCATION, CATEGORY_SCIENCE_TECH]) {
    const searchParams = new URLSearchParams({
      part: "id",
      q: fullQuery,
      type: "video",
      videoCategoryId: categoryId,
      videoDuration: "medium",
      maxResults: SEARCH_MAX_RESULTS.toString(),
      order: "relevance",
      safeSearch: "strict",
      key: apiKey,
    });

    // Also search for long videos in the same category
    const searchParamsLong = new URLSearchParams({
      part: "id",
      q: fullQuery,
      type: "video",
      videoCategoryId: categoryId,
      videoDuration: "long",
      maxResults: SEARCH_MAX_RESULTS.toString(),
      order: "relevance",
      safeSearch: "strict",
      key: apiKey,
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const [mediumRes, longRes] = await Promise.all([
        fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`, {
          signal: controller.signal,
        }),
        fetch(`${YOUTUBE_API_BASE}/search?${searchParamsLong}`, {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeout);

      // Check for quota exhaustion on either response
      if (!mediumRes.ok || !longRes.ok) {
        const failedRes = !mediumRes.ok ? mediumRes : longRes;
        const body = await failedRes.text();

        if (isQuotaExhausted(failedRes.status, body)) {
          return {
            error:
              "Daily search limit reached. Paste a YouTube URL instead to load a video directly.",
          };
        }

        // If first category fails with non-quota error, try next category
        if (categoryId === CATEGORY_EDUCATION) continue;

        return {
          error:
            "Search service temporarily unavailable. Please try again in a moment.",
        };
      }

      const mediumData = await mediumRes.json();
      const longData = await longRes.json();

      // Collect video IDs from both duration searches
      const mediumIds = (mediumData.items ?? []).map(
        (item: { id?: { videoId?: string } }) => item.id?.videoId
      ).filter(Boolean) as string[];

      const longIds = (longData.items ?? []).map(
        (item: { id?: { videoId?: string } }) => item.id?.videoId
      ).filter(Boolean) as string[];

      // Deduplicate and merge
      videoIds = Array.from(new Set([...mediumIds, ...longIds]));

      // If we got results from Education, no need to try Science & Tech
      if (videoIds.length > 0) break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("abort")) {
        return {
          error:
            "Search request timed out. Please try again.",
        };
      }

      // If first category fails, try next
      if (categoryId === CATEGORY_EDUCATION) continue;

      return {
        error:
          "Search service temporarily unavailable. Please try again in a moment.",
      };
    }
  }

  // No results from either category
  if (videoIds.length === 0) {
    return { data: [] };
  }

  // Step 2: videos.list — get full metadata for scoring
  try {
    const videosParams = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoIds.join(","),
      key: apiKey,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const videosRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?${videosParams}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!videosRes.ok) {
      const body = await videosRes.text();
      if (isQuotaExhausted(videosRes.status, body)) {
        return {
          error:
            "Daily search limit reached. Paste a YouTube URL instead to load a video directly.",
        };
      }
      return {
        error:
          "Search service temporarily unavailable. Please try again in a moment.",
      };
    }

    const videosData = await videosRes.json();

    // Step 3: Parse metadata and apply heuristic scoring
    const videos: YouTubeVideoMetadata[] = (videosData.items ?? []).map(
      (item: {
        id: string;
        snippet?: {
          title?: string;
          description?: string;
          channelTitle?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
        contentDetails?: { duration?: string };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
        };
      }) => ({
        youtubeId: item.id,
        title: item.snippet?.title ?? "",
        description: item.snippet?.description ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        durationSeconds: parseISO8601Duration(
          item.contentDetails?.duration ?? "PT0S"
        ),
        viewCount: parseInt(item.statistics?.viewCount ?? "0", 10),
        likeCount: parseInt(item.statistics?.likeCount ?? "0", 10),
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          "",
      })
    );

    // Apply heuristic filtering and ranking (returns top 10)
    const results = filterAndRankVideos(videos, 10);

    return { data: results };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return {
        error: "Search request timed out. Please try again.",
      };
    }
    return {
      error:
        "Search service temporarily unavailable. Please try again in a moment.",
    };
  }
}

// === fetchTranscript ===

/**
 * Fetches video transcript with caching.
 *
 * 1. Checks `video_transcripts` cache by video_id + language ('en')
 * 2. On cache miss: calls getTranscript() orchestrator (YouTube captions → Whisper fallback)
 * 3. Stores result in video_transcripts table
 * 4. Handles rate limiting (429) with Retry-After parsing
 *
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 12.2, 12.4
 */
export async function fetchTranscript(videoId: string): Promise<{
  data?: TranscriptSegment[];
  error?: string;
  source?: "youtube" | "whisper";
}> {
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required" };
  }

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Authentication required" };
  }

  // First, verify this video belongs to the user (RLS will handle this,
  // but we need the video's youtube_id for the transcript provider)
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, youtube_id")
    .eq("id", videoId)
    .single();

  if (videoError || !video) {
    return { error: "Video not found. Please load the video first." };
  }

  // Check cache: video_transcripts by video_id + language
  const { data: cached } = await supabase
    .from("video_transcripts")
    .select("segments, source")
    .eq("video_id", videoId)
    .eq("language", "en")
    .limit(1)
    .single();

  if (cached) {
    // Cache hit — return stored transcript
    const segments = cached.segments as unknown as TranscriptSegment[];
    return {
      data: segments,
      source: cached.source as "youtube" | "whisper",
    };
  }

  // Cache miss — fetch from transcript providers
  try {
    const result = await getTranscript(video.youtube_id);

    // Store in cache
    const { error: insertError } = await supabase
      .from("video_transcripts")
      .insert({
        video_id: videoId,
        language: "en",
        segments: result.segments as unknown as import("@/lib/supabase/database.types").Json,
        source: result.source,
      });

    if (insertError) {
      console.warn("Failed to cache transcript:", insertError.message);
      // Still return the data even if caching fails
    }

    return {
      data: result.segments,
      source: result.source,
    };
  } catch (err) {
    // Handle rate limiting (429) with Retry-After parsing
    if (
      err instanceof Error &&
      "status" in err &&
      (err as Error & { status: number }).status === 429
    ) {
      const retryAfter =
        "retryAfter" in err ? (err as unknown as { retryAfter: string | null }).retryAfter : null;
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      const waitTime = isNaN(waitSeconds) || waitSeconds <= 0 ? 60 : waitSeconds;

      return {
        error: `Transcription is temporarily rate-limited. Please try again in ${waitTime} seconds.`,
      };
    }

    // All providers failed
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: `No transcript available for this video. ${message}`,
    };
  }
}

// === loadVideo ===

/**
 * Loads (or retrieves) a video record for the current user.
 *
 * Accepts a YouTube video ID or URL, extracts the ID, and UPSERTs
 * into the `videos` table with the provided metadata.
 *
 * Requirements: 2.7
 */
export async function loadVideo(
  youtubeIdOrUrl: string,
  title: string,
  channelTitle?: string,
  durationSeconds?: number
): Promise<{
  data?: VideoRecord;
  error?: string;
}> {
  if (!youtubeIdOrUrl || typeof youtubeIdOrUrl !== "string") {
    return { error: "YouTube video ID or URL is required" };
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return { error: "Video title is required" };
  }

  // Extract YouTube ID from URL or validate plain ID
  const youtubeId = extractYouTubeId(youtubeIdOrUrl);
  if (!youtubeId) {
    return { error: "Invalid YouTube URL or video ID" };
  }

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Authentication required" };
  }

  // UPSERT: create or update the video record for this user
  const { data, error } = await supabase
    .from("videos")
    .upsert(
      {
        user_id: user.id,
        youtube_id: youtubeId,
        title: title.trim(),
        channel_title: channelTitle?.trim() || null,
        duration_seconds: durationSeconds ?? 0,
      },
      {
        onConflict: "user_id,youtube_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to load video:", error.message);
    return { error: "Failed to save video record. Please try again." };
  }

  // Map DB row to VideoRecord interface
  const videoRecord: VideoRecord = {
    id: data.id,
    userId: data.user_id,
    youtubeId: data.youtube_id,
    title: data.title,
    channelTitle: data.channel_title,
    durationSeconds: data.duration_seconds,
    topicId: data.topic_id,
    createdAt: data.created_at,
  };

  return { data: videoRecord };
}


// === GeneratedNotes Interface ===

interface GeneratedNotes {
  summary: string;
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
}

// === LLM Call Helper (Groq primary, OpenRouter fallback) ===

/**
 * Calls an LLM with structured prompts.
 * Primary: Groq (fast, 15s timeout)
 * Fallback: OpenRouter (45s timeout)
 */
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  // Try Groq first (much faster)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

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
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
      console.warn("Groq failed, falling back to OpenRouter:", res.status);
    } catch (err) {
      console.warn("Groq error, falling back to OpenRouter:", err);
    }
  }

  // Fallback: OpenRouter
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) throw new Error("No AI API key configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

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
      temperature: 0.7,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// === generateNotes ===

/**
 * Generates AI-powered timestamped study notes from a video segment.
 *
 * 1. Validates time range
 * 2. Fetches cached transcript and slices by time range
 * 3. Builds structured LLM prompt
 * 4. Calls Groq (15s) with OpenRouter fallback (45s)
 * 5. Parses structured JSON response
 * 6. Saves note to DB with numrange time_segment
 * 7. Awards XP via rewardAction("session_complete")
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.1
 */
export async function generateNotes(
  videoId: string,
  startSeconds: number,
  endSeconds: number
): Promise<{
  data?: GeneratedNotes;
  error?: string;
}> {
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Get video record (for title and duration validation)
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, title, duration_seconds, youtube_id")
    .eq("id", videoId)
    .single();

  if (videoError || !video) {
    return { error: "Video not found. Please load the video first." };
  }

  // Validate time range
  const rangeValidation = validateTimeRange(startSeconds, endSeconds, video.duration_seconds);
  if (!rangeValidation.valid) {
    return { error: rangeValidation.error };
  }

  // Fetch cached transcript
  const { data: transcriptRow } = await supabase
    .from("video_transcripts")
    .select("segments")
    .eq("video_id", videoId)
    .eq("language", "en")
    .limit(1)
    .single();

  if (!transcriptRow || !transcriptRow.segments) {
    return { error: "No transcript available. Please fetch the transcript first." };
  }

  const allSegments = transcriptRow.segments as unknown as TranscriptSegment[];

  // Slice transcript by time range
  const slicedSegments = sliceTranscript(allSegments, startSeconds, endSeconds);

  if (slicedSegments.length === 0) {
    return { error: "No transcript content available for the selected time range." };
  }

  // Build LLM prompt
  const { system: systemPrompt, user: userMessage } = buildNotePrompt(
    video.title,
    startSeconds,
    endSeconds,
    slicedSegments
  );

  // Call LLM
  let responseText: string;
  try {
    responseText = await callLLM(systemPrompt, userMessage);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort") || message.includes("aborted")) {
      return { error: "Note generation timed out. AI models may be busy — please try again." };
    }
    return { error: `Note generation failed: ${message}` };
  }

  // Guard against empty response
  if (!responseText?.trim()) {
    return { error: "AI returned an empty response. Please try again." };
  }

  // Strip possible markdown fences (recovery for LLMs that wrap in ```json)
  const jsonStr = responseText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Parse structured JSON response
  let parsed: {
    summary?: string;
    key_concepts?: {
      concept?: string;
      definition?: string;
      timestamp_citation?: string;
      offset_seconds?: number;
    }[];
    flashcards?: {
      question?: string;
      answer?: string;
      offset_seconds?: number;
    }[];
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("generateNotes JSON parse error:", jsonStr.slice(0, 500));
    return { error: "AI returned invalid JSON. Please try again." };
  }

  // Validate required structure
  if (
    !parsed ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.key_concepts) ||
    !Array.isArray(parsed.flashcards)
  ) {
    return { error: "AI returned an invalid response structure. Please try again." };
  }

  // Map to GeneratedNotes interface
  const generatedNotes: GeneratedNotes = {
    summary: parsed.summary,
    keyConcepts: parsed.key_concepts.map((kc) => ({
      concept: kc.concept ?? "",
      definition: kc.definition ?? "",
      timestampCitation: kc.timestamp_citation ?? "00:00",
      offsetSeconds: kc.offset_seconds ?? 0,
    })),
    flashcards: parsed.flashcards.map((fc) => ({
      front: fc.question ?? "",
      back: fc.answer ?? "",
      offsetSeconds: fc.offset_seconds ?? 0,
    })),
  };

  // Save note to `notes` table with numrange time_segment format: [start, end)
  const { error: insertError } = await supabase.from("notes").insert({
    user_id: user.id,
    video_id: videoId,
    time_segment: `[${startSeconds},${endSeconds})`,
    note_content: generatedNotes.summary,
    rich_content: null,
    source: "ai",
  });

  if (insertError) {
    console.error("Failed to save note:", insertError.message);
    // Still return the generated notes even if DB save fails
  }

  // Award XP via rewardAction("session_complete") — 10 XP, 3 coins
  try {
    await rewardAction("session_complete");
  } catch (err) {
    console.warn("Failed to award XP:", err);
  }

  return { data: generatedNotes };
}


// === saveNote ===

/**
 * Saves a manual note for a video with a numrange time segment.
 * Inserts a new note record with the given content and optional Tiptap rich content.
 *
 * Requirements: 5.6, 11.2
 */
export async function saveNote(
  videoId: string,
  timeSegment: { start: number; end: number },
  noteContent: string,
  richContent?: object
): Promise<{ data?: NoteRecord; error?: string }> {
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  if (!noteContent || typeof noteContent !== "string" || noteContent.trim().length === 0) {
    return { error: "Note content is required." };
  }

  if (
    !timeSegment ||
    typeof timeSegment.start !== "number" ||
    typeof timeSegment.end !== "number" ||
    timeSegment.start < 0 ||
    timeSegment.end <= timeSegment.start
  ) {
    return { error: "Invalid time segment. Start must be >= 0 and end must be > start." };
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Verify the video exists and belongs to user (RLS handles ownership)
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id")
    .eq("id", videoId)
    .single();

  if (videoError || !video) {
    return { error: "Video not found. Please load the video first." };
  }

  // Store time_segment as numrange string format: [start, end)
  const timeSegmentStr = `[${timeSegment.start},${timeSegment.end})`;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      video_id: videoId,
      time_segment: timeSegmentStr,
      note_content: noteContent.trim(),
      rich_content: (richContent as import("@/lib/supabase/database.types").Json) ?? null,
      source: "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save note:", error.message);
    return { error: "Failed to save note. Please try again." };
  }

  // Map DB row to NoteRecord interface
  const noteRecord: NoteRecord = {
    id: data.id,
    userId: data.user_id,
    videoId: data.video_id,
    timeSegment: { start: timeSegment.start, end: timeSegment.end },
    noteContent: data.note_content,
    richContent: data.rich_content as object | null,
    source: data.source as "manual" | "ai",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return { data: noteRecord };
}

// === getVideoNotes ===

/**
 * Retrieves all notes for a specific video, ordered by time segment start (ascending).
 *
 * Requirements: 5.6, 11.5
 */
export async function getVideoNotes(videoId: string): Promise<{
  data?: NoteRecord[];
  error?: string;
}> {
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Query notes for this video, ordered by lower(time_segment) ASC.
  // Supabase client doesn't support `lower(time_segment)` natively,
  // so we fetch and sort client-side, or use a raw RPC.
  // For simplicity and RLS compatibility, we fetch all notes for the video
  // and sort by parsing the time_segment string.
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch notes:", error.message);
    return { error: "Failed to load notes. Please try again." };
  }

  // Parse numrange strings and map to NoteRecord[], then sort by start time
  const notes: NoteRecord[] = (data ?? []).map((row) => {
    // Parse numrange string e.g. "[0,120)" → { start: 0, end: 120 }
    const parsed = parseNumrange(row.time_segment);
    return {
      id: row.id,
      userId: row.user_id,
      videoId: row.video_id,
      timeSegment: parsed,
      noteContent: row.note_content,
      richContent: row.rich_content as object | null,
      source: row.source as "manual" | "ai",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  // Sort by lower bound of time segment (start) ascending
  notes.sort((a, b) => a.timeSegment.start - b.timeSegment.start);

  return { data: notes };
}

/**
 * Parses a PostgreSQL numrange string into { start, end }.
 * Handles formats like "[0,120)", "(5,100]", "[10,300]", etc.
 * Returns { start: 0, end: 0 } for unparseable values.
 */
function parseNumrange(range: string): { start: number; end: number } {
  if (!range || typeof range !== "string") return { start: 0, end: 0 };

  // Match pattern: [/( number , number )/]
  const match = range.match(/[\[\(]\s*([\d.]+)\s*,\s*([\d.]+)\s*[\]\)]/);
  if (!match) return { start: 0, end: 0 };

  return {
    start: parseFloat(match[1]),
    end: parseFloat(match[2]),
  };
}

// === updateVideoTopic ===

/**
 * Updates a video record's topic_id association.
 * Allows setting or removing (null) the topic link.
 *
 * Requirements: 11.2, 11.5
 */
export async function updateVideoTopic(
  videoId: string,
  topicId: string | null
): Promise<{ success?: boolean; error?: string }> {
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  if (topicId !== null && (typeof topicId !== "string" || topicId.trim().length === 0)) {
    return { error: "Topic ID must be a valid string or null." };
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Update the video's topic_id (RLS ensures ownership)
  const { error } = await supabase
    .from("videos")
    .update({ topic_id: topicId })
    .eq("id", videoId);

  if (error) {
    console.error("Failed to update video topic:", error.message);
    return { error: "Failed to update video topic. Please try again." };
  }

  return { success: true };
}


// === saveVideoCards ===

/**
 * Saves flashcards generated from video content.
 *
 * - Validates card field lengths (front ≤ 200, back ≤ 1000)
 * - Sets source_type: 'video' and metadata: { video_id, offset_seconds } on each card
 * - Inherits video's topic_id when user doesn't explicitly select a different one
 * - Awards XP via rewardAction("card_created") once per card
 *
 * Requirements: 6.2, 6.3, 6.5, 6.6, 9.3, 11.3
 */
export async function saveVideoCards(
  cards: { front: string; back: string; offsetSeconds: number }[],
  videoId: string,
  topicId?: string
): Promise<{ success?: boolean; count?: number; error?: string }> {
  // Input validation
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    return { error: "At least one card is required." };
  }

  // Validate card field lengths
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const frontTrimmed = card.front?.trim() ?? "";
    const backTrimmed = card.back?.trim() ?? "";

    if (frontTrimmed.length < 1 || frontTrimmed.length > 200) {
      return {
        error: `Card ${i + 1}: Front must be between 1 and 200 characters.`,
      };
    }
    if (backTrimmed.length < 1 || backTrimmed.length > 1000) {
      return {
        error: `Card ${i + 1}: Back must be between 1 and 1000 characters.`,
      };
    }
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Fetch the video record to get its topic_id for inheritance
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, topic_id, youtube_id")
    .eq("id", videoId)
    .single();

  if (videoError || !video) {
    return { error: "Video not found. Please load the video first." };
  }

  // Determine topic_id: use explicit topicId if provided, otherwise inherit from video
  const resolvedTopicId = topicId ?? video.topic_id ?? null;

  // Build card records with source_type: 'video' and metadata
  const cardsToInsert = cards.map((card) => ({
    user_id: user.id,
    topic_id: resolvedTopicId,
    front: card.front.trim(),
    back: card.back.trim(),
    source_type: "video" as const,
    metadata: {
      video_id: videoId,
      youtube_id: video.youtube_id,
      offset_seconds: card.offsetSeconds,
    },
  }));

  const { error: insertError } = await supabase.from("cards").insert(cardsToInsert);

  if (insertError) {
    console.error("Failed to save video cards:", insertError.message);
    return { error: "Failed to save cards. Please try again." };
  }

  // Award XP via rewardBatch("card_created") — single DB round-trip
  try {
    await rewardBatch("card_created", cards.length);
  } catch (err) {
    console.warn("Failed to award XP for video cards:", err);
  }

  return { success: true, count: cards.length };
}

// === evaluateWithTranscript ===

/**
 * Feynman prompt with transcript context for video-based evaluation.
 * Augments the standard Feynman evaluation with the transcript segment
 * as ground truth so the AI can evaluate accuracy against actual video content.
 */
const FEYNMAN_VIDEO_PROMPT = `You are the "Inquisitive Student" — a knowledgeable evaluator who deeply understands the topic the student is studying. You have access to the original video transcript as ground truth.

THE STUDENT WATCHED A VIDEO SEGMENT AND IS EXPLAINING WHAT THEY LEARNED.

GROUND TRUTH TRANSCRIPT (use this as the authoritative source):
{{TRANSCRIPT_TEXT}}

Your job:
1. Use the transcript above as the definitive source of truth for evaluation.
2. Read the student's explanation and assess whether they truly understand the concepts covered in the transcript.
3. Ask 2-3 probing questions that test DEEPER understanding — not basic "what is this?" questions. Ask about edge cases, implications, trade-offs, or real-world scenarios.
4. Paraphrase what the student explained in technical but clear terms.
5. Break their explanation into segments and classify each:
   - "green" = technically accurate AND aligned with transcript content, demonstrates real understanding
   - "amber" = partially correct but oversimplified, missing nuance, or vague compared to what's in the transcript
   - "red" = factually wrong, contradicts the transcript, critical misconception, or missing essential information that's clearly stated in the transcript
6. For each segment, explain WHAT specifically is right/wrong/missing, referencing the actual transcript content.
7. Suggest 3-5 high-quality flashcard Q/A pairs covering KEY concepts from the transcript — include technical details, formulas, or specifications where relevant.

RULES:
- Evaluate the explanation AGAINST the transcript content — the transcript is your ground truth.
- Be technically precise. Reference actual content from the transcript when evaluating accuracy.
- Suggested cards should be study-worthy: specific facts, comparisons, definitions from the transcript — not vague generalities.
- Do NOT accept questions as explanations. If the student asks questions instead of explaining, mark everything RED.

Respond ONLY with valid JSON (no markdown, no code fences, no extra text):
{
  "questions": ["deep probing question 1", "edge case question 2", "implication question 3"],
  "paraphrase": "your technical restatement of what they explained",
  "segments": [
    {"text": "exact quote from their explanation", "status": "green|amber|red", "feedback": "technical evaluation referencing transcript content"}
  ],
  "suggestedCards": [
    {"front": "Specific technical question about this topic?", "back": "Precise answer with details/specs/formulas from the transcript"}
  ]
}`;

/**
 * Fallback Feynman prompt when transcript is unavailable.
 * Uses only the video title for context.
 */
const FEYNMAN_VIDEO_FALLBACK_PROMPT = `You are the "Inquisitive Student" — a knowledgeable evaluator who deeply understands the topic the student is studying.

THE STUDENT WATCHED A VIDEO AND IS EXPLAINING WHAT THEY LEARNED.
Video title: "{{VIDEO_TITLE}}"

Your job:
1. Use your expert knowledge to evaluate the student's explanation of the video content.
2. Ask 2-3 probing questions that test DEEPER understanding.
3. Paraphrase what the student explained in technical but clear terms.
4. Break their explanation into segments and classify each:
   - "green" = technically accurate, demonstrates real understanding
   - "amber" = partially correct but oversimplified or vague
   - "red" = factually wrong, critical misconception, or missing essential information
5. For each segment, explain what is right/wrong/missing.
6. Suggest 3-5 high-quality flashcard Q/A pairs covering KEY concepts.

RULES:
- Be technically precise.
- Do NOT accept questions as explanations.

Respond ONLY with valid JSON (no markdown, no code fences, no extra text):
{
  "questions": ["deep probing question 1", "edge case question 2", "implication question 3"],
  "paraphrase": "your technical restatement of what they explained",
  "segments": [
    {"text": "exact quote from their explanation", "status": "green|amber|red", "feedback": "technical evaluation"}
  ],
  "suggestedCards": [
    {"front": "Specific technical question?", "back": "Precise answer with details"}
  ]
}`;

/** GapAnalysis type for Feynman evaluation results */
interface GapAnalysis {
  questions: string[];
  paraphrase: string;
  segments: { text: string; status: "green" | "amber" | "red"; feedback: string }[];
  suggestedCards: { front: string; back: string }[];
}

/**
 * Evaluates a Feynman explanation of a video segment with transcript context.
 *
 * 1. Validates explanation length (≥ 50 chars trimmed)
 * 2. Slices transcript for the watched segment
 * 3. Injects transcript text into Feynman prompt as additional context
 * 4. Calls callLLM (Groq primary, OpenRouter fallback)
 * 5. Parses GapAnalysis response
 * 6. Awards XP via rewardAction("feynman")
 * 7. Sets generated cards with source_type: 'video' metadata
 * 8. Falls back to evaluate without transcript if unavailable
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.2
 */
export async function evaluateWithTranscript(
  videoId: string,
  explanation: string,
  startSeconds: number,
  endSeconds: number,
  topicId?: string
): Promise<{ data?: GapAnalysis; error?: string }> {
  // Input validation
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  if (!explanation?.trim()) {
    return { error: "Please write an explanation first." };
  }

  if (explanation.trim().length < 50) {
    return { error: "Please write a more detailed explanation (at least 50 characters)." };
  }

  if (typeof startSeconds !== "number" || typeof endSeconds !== "number") {
    return { error: "Start and end times must be valid numbers." };
  }

  if (startSeconds >= endSeconds) {
    return { error: "End time must be greater than start time." };
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Fetch video record for title and topic_id
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, title, topic_id, duration_seconds")
    .eq("id", videoId)
    .single();

  if (videoError || !video) {
    return { error: "Video not found. Please load the video first." };
  }

  // Attempt to get transcript for the watched segment
  let transcriptText: string | null = null;

  const { data: transcriptRow } = await supabase
    .from("video_transcripts")
    .select("segments")
    .eq("video_id", videoId)
    .eq("language", "en")
    .limit(1)
    .single();

  if (transcriptRow?.segments) {
    const allSegments = transcriptRow.segments as unknown as TranscriptSegment[];
    const slicedSegments = sliceTranscript(allSegments, startSeconds, endSeconds);

    if (slicedSegments.length > 0) {
      // Format transcript segments into readable text with timestamps
      transcriptText = slicedSegments
        .map((seg) => `[${formatSecondsInternal(seg.offset)}] ${seg.text}`)
        .join("\n");
    }
  }

  // Build prompt — with transcript if available, fallback otherwise
  let systemPrompt: string;

  if (transcriptText) {
    // Inject transcript into the video Feynman prompt
    systemPrompt = FEYNMAN_VIDEO_PROMPT.replace("{{TRANSCRIPT_TEXT}}", transcriptText);
  } else {
    // Fallback: evaluate without transcript, using only video title
    systemPrompt = FEYNMAN_VIDEO_FALLBACK_PROMPT.replace("{{VIDEO_TITLE}}", video.title);
  }

  // Call LLM (Groq primary, OpenRouter fallback)
  let responseText: string;
  try {
    responseText = await callLLM(systemPrompt, explanation.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort") || message.includes("aborted")) {
      return { error: "Request timed out. AI models may be busy — try again." };
    }
    return { error: `AI evaluation failed: ${message}` };
  }

  // Guard against empty response
  if (!responseText?.trim()) {
    return { error: "AI returned an empty response. Please try again." };
  }

  // Strip possible markdown fences
  const jsonStr = responseText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Parse GapAnalysis response
  let analysis: GapAnalysis;
  try {
    const parsed = JSON.parse(jsonStr);

    // Structural validation
    if (
      !parsed ||
      !Array.isArray(parsed.questions) ||
      typeof parsed.paraphrase !== "string" ||
      !Array.isArray(parsed.segments) ||
      !Array.isArray(parsed.suggestedCards)
    ) {
      console.error("evaluateWithTranscript invalid structure:", jsonStr.slice(0, 500));
      return { error: "AI returned an invalid response structure. Please try again." };
    }

    analysis = parsed as GapAnalysis;
  } catch {
    console.error("evaluateWithTranscript JSON parse error:", jsonStr.slice(0, 500));
    return { error: "AI returned invalid JSON. Please try again." };
  }

  // Award XP via rewardAction("feynman") — 15 XP, 5 coins
  try {
    await rewardAction("feynman");
  } catch (err) {
    console.warn("Failed to award Feynman XP:", err);
  }

  // Save suggested cards with source_type: 'video' metadata if any exist
  if (analysis.suggestedCards && analysis.suggestedCards.length > 0) {
    const resolvedTopicId = topicId ?? video.topic_id ?? null;

    const cardsToInsert = analysis.suggestedCards.map((card) => ({
      user_id: user.id,
      topic_id: resolvedTopicId,
      front: card.front,
      back: card.back,
      source_type: "video" as const,
      metadata: {
        video_id: videoId,
        offset_seconds: startSeconds,
      },
    }));

    const { error: cardError } = await supabase.from("cards").insert(cardsToInsert);
    if (cardError) {
      console.warn("Failed to save Feynman-generated video cards:", cardError.message);
      // Don't fail the entire evaluation — cards are supplementary
    }
  }

  return { data: analysis };
}

/**
 * Internal helper to format seconds into "MM:SS" or "H:MM:SS".
 * Avoids circular dependency with transcript-utils.
 */
function formatSecondsInternal(seconds: number): string {
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


// === recordVideoSession ===

/**
 * Records a video study session after the user has accumulated 5 minutes
 * of cumulative play time in the Video_Player.
 *
 * 1. Creates a `study_sessions` record with mode: 'video'
 * 2. Calls rewardAction("session_complete") to award XP (10 XP, 3 coins)
 *    and increment pet affinity (+2)
 *
 * The client-side time tracking (watching for 5 minutes cumulative) is
 * handled in the study-room-layout component and calls this action once
 * the threshold is met.
 *
 * Requirements: 9.4, 9.5
 */
export async function recordVideoSession(
  videoId: string,
  durationMinutes: number,
  topicId?: string
): Promise<{ success?: boolean; error?: string }> {
  // Input validation
  if (!videoId || typeof videoId !== "string") {
    return { error: "Video ID is required." };
  }

  if (typeof durationMinutes !== "number" || durationMinutes <= 0) {
    return { error: "Duration must be a positive number." };
  }

  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Verify the video exists and belongs to user (RLS handles ownership)
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, topic_id")
    .eq("id", videoId)
    .single();

  if (videoError || !video) {
    return { error: "Video not found. Please load the video first." };
  }

  // Determine topic_id: use explicit topicId if provided, otherwise inherit from video
  const resolvedTopicId = topicId ?? video.topic_id ?? null;

  // Create study_session record with mode 'video'
  const { error: insertError } = await supabase.from("study_sessions").insert({
    user_id: user.id,
    topic_id: resolvedTopicId,
    mode: "video" as const,
    duration_minutes: Math.round(durationMinutes),
    started_at: new Date(Date.now() - durationMinutes * 60 * 1000).toISOString(),
    ended_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Failed to record video session:", insertError.message);
    return { error: "Failed to record study session. Please try again." };
  }

  // Award XP via rewardAction("session_complete") — 10 XP, 3 coins, +2 pet affinity
  try {
    await rewardAction("session_complete");
  } catch (err) {
    console.warn("Failed to award session XP:", err);
    // Don't fail the overall operation — session was recorded successfully
  }

  return { success: true };
}
