"use server";

import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { NORA_VOICE_UTILITY } from "@/lib/nora-voice";

/**
 * Generates an inline *scaffold* for the Feynman explanation editor.
 *
 * Pedagogy note: the Feynman technique depends on retrieval practice — the
 * student must produce the explanation themselves. So this intentionally does
 * NOT write the factual answer. It offers a short sentence-starter / guiding
 * lead-in (e.g. "A common misconception here is…") that nudges the student to
 * continue elaborating in their own words.
 *
 * Uses Groq for speed (~1-2s), falls back to OpenRouter.
 */
export async function getCompletionSuggestion(
  topicName: string,
  subjectName: string,
  currentText: string
): Promise<{ suggestion?: string; error?: string }> {
  // Rate limit check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const rateCheck = checkRateLimit(user.id, "autocomplete", RATE_LIMITS.ai_light.maxRequests, RATE_LIMITS.ai_light.windowMs);
    if (!rateCheck.allowed) {
      return { error: "Rate limited" };
    }
  }

  if (!hasLLMProvider()) {
    return { error: "No AI key configured" };
  }

  const systemPrompt = `${NORA_VOICE_UTILITY}

You are a Socratic study coach helping a student write a Feynman-style explanation about "${topicName}" (Subject: ${subjectName}).

Your job is to nudge the student to keep explaining IN THEIR OWN WORDS — never to write the explanation for them.

Output a SHORT sentence-starter or guiding lead-in (a scaffold) that the student will complete themselves.

STRICT RULES:
- Output ONLY the scaffold phrase — no quotes, no labels, no meta-commentary.
- Maximum 8 words. It must be an unfinished lead-in, ending so the student continues it.
- Do NOT state any facts, definitions, numbers, or the actual answer. Provide the *prompt*, not the content.
- Prefer lead-ins that push for deeper thinking: causes ("This happens because…"), mechanisms ("The way this works is…"), examples ("For instance,…"), contrasts ("Unlike …, this…"), or significance ("This matters because…").
- If the text is EMPTY, return a neutral opening scaffold such as "In my own words," or "The core idea is that…".
- Never repeat what the student already wrote.`;

  const userMessage = currentText.trim()
    ? `The student has written so far:\n\n"${currentText.slice(-600)}"\n\nGive ONE short lead-in (max 8 words) that prompts them to continue explaining in their own words. Do not include any facts.`
    : `Give ONE short opening lead-in (max 8 words) to help the student start explaining "${topicName}" in their own words. Do not include any facts.`;

  try {
    const suggestion = await callLLM({
      system: systemPrompt,
      user: userMessage,
      temperature: 0.5,
      maxTokens: 24,
      groqTimeoutMs: 8000,
      openRouterTimeoutMs: 20000,
    });
    // Defensively trim to a short scaffold and strip wrapping quotes.
    const trimmed = suggestion.trim().replace(/^["'`]|["'`]$/g, "").trim();
    if (trimmed) return { suggestion: trimmed };
    return { error: "Failed to get suggestion" };
  } catch {
    return { error: "Suggestion request failed" };
  }
}
