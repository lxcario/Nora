import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Your Story — Nora" };

// ---------------------------------------------------------------------------
// /journal — "Your Story"
// ---------------------------------------------------------------------------
// A quiet, hidden page. Not linked in the sidebar. Not marketed.
// Just a chronological narrative of the user's learning journey,
// written from their Feynman explanations and milestones.
// No charts. No graphs. Just the story.
// ---------------------------------------------------------------------------

interface JournalEntry {
  date: string;
  text: string;
  type: "feynman" | "mastery" | "first" | "helped" | "garden" | "streak";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Gather the student's learning milestones
  const entries: JournalEntry[] = [];

  // First-ever Feynman explanation
  const { data: firstExplanation } = await supabase
    .from("feynman_explanations")
    .select("created_at, topics(name), score")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstExplanation) {
    const topicName = (firstExplanation.topics as unknown as { name: string } | null)?.name ?? "something new";
    entries.push({
      date: (firstExplanation.created_at as string).split("T")[0],
      text: `You tried explaining ${topicName} for the first time.`,
      type: "first",
    });
  }

  // All Feynman explanations with high scores (mastery moments)
  const { data: masteredExplanations } = await supabase
    .from("feynman_explanations")
    .select("created_at, topics(name), score")
    .eq("user_id", user!.id)
    .gte("score", 75)
    .order("created_at", { ascending: true })
    .limit(20);

  for (const exp of masteredExplanations ?? []) {
    const topicName = (exp.topics as unknown as { name: string } | null)?.name ?? "a concept";
    entries.push({
      date: (exp.created_at as string).split("T")[0],
      text: `You understood ${topicName}.`,
      type: "mastery",
    });
  }

  // Feynman explanations where score improved (growth moments)
  const { data: allExplanations } = await supabase
    .from("feynman_explanations")
    .select("created_at, topics(name), score, topic_id")
    .eq("user_id", user!.id)
    .not("score", "is", null)
    .order("created_at", { ascending: true })
    .limit(100);

  // Find topics where score went from < 50 to >= 70 (growth arcs)
  const topicScores = new Map<string, { firstLow: string; topicName: string; laterHigh: string | null }>();
  for (const exp of allExplanations ?? []) {
    const tid = exp.topic_id as string;
    const score = exp.score as number;
    const topicName = (exp.topics as unknown as { name: string } | null)?.name ?? "a topic";
    const date = (exp.created_at as string).split("T")[0];

    if (!topicScores.has(tid) && score < 50) {
      topicScores.set(tid, { firstLow: date, topicName, laterHigh: null });
    } else if (topicScores.has(tid) && score >= 70 && !topicScores.get(tid)!.laterHigh) {
      topicScores.get(tid)!.laterHigh = date;
    }
  }

  for (const [, arc] of topicScores) {
    if (arc.laterHigh) {
      entries.push({
        date: arc.laterHigh,
        text: `You finally understood ${arc.topicName}. It took time, and that's okay.`,
        type: "mastery",
      });
    }
  }

  // Party quest completions (helping others)
  const { data: partyQuests } = await supabase
    .from("party_quests")
    .select("completed_at")
    .eq("status", "completed")
    .limit(5);

  for (const q of partyQuests ?? []) {
    if (q.completed_at) {
      entries.push({
        date: (q.completed_at as string).split("T")[0],
        text: "You helped your study group reach a goal together.",
        type: "helped",
      });
    }
  }

  // Deduplicate by date + text, sort chronologically
  const seen = new Set<string>();
  const uniqueEntries = entries.filter((e) => {
    const key = `${e.date}:${e.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Add "today" entry at the end
  uniqueEntries.push({
    date: new Date().toISOString().split("T")[0],
    text: "You're still here.",
    type: "streak",
  });

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      {/* Title */}
      <h1
        className="font-pixel text-xl text-center mb-2"
        style={{ color: "var(--pixel-text-primary)" }}
      >
        Your Story
      </h1>
      <p
        className="text-center text-xs mb-12"
        style={{ color: "var(--pixel-text-muted)" }}
      >
        Every explanation you wrote. Every concept you mastered.
      </p>

      {/* Timeline */}
      <div className="space-y-8">
        {uniqueEntries.length <= 1 ? (
          <div className="text-center py-12">
            <p className="text-sm italic" style={{ color: "var(--pixel-text-secondary)" }}>
              Your story is just beginning.
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--pixel-text-muted)" }}>
              Every Feynman explanation you write becomes a chapter here.
            </p>
          </div>
        ) : (
          uniqueEntries.map((entry, i) => (
            <div key={i} className="relative pl-6">
              {/* Timeline dot */}
              <div
                className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    entry.type === "mastery" ? "var(--pixel-success)"
                    : entry.type === "first" ? "var(--pixel-accent)"
                    : entry.type === "helped" ? "#d4708a"
                    : "var(--pixel-text-muted)",
                }}
              />
              {/* Connecting line */}
              {i < uniqueEntries.length - 1 && (
                <div
                  className="absolute left-[4px] top-4 w-[1px] h-full"
                  style={{ backgroundColor: "var(--pixel-border)" }}
                />
              )}

              {/* Date */}
              <p
                className="font-pixel text-[9px] mb-1"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                {formatDate(entry.date)}
              </p>

              {/* Entry text */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--pixel-text-primary)" }}
              >
                {entry.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 text-center" style={{ borderTop: "1px dashed var(--pixel-border)" }}>
        <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
          nora — a softer way to study
        </p>
      </div>
    </div>
  );
}
