"use server";

import { callLLM } from "@/lib/llm";

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
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !orKey) {
    return { error: "No AI key configured" };
  }

  const systemPrompt = `You are a note-taking assistant helping a student write study notes about the video "${videoTitle}".

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
