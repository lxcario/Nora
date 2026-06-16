"use server";

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
    // Try Groq first (fast)
    if (groqKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

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
          temperature: 0.4,
          max_tokens: 80,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return { suggestion: content };
      }
    }

    // Fallback: OpenRouter
    if (orKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

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
          temperature: 0.4,
          max_tokens: 80,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return { suggestion: content };
      }
    }

    return { error: "Failed to get suggestion" };
  } catch {
    return { error: "Suggestion request failed" };
  }
}
