"use server";

import { createClient } from "@/lib/supabase/server";
import { callLLM, hasLLMProvider } from "@/lib/llm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Knowledge Web — Concept extraction and relationship mapping
// ---------------------------------------------------------------------------
// Extracts concepts from the student's topics/cards/Feynman explanations
// and maps relationships between them. Rendered as an interactive grid
// (not a force-graph library — keeping it lightweight and pixel-styled).
// ---------------------------------------------------------------------------

export interface ConceptNode {
  id: string;
  name: string;
  topicName: string;
  subjectName: string;
  mastery: number; // 0-1
  color: string;
}

export interface ConceptEdge {
  from: string;
  to: string;
  type: "builds-on" | "relates-to" | "contradicts";
}

export interface KnowledgeWebData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export async function getKnowledgeWeb(): Promise<{ data?: KnowledgeWebData; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!hasLLMProvider()) return { error: "No AI provider configured" };

  const rateCheck = checkRateLimit(user.id, "knowledge-web", RATE_LIMITS.ai_heavy.maxRequests, RATE_LIMITS.ai_heavy.windowMs);
  if (!rateCheck.allowed) return { error: "Rate limited" };

  // Get topics with card counts and average stability
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subjects(name, color)")
    .eq("user_id", user.id);

  if (!topics || topics.length < 2) return { error: "Need at least 2 topics to build a knowledge web" };

  // Get aggregated mastery per topic (from cards)
  const { data: cards } = await supabase
    .from("cards")
    .select("topic_id, stability, state")
    .eq("user_id", user.id);

  const topicMastery = new Map<string, number>();
  const topicCardCounts = new Map<string, number>();
  for (const card of cards ?? []) {
    const tid = card.topic_id as string;
    const stability = card.stability as number | null;
    const state = card.state as number;
    topicCardCounts.set(tid, (topicCardCounts.get(tid) ?? 0) + 1);
    if (stability != null && state > 0) {
      const elapsed = 1; // assume 1 day for simplicity
      const r = Math.exp(-elapsed / stability);
      const current = topicMastery.get(tid) ?? 0;
      const count = topicCardCounts.get(tid) ?? 1;
      topicMastery.set(tid, current + (r - current) / count);
    }
  }

  // Build topic list for LLM
  const topicList = topics.slice(0, 20).map((t) => {
    const subj = t.subjects as unknown as { name: string; color: string | null } | null;
    return {
      id: t.id as string,
      name: t.name as string,
      subjectName: subj?.name ?? "General",
      color: subj?.color ?? "#d4a526",
      mastery: topicMastery.get(t.id as string) ?? 0,
    };
  });

  // Ask LLM to identify key concepts and relationships
  const topicNames = topicList.map((t) => `- "${t.name}" (${t.subjectName})`).join("\n");

  const response = await callLLM({
    system: "You extract key concepts and their relationships from a list of study topics. Respond only with valid JSON.",
    user: `A student is studying these topics:
${topicNames}

For each topic, extract 1-2 key concepts (short name, 3-30 chars). Then identify relationships between concepts from DIFFERENT topics.

Respond with JSON:
{
  "concepts": [{"topicIndex": 0, "name": "concept name"}],
  "edges": [{"fromConceptIdx": 0, "toConceptIdx": 1, "type": "builds-on"|"relates-to"|"contradicts"}]
}

Rules:
- Max 30 concepts total
- Max 20 edges
- Only connect concepts that have a genuine intellectual relationship
- "builds-on" = A is needed to understand B
- "relates-to" = A and B share structure/patterns
- "contradicts" = A and B are in tension`,
    temperature: 0.6,
    maxTokens: 1500,
  });

  if (!response) return { error: "AI generation failed" };

  try {
    // Strip markdown fences if the LLM wrapped the response
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      concepts: { topicIndex: number; name: string }[];
      edges: { fromConceptIdx: number; toConceptIdx: number; type: string }[];
    };

    const nodes: ConceptNode[] = parsed.concepts
      .filter((c) => c.topicIndex >= 0 && c.topicIndex < topicList.length)
      .map((c, i) => {
        const topic = topicList[c.topicIndex];
        return {
          id: `concept-${i}`,
          name: c.name,
          topicName: topic.name,
          subjectName: topic.subjectName,
          mastery: topic.mastery,
          color: topic.color,
        };
      });

    const edges: ConceptEdge[] = parsed.edges
      .filter((e) => e.fromConceptIdx >= 0 && e.fromConceptIdx < nodes.length && e.toConceptIdx >= 0 && e.toConceptIdx < nodes.length)
      .map((e) => ({
        from: nodes[e.fromConceptIdx].id,
        to: nodes[e.toConceptIdx].id,
        type: (["builds-on", "relates-to", "contradicts"].includes(e.type) ? e.type : "relates-to") as ConceptEdge["type"],
      }));

    return { data: { nodes, edges } };
  } catch {
    return { error: "Failed to parse knowledge web" };
  }
}
