"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { NORA_VOICE_UTILITY } from "@/lib/nora-voice";

/**
 * Generates an inline completion suggestion for the note editor.
 * Uses Groq for speed, falls back to OpenRouter.
 *
 * Reuses the pattern from `_actions/autocomplete.ts`.
 *
 * Requirements: 5.4
 */
export async function getNoteCompletion(
  videoTitle: string,
  currentText: string
): Promise<{ suggestion?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rl = checkRateLimit(user.id, "note_completion", RATE_LIMITS.ai_light.maxRequests, RATE_LIMITS.ai_light.windowMs);
  if (!rl.allowed) return { error: "Too many requests. Please wait a moment." };

  if (!hasLLMProvider()) {
    return { error: "No AI key configured" };
  }

  const systemPrompt = `${NORA_VOICE_UTILITY}

You are a note-taking assistant helping a student write study notes about the video "${videoTitle}".

Your job: Continue their notes naturally with 1-2 short sentences that add useful information or complete their thought.

RULES:
- If the text is nearly empty, suggest a heading or opening sentence about the video topic.
- If they've written something, continue from exactly where they left off.
- Write concise, factual academic notes.
- Output ONLY the continuation text (no quotes, no labels, no meta-commentary).
- Maximum 1-2 sentences. Be concise.
- Do NOT repeat what they already wrote.
- Match their writing style (bullet points, prose, headings, etc).`;

  const userMessage = currentText.trim()
    ? `Continue these study notes naturally (1-2 sentences only):\n\n"${currentText.slice(-500)}"`
    : `Suggest an opening line for study notes about "${videoTitle}".`;

  try {
    const suggestion = await callLLM({
      system: systemPrompt,
      user: userMessage,
      temperature: 0.4,
      maxTokens: 80,
      groqTimeoutMs: 6000,
      openRouterTimeoutMs: 15000,
    });
    const trimmed = suggestion.trim();
    if (trimmed) return { suggestion: trimmed };
    return { error: "Failed to get suggestion" };
  } catch {
    return { error: "Suggestion request failed" };
  }
}
