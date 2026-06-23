/**
 * Shared LLM client for all server-side AI calls.
 *
 * Single source of truth for the Groq (primary) → OpenRouter (fallback)
 * chat-completion pattern that was previously duplicated across
 * feynman.ts, research.ts, autocomplete.ts, rag.ts, study-room.ts and
 * note-completion.ts.
 *
 * - Provider order: Groq first (fast), OpenRouter free tier as fallback.
 * - Per-provider AbortController timeouts.
 * - The OpenRouter `HTTP-Referer` / `X-Title` headers are driven by env
 *   (NEXT_PUBLIC_SITE_URL / app name) instead of a hardcoded localhost URL.
 *
 * This module must only be imported from server-side code (server actions,
 * route handlers). It reads non-public API keys from process.env.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Default Groq model used across the app. */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
/** Default OpenRouter fallback model (free tier). */
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

const SITE_NAME = "Nora";

/**
 * Public site URL used for OpenRouter attribution headers.
 * Falls back to localhost for local development.
 */
function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export interface LLMOptions {
  /** System prompt. */
  system: string;
  /** User message. */
  user: string;
  /** Sampling temperature (default 0.7). */
  temperature?: number;
  /** Max completion tokens (provider default when omitted). */
  maxTokens?: number;
  /** Frequency penalty to reduce repetition (0.0–2.0, default 0). */
  frequencyPenalty?: number;
  /** Presence penalty to encourage topic diversity (0.0–2.0, default 0). */
  presencePenalty?: number;
  /** Groq request timeout in ms (default 15000). */
  groqTimeoutMs?: number;
  /** OpenRouter request timeout in ms (default 45000). */
  openRouterTimeoutMs?: number;
  /** Override the Groq model. */
  groqModel?: string;
  /** Override the OpenRouter model. */
  openRouterModel?: string;
  /**
   * When true, only Groq is attempted (no OpenRouter fallback).
   * Useful for low-latency, cost-sensitive calls (autocomplete, keyword
   * extraction) where a slow fallback isn't worth it.
   */
  groqOnly?: boolean;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

function buildMessages(system: string, user: string) {
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function callGroq(opts: LLMOptions): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.groqTimeoutMs ?? 15_000
  );

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.groqModel ?? DEFAULT_GROQ_MODEL,
        messages: buildMessages(opts.system, opts.user),
        temperature: opts.temperature ?? 0.7,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.frequencyPenalty ? { frequency_penalty: opts.frequencyPenalty } : {}),
        ...(opts.presencePenalty ? { presence_penalty: opts.presencePenalty } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`Groq request failed (${res.status}).`);
      return null;
    }

    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn("Groq request error:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(opts: LLMOptions): Promise<string | null> {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.openRouterTimeoutMs ?? 45_000
  );

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": getSiteUrl(),
        "X-Title": SITE_NAME,
      },
      body: JSON.stringify({
        model: opts.openRouterModel ?? DEFAULT_OPENROUTER_MODEL,
        messages: buildMessages(opts.system, opts.user),
        temperature: opts.temperature ?? 0.7,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.frequencyPenalty ? { frequency_penalty: opts.frequencyPenalty } : {}),
        ...(opts.presencePenalty ? { presence_penalty: opts.presencePenalty } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`OpenRouter request failed (${res.status}).`);
      return null;
    }

    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn(
      "OpenRouter request error:",
      err instanceof Error ? err.message : err
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns true when at least one AI provider key is configured.
 */
export function hasLLMProvider(): boolean {
  return Boolean(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
}

/**
 * Calls an LLM with the Groq → OpenRouter fallback chain.
 *
 * Returns the assistant message content as a string. Returns an empty string
 * if no provider is configured or all providers fail to produce content — call
 * sites should guard against empty responses.
 */
export async function callLLM(opts: LLMOptions): Promise<string> {
  const groqContent = await callGroq(opts);
  if (groqContent && groqContent.trim()) return groqContent;

  if (opts.groqOnly) return "";

  const orContent = await callOpenRouter(opts);
  if (orContent && orContent.trim()) return orContent;

  return "";
}

/**
 * Strips Markdown code fences (```json ... ```) from an LLM response so the
 * inner JSON can be parsed. Safe to call on already-clean strings.
 */
export function stripCodeFences(text: string): string {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}
