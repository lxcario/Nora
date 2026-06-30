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

  const prompt = `Generate a short conversational podcast script about "${topic.name}" (${subjectName}).

STUDENT'S CONTENT:
${feynmanContent ? `Feynman explanations:\n${feynmanContent.slice(0, 2000)}\n\n` : ""}${cardContent ? `Flashcards:\n${cardContent.slice(0, 1500)}` : ""}

FORMAT: Two speakers — "host" (explains clearly, uses analogies) and "student" (asks clarifying questions, brings up edge cases).

RULES:
- Keep it 1000-1500 words total (~5-8 minutes spoken)
- Structure: intro → explain core concept → question from student → deeper explanation → 2 recall questions → recap
- Use the student's own content as the basis (don't invent unrelated facts)
- Make recall questions clear pauses where the listener should think
- Tone: warm, curious, like two friends studying together

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
    const parsed = JSON.parse(response) as { title: string; segments: PodcastSegment[] };
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
