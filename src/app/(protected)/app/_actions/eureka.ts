"use server";

import { createClient } from "@/lib/supabase/server";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Eureka Connections — Cross-topic "aha!" discovery
// ---------------------------------------------------------------------------
// Finds surprising connections between topics from DIFFERENT subjects.
// Uses LLM to identify parallels and generates a challenge prompt.
// ---------------------------------------------------------------------------

export interface EurekaConnection {
  topicA: { id: string; name: string; subject: string };
  topicB: { id: string; name: string; subject: string };
  connectionPhrase: string;
  challengePrompt: string;
}

export async function discoverConnections(): Promise<{ connections: EurekaConnection[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connections: [], error: "Not authenticated" };
  if (!hasLLMProvider()) return { connections: [], error: "No AI provider configured" };

  const rateCheck = checkRateLimit(user.id, "eureka", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) return { connections: [], error: "Rate limited" };

  // Get user's topics with their subjects
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subjects(id, name)")
    .eq("user_id", user.id);

  if (!topics || topics.length < 4) {
    return { connections: [], error: "You need at least 4 topics across different subjects to find connections" };
  }

  // Group by subject
  const bySubject = new Map<string, { id: string; name: string; subjectName: string }[]>();
  for (const t of topics) {
    const subj = t.subjects as unknown as { id: string; name: string } | null;
    const subjId = subj?.id ?? "none";
    const subjName = subj?.name ?? "General";
    if (!bySubject.has(subjId)) bySubject.set(subjId, []);
    bySubject.get(subjId)!.push({ id: t.id as string, name: t.name as string, subjectName: subjName });
  }

  // Need at least 2 different subjects
  if (bySubject.size < 2) {
    return { connections: [], error: "You need topics from at least 2 different subjects to find cross-topic connections" };
  }

  // Pick random topic pairs from different subjects (max 6 pairs for LLM)
  const subjects = [...bySubject.entries()];
  const pairs: { a: { id: string; name: string; subject: string }; b: { id: string; name: string; subject: string } }[] = [];

  for (let i = 0; i < subjects.length && pairs.length < 6; i++) {
    for (let j = i + 1; j < subjects.length && pairs.length < 6; j++) {
      const [, topicsA] = subjects[i];
      const [, topicsB] = subjects[j];
      const a = topicsA[Math.floor(Math.random() * topicsA.length)];
      const b = topicsB[Math.floor(Math.random() * topicsB.length)];
      pairs.push({
        a: { id: a.id, name: a.name, subject: a.subjectName },
        b: { id: b.id, name: b.name, subject: b.subjectName },
      });
    }
  }

  if (pairs.length === 0) return { connections: [] };

  const pairsList = pairs.map((p, i) => `${i + 1}. "${p.a.name}" (${p.a.subject}) ↔ "${p.b.name}" (${p.b.subject})`).join("\n");

  const response = await callLLM({
    system: "You find surprising intellectual connections between concepts from different fields. Respond only with valid JSON.",
    user: `Here are topic pairs from a student studying multiple subjects. For each pair that has a genuinely interesting cross-disciplinary connection, write a brief "eureka" connection phrase (50-120 chars) and a challenge prompt asking the student to explain the relationship.

Only include pairs where you see a REAL connection — skip pairs with no meaningful link.

Pairs:
${pairsList}

Respond with JSON array (may be shorter than input if some pairs have no connection):
[{"pairIndex": 1, "connectionPhrase": "...", "challengePrompt": "Explain how X relates to Y..."}]`,
    temperature: 0.8,
    maxTokens: 800,
  });

  if (!response) return { connections: [], error: "AI generation failed" };

  try {
    // Strip markdown fences if the LLM wrapped the response
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { pairIndex: number; connectionPhrase: string; challengePrompt: string }[];
    const connections: EurekaConnection[] = parsed
      .filter((r) => r.pairIndex >= 1 && r.pairIndex <= pairs.length)
      .slice(0, 3)
      .map((r) => ({
        topicA: pairs[r.pairIndex - 1].a,
        topicB: pairs[r.pairIndex - 1].b,
        connectionPhrase: r.connectionPhrase,
        challengePrompt: r.challengePrompt,
      }));
    return { connections };
  } catch {
    return { connections: [], error: "Failed to parse connections" };
  }
}
