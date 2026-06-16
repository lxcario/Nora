/**
 * Embedding Service module — dual-mode embedding generation.
 *
 * If `OPENAI_API_KEY` env var is set → generate real embeddings via OpenAI API.
 * If not set → return null embeddings (free mode relies on Postgres FTS instead).
 *
 * Uses plain `fetch` — no OpenAI SDK needed.
 */

// --- Constants ---
const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000; // 1 second, doubles each retry (1s, 2s, 4s)
const DEFAULT_RATE_LIMIT_WAIT_MS = 60_000; // 60 seconds
const API_TIMEOUT_MS = 30_000; // 30 seconds per API call
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

// --- Types ---
interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage?: { prompt_tokens: number; total_tokens: number };
}

// --- Public API ---

/**
 * Check if real embeddings are available (OpenAI key configured).
 */
export function hasEmbeddingSupport(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Calculate the wait time from a Retry-After header value.
 * Returns the parsed seconds (in ms) or the default 60s if absent/unparseable.
 */
export function calculateRetryWait(retryAfterHeader: string | null): number {
  if (!retryAfterHeader) return DEFAULT_RATE_LIMIT_WAIT_MS;

  const seconds = Number(retryAfterHeader);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  return DEFAULT_RATE_LIMIT_WAIT_MS;
}

/**
 * Partition an array of texts into batches of the given size.
 * Exported for testing.
 */
export function batchChunks<T>(items: T[], batchSize: number = BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Determine whether a text should be embedded.
 * Returns false for empty or whitespace-only strings.
 */
export function shouldEmbed(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Generate embeddings for an array of text chunks.
 * Returns null[] if OPENAI_API_KEY is not configured (free mode).
 * Skips empty/whitespace-only texts (returns null for those).
 * Batches in groups of 20, with retry logic.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<(number[] | null)[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Free mode: no API key → all nulls
  if (!apiKey) {
    return texts.map(() => null);
  }

  const model =
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

  // Build index map: track which texts are non-empty and their position
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const nonEmptyEntries: { originalIndex: number; text: string }[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (shouldEmbed(texts[i])) {
      nonEmptyEntries.push({ originalIndex: i, text: texts[i] });
    }
    // Empty texts stay null in results
  }

  if (nonEmptyEntries.length === 0) {
    return results;
  }

  // Batch non-empty texts into groups of 20
  const batches = batchChunks(nonEmptyEntries, BATCH_SIZE);

  // Process batches sequentially (v1 — limits to 2 concurrent by virtue of
  // being called in a single-user server action context)
  for (const batch of batches) {
    const batchTexts = batch.map((entry) => entry.text);
    const embeddings = await fetchEmbeddingsWithRetry(batchTexts, model, apiKey);

    // Map results back to original indices
    for (let i = 0; i < batch.length; i++) {
      results[batch[i].originalIndex] = embeddings[i];
    }
  }

  return results;
}

/**
 * Generate a single embedding for a query string.
 * Returns null if OPENAI_API_KEY is not configured.
 */
export async function generateQueryEmbedding(
  text: string
): Promise<number[] | null> {
  const results = await generateEmbeddings([text]);
  return results[0];
}

// --- Internal helpers ---

/**
 * Fetch embeddings from OpenAI API with retry logic.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 * Handles HTTP 429 by respecting Retry-After header (default 60s).
 * Enforces 30-second timeout per call.
 */
async function fetchEmbeddingsWithRetry(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchEmbeddings(texts, model, apiKey);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error with Retry-After
      if (lastError.message.startsWith("RATE_LIMITED:")) {
        const waitMs = parseInt(lastError.message.split(":")[1], 10);
        await sleep(waitMs);
        continue;
      }

      // Exponential backoff for other errors
      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError || new Error("Embedding generation failed after retries");
}

/**
 * Make a single fetch call to the OpenAI embeddings API.
 * Throws on non-2xx responses; throws special "RATE_LIMITED:" prefix for 429.
 */
async function fetchEmbeddings(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = calculateRetryWait(retryAfter);
      throw new Error(`RATE_LIMITED:${waitMs}`);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `OpenAI embeddings API error: ${response.status} ${response.statusText}. ${errorBody}`
      );
    }

    const data: EmbeddingResponse = await response.json();

    // Sort by index to ensure correct ordering
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Embedding API call timed out after 30 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Simple sleep utility. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
