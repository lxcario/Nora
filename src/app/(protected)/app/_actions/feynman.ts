"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { rewardAction, rewardBatch } from "./gamification";
import { incrementQuestProgress } from "./party-quests";

// Feynman evaluation result types
export interface GapAnalysis {
  questions: string[];
  paraphrase: string;
  segments: {
    text: string;
    status: "green" | "amber" | "red";
    feedback: string;
  }[];
  suggestedCards: { front: string; back: string }[];
}

const FEYNMAN_PROMPT = `You are the "Inquisitive Student" — a knowledgeable evaluator who deeply understands the topic the student is studying. You know the subject matter at an expert level, but your role is to TEST the student's understanding, not teach them.

THE STUDENT IS STUDYING: {{TOPIC_NAME}} (Subject: {{SUBJECT_NAME}})

Your job:
1. You ALREADY KNOW this topic thoroughly. Use your expertise to evaluate accuracy.
2. Read the student's explanation and assess whether they truly understand the concept.
3. Ask 2-3 probing questions that test DEEPER understanding — not basic "what is this?" questions. Ask about edge cases, implications, trade-offs, or real-world scenarios.
4. Paraphrase what the student explained in technical but clear terms.
5. Break their explanation into segments and classify each:
   - "green" = technically accurate, demonstrates real understanding
   - "amber" = partially correct but oversimplified, missing nuance, or vague
   - "red" = factually wrong, critical misconception, or missing essential information
6. For each segment, explain WHAT specifically is right/wrong/missing using your expert knowledge. Reference actual technical facts.
7. Suggest 3-5 high-quality flashcard Q/A pairs that cover the KEY concepts of this topic — include technical details, formulas, or specifications where relevant.

RULES:
- Do NOT ask "what topic is this?" — you already know it.
- Do NOT accept questions as explanations. If the student asks questions instead of explaining, mark everything RED and tell them to EXPLAIN the concept, not ask about it.
- Be technically precise. Reference real specifications, standards, or formulas when evaluating accuracy.
- Suggested cards should be study-worthy: specific facts, comparisons, definitions — not vague generalities.

Respond ONLY with valid JSON (no markdown, no code fences, no extra text):
{
  "questions": ["deep probing question 1", "edge case question 2", "implication question 3"],
  "paraphrase": "your technical restatement of what they explained",
  "segments": [
    {"text": "exact quote from their explanation", "status": "green|amber|red", "feedback": "technical evaluation with specific facts"}
  ],
  "suggestedCards": [
    {"front": "Specific technical question about this topic?", "back": "Precise answer with details/specs/formulas"}
  ]
}`;

/**
 * Calls an LLM with the Feynman prompt.
 * Primary: Groq (fast, ~2s)
 * Fallback: OpenRouter free (slower, ~15-30s)
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

  // Fallback: OpenRouter free
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

/**
 * Safely parses and validates the AI response as a GapAnalysis.
 * Handles invalid JSON, missing fields, and malformed responses.
 */
function safeParseGapAnalysis(jsonStr: string): { analysis?: GapAnalysis; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);

    // Structural validation — ensure required arrays/fields exist
    if (
      !parsed ||
      !Array.isArray(parsed.questions) ||
      typeof parsed.paraphrase !== "string" ||
      !Array.isArray(parsed.segments) ||
      !Array.isArray(parsed.suggestedCards)
    ) {
      return { error: "AI returned invalid structure. Please try again." };
    }

    return { analysis: parsed as GapAnalysis };
  } catch {
    return { error: "AI returned invalid JSON. Please try again." };
  }
}

export async function evaluateExplanation(
  topicId: string,
  explanationText: string
): Promise<{ data?: GapAnalysis; error?: string }> {
  if (!explanationText?.trim()) {
    return { error: "Please write an explanation first." };
  }
  if (explanationText.trim().length < 50) {
    return { error: "Please write a more detailed explanation (at least 50 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Rate limit check
  const rateCheck = checkRateLimit(user.id, "feynman", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) {
    return { error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)} seconds.` };
  }

  // Fetch topic and subject names for context
  const { data: topic } = await supabase
    .from("topics")
    .select("name, subjects(name)")
    .eq("id", topicId)
    .single();

  const topicName = topic?.name ?? "Unknown topic";
  const subjectData = topic?.subjects as unknown as { name: string } | null;
  const subjectName = subjectData?.name ?? "Unknown subject";

  // Build the prompt with topic context
  const contextualPrompt = FEYNMAN_PROMPT
    .replace("{{TOPIC_NAME}}", topicName)
    .replace("{{SUBJECT_NAME}}", subjectName);

  try {
    const responseText = await callLLM(contextualPrompt, explanationText);

    // Guard against empty response
    if (!responseText?.trim()) {
      return { error: "AI returned an empty response. Please try again." };
    }

    // Strip possible markdown fences
    const jsonStr = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Safe parse with structural validation
    const { analysis, error: parseError } = safeParseGapAnalysis(jsonStr);
    if (parseError || !analysis) {
      console.error("Feynman JSON parse error:", parseError, responseText.slice(0, 500));
      return { error: parseError ?? "AI returned invalid JSON. Please try again." };
    }

    // Store in database
    await supabase.from("feynman_explanations").insert({
      user_id: user.id,
      topic_id: topicId,
      raw_text: explanationText,
      ai_summary: analysis.paraphrase,
      gaps_json: analysis,
    });

    // Award XP for completing a Feynman explanation
    await rewardAction("feynman");

    // Track quest progress for party quests (non-blocking)
    try {
      await incrementQuestProgress(user.id, "feynman_sessions", 1);
    } catch (e) {
      console.warn("Party quest progress update failed (feynman):", e);
    }

    revalidatePath("/app/feynman");
    return { data: analysis };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Feynman evaluation error:", errorMessage);
    if (errorMessage.includes("aborted") || errorMessage.includes("abort")) {
      return { error: "Request timed out. AI models may be busy — try again." };
    }
    return { error: `AI evaluation failed: ${errorMessage}` };
  }
}

export async function createCardsFromFeynman(
  topicId: string,
  cards: { front: string; back: string }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cardsToInsert = cards.map((card) => ({
    user_id: user.id,
    topic_id: topicId,
    front: card.front,
    back: card.back,
    source_type: "feynman" as const,
  }));

  const { error } = await supabase.from("cards").insert(cardsToInsert);
  if (error) return { error: error.message };

  // Award XP for all cards created in a single DB round-trip
  await rewardBatch("card_created", cards.length);

  revalidatePath("/app/review");
  return { success: true, count: cards.length };
}
