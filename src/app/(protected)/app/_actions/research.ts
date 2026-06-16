"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ResearchSource {
  title: string;
  authors: string[];
  year: number | null;
  url: string | null;
  snippet: string;
  type: "book" | "paper" | "wiki";
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  suggestedCards: { front: string; back: string }[];
}

/**
 * Performs AI-powered research on a topic.
 * 1. Searches Open Library + Wikipedia for sources
 * 2. Feeds findings to Groq/OpenRouter for synthesis
 * 3. Returns a researched answer with citations and suggested cards
 */
export async function performResearch(query: string): Promise<{
  data?: ResearchResult;
  error?: string;
}> {
  if (!query?.trim() || query.trim().length < 5) {
    return { error: "Enter a more detailed research question (at least 5 characters)." };
  }

  // First, use AI to extract better search keywords from the user's question
  const searchKeywords = await extractSearchKeywords(query);

  // Gather sources in parallel using improved keywords
  const [bookResults, wikiResult] = await Promise.all([
    searchOpenLibrary(searchKeywords),
    searchWikipedia(searchKeywords),
  ]);

  const allSources: ResearchSource[] = [...bookResults, ...wikiResult];

  // Build context from sources for the AI (may be empty — that's OK)
  const sourcesContext = allSources.length > 0
    ? allSources
        .map((s, i) => `[${i + 1}] "${s.title}" by ${s.authors.join(", ") || "Unknown"}${s.year ? ` (${s.year})` : ""}\n   ${s.snippet}`)
        .join("\n\n")
    : "No external sources found. Answer entirely from your own expert knowledge.";

  // Call AI to synthesize — always, even without sources
  const aiResult = await synthesizeResearch(query, sourcesContext);
  if (aiResult.error) return { error: aiResult.error };

  return {
    data: {
      answer: aiResult.answer!,
      sources: allSources,
      suggestedCards: aiResult.suggestedCards!,
    },
  };
}

async function extractSearchKeywords(query: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return query; // fallback to raw query

  try {
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
          {
            role: "system",
            content: `Extract 2-4 optimal search keywords from the user's research question. Return ONLY the keywords separated by spaces — no explanation, no quotes, no punctuation. Think about what technical terms would return good results on Wikipedia and book searches.

Examples:
- "How can I become a good person?" → "ethics morality virtue self-improvement"
- "What is the difference between x64 and x86?" → "x86-64 architecture processor comparison"
- "How does spaced repetition work?" → "spaced repetition memory learning science"
- "Can you explain quantum entanglement?" → "quantum entanglement physics mechanics"`,
          },
          { role: "user", content: query },
        ],
        temperature: 0.3,
        max_tokens: 30,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const keywords = data.choices?.[0]?.message?.content?.trim();
      if (keywords && keywords.length > 2) return keywords;
    }
  } catch {
    // Fall through
  }

  return query; // fallback to original
}

async function searchOpenLibrary(query: string): Promise<ResearchSource[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: "5" });
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, { cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.docs ?? []).slice(0, 5).map((doc: Record<string, unknown>) => ({
      title: doc.title as string,
      authors: (doc.author_name as string[]) ?? [],
      year: (doc.first_publish_year as number) ?? null,
      url: `https://openlibrary.org${doc.key as string}`,
      snippet: (doc.subject as string[])?.slice(0, 8).join(", ") ?? "No description available",
      type: "book" as const,
    }));
  } catch {
    return [];
  }
}

async function searchWikipedia(query: string): Promise<ResearchSource[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: "3",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.query?.search ?? []).map((item: Record<string, unknown>) => ({
      title: item.title as string,
      authors: ["Wikipedia contributors"],
      year: null,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent((item.title as string).replace(/ /g, "_"))}`,
      snippet: (item.snippet as string)?.replace(/<[^>]*>/g, "") ?? "",
      type: "wiki" as const,
    }));
  } catch {
    return [];
  }
}

async function synthesizeResearch(
  query: string,
  sourcesContext: string
): Promise<{ answer?: string; suggestedCards?: { front: string; back: string }[]; error?: string }> {
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !orKey) return { error: "No AI key configured" };

  const systemPrompt = `You are a deep research assistant for university students. The user needs a THOROUGH, COMPREHENSIVE research report — not a short summary.

Your job:
1. Write a DETAILED research report (8-12 paragraphs minimum, 1500+ words) that deeply explores the topic.
2. Structure it with clear sections: Background/Context, Key Theories & Research, Practical Applications, Critical Analysis, and Conclusion.
3. Include: specific researchers/authors, dates, study findings, statistics, named theories, historical context, contrasting viewpoints, and real-world examples.
4. Use the provided sources where relevant (cite as [1], [2] etc.), but supplement heavily with your own expert knowledge.
5. Generate 6-10 detailed flashcard Q/A pairs covering the most important facts, theories, and definitions from the report.

QUALITY STANDARDS:
- This should read like a university-level literature review, NOT a blog post.
- Include specific names, dates, numbers, study results wherever possible.
- Present multiple perspectives and debates within the field.
- Mention key books, papers, or thinkers that are foundational to this topic.
- If there are formulas, models, or frameworks, include them.
- Be intellectually rigorous but clear.

Respond ONLY with valid JSON (use \\n for newlines inside strings, NOT actual newlines):
{"answer":"Your comprehensive research report here with [1] [2] citations where relevant...","suggestedCards":[{"front":"Specific question testing a key concept?","back":"Detailed answer with facts, names, dates"}]}`;

  const userMessage = `Research question: "${query}"\n\nSources found:\n${sourcesContext}`;

  try {
    // Try Groq first
    if (groqKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

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
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          const parsed = JSON.parse(jsonStr);
          return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
        } catch {
          // If JSON parse fails, try to fix common issues (newlines in strings)
          const fixedJson = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
            if (ch === "\n") return "\\n";
            if (ch === "\r") return "\\r";
            if (ch === "\t") return "\\t";
            return "";
          });
          try {
            const parsed = JSON.parse(fixedJson);
            return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
          } catch {
            // Last resort: extract answer text directly
            const answerMatch = jsonStr.match(/"answer"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"suggestedCards|"\s*})/);
            if (answerMatch) {
              return { answer: answerMatch[1].replace(/\\n/g, "\n"), suggestedCards: [] };
            }
            return { error: "Failed to parse AI response" };
          }
        }
      }
    }

    // Fallback: OpenRouter
    if (orKey) {
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
          temperature: 0.5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          const parsed = JSON.parse(jsonStr);
          return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
        } catch {
          const fixedJson = jsonStr.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
            if (ch === "\n") return "\\n";
            if (ch === "\r") return "\\r";
            if (ch === "\t") return "\\t";
            return "";
          });
          try {
            const parsed = JSON.parse(fixedJson);
            return { answer: parsed.answer, suggestedCards: parsed.suggestedCards ?? [] };
          } catch {
            const answerMatch = jsonStr.match(/"answer"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"suggestedCards|"\s*})/);
            if (answerMatch) {
              return { answer: answerMatch[1].replace(/\\n/g, "\n"), suggestedCards: [] };
            }
            return { error: "Failed to parse AI response" };
          }
        }
      }
    }

    return { error: "AI synthesis failed" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research failed";
    if (msg.includes("abort")) return { error: "Research timed out. Try a simpler question." };
    return { error: msg };
  }
}

/**
 * Saves a paper/book to the user's collection.
 */
export async function saveSource(
  source: ResearchSource,
  topicId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("papers").insert({
    user_id: user.id,
    topic_id: topicId || null,
    title: source.title,
    authors: source.authors,
    year: source.year,
    citation_count: 0,
    abstract: source.snippet,
    url: source.url,
    semantic_scholar_id: null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already saved." };
    return { error: error.message };
  }

  revalidatePath("/app/research");
  return { success: true };
}

/**
 * Creates flashcards from research findings.
 */
export async function createCardsFromResearch(
  topicId: string,
  cards: { front: string; back: string }[]
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cardsToInsert = cards.map((card) => ({
    user_id: user.id,
    topic_id: topicId || null,
    front: card.front,
    back: card.back,
    source_type: "research" as const,
  }));

  const { error } = await supabase.from("cards").insert(cardsToInsert);
  if (error) return { error: error.message };

  // Award XP
  const { rewardAction } = await import("./gamification");
  for (let i = 0; i < cards.length; i++) {
    await rewardAction("card_created");
  }

  revalidatePath("/app/review");
  return { success: true, count: cards.length };
}

/**
 * Gets the user's saved papers/books.
 */
export async function getSavedPapers(): Promise<{
  papers: {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    abstract: string | null;
    url: string | null;
    topic_name: string | null;
  }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { papers: [] };

  const { data } = await supabase
    .from("papers")
    .select("id, title, authors, year, abstract, url, topics(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    papers: (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors ?? [],
      year: p.year,
      abstract: p.abstract,
      url: p.url,
      topic_name: (p.topics as unknown as { name: string } | null)?.name ?? null,
    })),
  };
}

/**
 * Deletes a saved paper.
 */
export async function deletePaper(paperId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("papers").delete().eq("id", paperId).eq("user_id", user.id);
  revalidatePath("/app/research");
  return { success: true };
}
