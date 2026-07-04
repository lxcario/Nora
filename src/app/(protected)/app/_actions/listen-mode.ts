"use server";

import { createClient } from "@/lib/supabase/server";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Listen Mode — AI Study Podcast Script Generation
// ---------------------------------------------------------------------------
// Generates a two-host conversational podcast script from the student's content.
// Playback uses client-side Web Speech API synthesis (no external TTS cost).
// Research: arxiv.org/html/2409.04645 — AI-generated personalized podcasts led
// to improved learning outcomes vs textbook reading.
// ---------------------------------------------------------------------------

export interface PodcastSegment {
  speaker: "host" | "student";
  text: string;
  type: "explain" | "question" | "answer" | "recap";
}

export interface PodcastScript {
  title: string;
  topicName: string;
  segments: PodcastSegment[];
  estimatedMinutes: number;
}

export async function generatePodcastScript(topicId: string): Promise<{
  data?: PodcastScript;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!hasLLMProvider()) return { error: "No AI provider configured" };

  const rateCheck = checkRateLimit(user.id, "listen", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) return { error: "Rate limited — try again in a minute" };

  // Get the topic + subject
  const { data: topic } = await supabase
    .from("topics")
    .select("name, subjects(name)")
    .eq("id", topicId)
    .eq("user_id", user.id)
    .single();

  if (!topic) return { error: "Topic not found" };
  const subjectName = (topic.subjects as unknown as { name: string } | null)?.name ?? "General";

  // Gather the student's content for this topic
  const [{ data: feynmanExps }, { data: cards }] = await Promise.all([
    supabase
      .from("feynman_explanations")
      .select("content")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("cards")
      .select("front, back")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .limit(15),
  ]);

  const feynmanContent = (feynmanExps ?? []).map((e) => e.content as string).filter(Boolean).join("\n\n");
  const cardContent = (cards ?? []).map((c) => `Q: ${c.front}\nA: ${c.back}`).join("\n");

  if (!feynmanContent && (!cards || cards.length < 3)) {
    return { error: "Need at least 1 Feynman explanation or 3 flashcards for this topic to generate a podcast" };
  }

  const prompt = `You are a wise pixel-art Sage character in a cozy study village. A curious Student has come to your tower to learn about "${topic.name}" (${subjectName}).

Generate a dialogue between you (the Sage/host) and the Student. Transform the student's notes into an engaging RPG-style conversation where learning feels like a quest.

STUDENT'S NOTES TO TRANSFORM:
${feynmanContent ? `Their explanations:\n${feynmanContent.slice(0, 2000)}\n\n` : ""}${cardContent ? `Their flashcards:\n${cardContent.slice(0, 1500)}` : ""}

CHARACTER RULES:
- The "host" is a warm, wise Sage who uses vivid analogies and pixel-game metaphors
- The "student" is curious, asks genuine questions, and sometimes challenges the Sage
- The Sage never repeats the same sentence twice — variety is key
- Every explanation should build on the previous one (progressive disclosure)
- Include 2-3 "PAUSE AND THINK" moments where the student should reflect before reading on

STRUCTURE:
1. Sage greets the student warmly and sets the scene (~1 line)
2. Core concept explained through analogy (~3-4 exchanges)
3. Student asks a deeper "why" question
4. Sage answers with a real-world example (not random — connected to the topic)
5. PAUSE AND THINK — a recall question for the reader
6. 1-2 more exchanges building complexity
7. Short recap from the Sage (~2 lines)

TONE: Warm, curious, playful — like two friends in a cozy pixel tavern. Never robotic or textbook-like.

CRITICAL: Do NOT repeat any sentence verbatim. Do NOT use irrelevant examples. Every line must advance understanding.

Keep it 1000-1500 words total (~5-8 minutes reading).

Respond with valid JSON only:
{
  "title": "Episode title",
  "segments": [
    {"speaker": "host"|"student", "text": "what they say", "type": "explain"|"question"|"answer"|"recap"}
  ]
}`;

  const response = await callLLM({
    system: "You create educational podcast scripts. Respond only with valid JSON.",
    user: prompt,
    temperature: 0.7,
    maxTokens: 2500,
  });

  if (!response) return { error: "AI generation failed" };

  try {
    // Strip markdown fences if the LLM wrapped the response
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { title: string; segments: PodcastSegment[] };
    if (!parsed.segments?.length) return { error: "Invalid response" };
    const wordCount = parsed.segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
    return {
      data: {
        title: parsed.title ?? `${topic.name} — Study Session`,
        topicName: topic.name as string,
        segments: parsed.segments,
        estimatedMinutes: Math.round(wordCount / 150),
      },
    };
  } catch {
    return { error: "Failed to parse podcast script" };
  }
}
