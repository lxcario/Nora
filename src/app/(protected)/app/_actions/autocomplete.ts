"use server";

/**
 * Generates an inline completion suggestion for the Feynman explanation editor.
 * Uses Groq for speed (~1-2s), falls back to OpenRouter.
 */
export async function getCompletionSuggestion(
  topicName: string,
  subjectName: string,
  currentText: string
): Promise<{ suggestion?: string; error?: string }> {
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !orKey) {
    return { error: "No AI key configured" };
  }

  const systemPrompt = `You are a writing assistant helping a student write a Feynman-style explanation about "${topicName}" (Subject: ${subjectName}).

Your job: Continue their text naturally with 1-2 short sentences that demonstrate understanding of the topic. 

RULES:
- If the text is EMPTY, suggest an opening sentence to start explaining the topic.
- If they've written something, continue from where they left off.
- Write in first person as if YOU are the student explaining.
- Keep it factual and technically accurate.
- Output ONLY the continuation text (no quotes, no labels, no explanation of what you're doing).
- Maximum 1-2 sentences. Be concise.
- Do NOT repeat what they already wrote.`;

  const userMessage = currentText.trim()
    ? `Continue this explanation naturally (1-2 sentences only):\n\n"${currentText}"`
    : `Suggest an opening sentence to start explaining "${topicName}" in simple terms.`;

  try {
    // Try Groq first
    if (groqKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

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
          max_tokens: 100,
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
      const timeout = setTimeout(() => controller.abort(), 20000);

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
          max_tokens: 100,
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
