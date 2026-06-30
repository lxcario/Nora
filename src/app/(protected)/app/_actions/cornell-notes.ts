"use server";

import { createClient } from "@/lib/supabase/server";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Cornell Notes — AI Cue Question Generation
// ---------------------------------------------------------------------------
// Given student's notes content, generates 2-4 review/recall cue questions
// that target the key concepts and potential gaps.
// ---------------------------------------------------------------------------

export async function callLLMAction(
  notesContent: string,
  videoTitle: string,
): Promise<{ questions?: string[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!hasLLMProvider()) return { error: "No AI provider configured" };

  const rateCheck = checkRateLimit(user.id, "cornell", RATE_LIMITS.ai_light.maxRequests, RATE_LIMITS.ai_light.windowMs);
  if (!rateCheck.allowed) return { error: "Rate limited — try again in a minute" };

  const prompt = `You are generating Cornell Method cue questions from a student's notes.

CONTEXT: The student is watching/studying "${videoTitle}" and wrote these notes:
---
${notesContent.slice(0, 2000)}
---

Generate 2-4 short, specific cue questions that:
- Target the MOST IMPORTANT concepts in these notes
- Are answerable from the notes content (not trick questions)
- Prompt ACTIVE RECALL (not yes/no questions)
- Are between 10 and 100 characters each
- Would help the student review this material later

Respond ONLY with a JSON array of strings (no markdown, no code fences):
["question 1", "question 2", "question 3"]`;

  const response = await callLLM({ system: "You generate Cornell Method cue questions. Respond only with a JSON array of strings.", user: prompt, temperature: 0.6, maxTokens: 400 });
  if (!response) return { error: "AI generation failed" };

  try {
    // Strip markdown fences if the LLM wrapped the response
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "Invalid AI response" };
    }
    return { questions: parsed.filter((q: unknown) => typeof q === "string" && q.length > 5).slice(0, 5) };
  } catch {
    return { error: "Failed to parse AI response" };
  }
}
