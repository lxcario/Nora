/**
 * Heuristic scoring for educational video relevance.
 * Applied server-side after videos.list returns full metadata.
 *
 * This is a PURE UTILITY file — no "use server" directive.
 * All functions are pure, well-typed, and called by server actions.
 */

// === Types ===

/** Raw metadata from YouTube videos.list API response */
export interface YouTubeVideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  channelTitle: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  thumbnailUrl: string;
}

/** Scored and filtered video result returned to the client */
export interface VideoSearchResult {
  youtubeId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  viewCount: number;
  relevanceScore: number;
}

// === Constants ===

/** Scoring weights for the heuristic formula */
const W1 = 1.0;   // Weight for ln(views) — popularity signal
const W2 = 10.0;  // Weight for like ratio — quality signal
const W3 = 5.0;   // Penalty for clickbait indicators

/** Minimum video duration in seconds (4 minutes) */
const MIN_DURATION_SECONDS = 240;

/** Terms indicating clickbait or non-educational content (case-insensitive) */
const CLICKBAIT_TERMS = [
  "vlog",
  "parody",
  "funny",
  "gaming",
  "shorts",
  "prank",
  "reaction",
] as const;

/** Exclusion modifiers appended to YouTube search queries */
const EXCLUSION_MODIFIERS = [
  "-vlog",
  "-parody",
  "-funny",
  "-gaming",
  "-shorts",
] as const;

// === Pure Functions ===

/**
 * Detects if a video title contains clickbait/non-educational terms.
 *
 * @param title - The video title to check
 * @returns A factor between 0 and 1, where 1 means maximum clickbait likelihood
 */
export function detectClickbait(title: string): number {
  const lowerTitle = title.toLowerCase();
  const matchCount = CLICKBAIT_TERMS.filter((term) =>
    lowerTitle.includes(term)
  ).length;

  // Normalize: each match adds proportional penalty, capped at 1.0
  return Math.min(matchCount / CLICKBAIT_TERMS.length, 1.0);
}

/**
 * Scores a video using the educational heuristic formula.
 *
 * Formula: w1 * ln(views) + w2 * (likes/views) - w3 * clickbaitFactor
 *
 * Returns -1 for videos that should be excluded (hard filters):
 * - Duration < 240 seconds (under 4 minutes)
 * - Title contains clickbait terms (full match, factor > 0)
 *
 * @param metadata - Video metadata from YouTube API
 * @returns Score (higher = more educational relevance), or -1 for exclusion
 */
export function scoreVideo(metadata: {
  title: string;
  description: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  channelTitle: string;
}): number {
  // Hard exclusion: too short
  if (metadata.durationSeconds < MIN_DURATION_SECONDS) {
    return -1;
  }

  // Calculate clickbait factor
  const clickbaitFactor = detectClickbait(metadata.title);

  // Hard exclusion: title contains clickbait terms
  if (clickbaitFactor > 0) {
    return -1;
  }

  // Popularity signal: natural log of view count (avoid log(0))
  const viewSignal = metadata.viewCount > 0 ? Math.log(metadata.viewCount) : 0;

  // Quality signal: like-to-view ratio
  const likeRatio =
    metadata.viewCount > 0 ? metadata.likeCount / metadata.viewCount : 0;

  // Final score
  const score = W1 * viewSignal + W2 * likeRatio - W3 * clickbaitFactor;

  return score;
}

/**
 * Filters and ranks videos by educational relevance.
 *
 * Applies hard exclusion criteria (duration, clickbait) then ranks
 * remaining videos by heuristic score in descending order.
 *
 * @param videos - Raw video metadata array from YouTube API
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Filtered, scored, and ranked video results
 */
export function filterAndRankVideos(
  videos: YouTubeVideoMetadata[],
  maxResults: number = 10
): VideoSearchResult[] {
  const scored = videos
    .map((video) => ({
      video,
      score: scoreVideo({
        title: video.title,
        description: video.description,
        channelTitle: video.channelTitle,
        durationSeconds: video.durationSeconds,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
      }),
    }))
    .filter(({ score }) => score >= 0) // Remove excluded videos
    .sort((a, b) => b.score - a.score) // Rank descending by score
    .slice(0, maxResults);

  return scored.map(({ video, score }) => ({
    youtubeId: video.youtubeId,
    title: video.title,
    channelTitle: video.channelTitle,
    durationSeconds: video.durationSeconds,
    thumbnailUrl: video.thumbnailUrl,
    viewCount: video.viewCount,
    relevanceScore: score,
  }));
}

/**
 * Validates a search query string.
 *
 * Accepts queries between 3 and 200 characters (after trimming).
 *
 * @param query - Raw user input
 * @returns Object with `valid` flag and optional `error` message
 */
export function validateSearchQuery(query: string): {
  valid: boolean;
  trimmed: string;
  error?: string;
} {
  const trimmed = query.trim();

  if (trimmed.length < 3) {
    return {
      valid: false,
      trimmed,
      error: "Search query must be at least 3 characters",
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      trimmed,
      error: "Search query must be under 200 characters",
    };
  }

  return { valid: true, trimmed };
}

/**
 * Builds a YouTube API search query by appending exclusion modifiers.
 *
 * Appends `-vlog -parody -funny -gaming -shorts` to reduce
 * non-educational results from the YouTube search.
 *
 * @param userQuery - The validated, trimmed user query
 * @returns Full query string with exclusion modifiers appended
 */
export function buildSearchQuery(userQuery: string): string {
  return `${userQuery} ${EXCLUSION_MODIFIERS.join(" ")}`;
}

/**
 * Extracts a YouTube video ID from various URL formats.
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Plain 11-character video ID
 *
 * @param input - A YouTube URL or video ID string
 * @returns The 11-character video ID, or null if extraction fails
 */
export function extractYouTubeId(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  // Plain 11-character video ID (alphanumeric, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(
    /(?:youtube\.com|youtube\.co\.[a-z]{2})\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  );
  if (watchMatch) {
    return watchMatch[1];
  }

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    return shortMatch[1];
  }

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  );
  if (embedMatch) {
    return embedMatch[1];
  }

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  );
  if (shortsMatch) {
    return shortsMatch[1];
  }

  return null;
}
