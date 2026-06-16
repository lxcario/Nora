"use server";

import { createClient } from "@/lib/supabase/server";

export type HistoryType = "all" | "feynman" | "video" | "research";
export type HistoryDays = 7 | 30 | 90 | "all";

export interface HistoryFilters {
  type: HistoryType;
  topicId?: string;
  days: HistoryDays;
}

export interface HistoryItem {
  id: string;
  type: "feynman" | "video" | "research";
  topicId: string | null;
  topicName: string | null;
  date: string; // ISO string
  preview: string;
  // Feynman-specific
  gapSummary?: { green: number; amber: number; red: number };
  fullText?: string;
  aiSummary?: string | null;
  // Video-specific
  videoTitle?: string;
  timeSegment?: string;
  // Research/session-specific
  mode?: string;
  durationMinutes?: number | null;
}

export async function getHistory(filters: HistoryFilters): Promise<{
  data?: HistoryItem[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Calculate date cutoff
  let dateFilter: string | null = null;
  if (filters.days !== "all") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.days);
    dateFilter = cutoff.toISOString();
  }

  const items: HistoryItem[] = [];

  // --- Feynman Explanations ---
  if (filters.type === "all" || filters.type === "feynman") {
    let feynmanQuery = supabase
      .from("feynman_explanations")
      .select("id, topic_id, raw_text, ai_summary, gaps_json, created_at, topics(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (filters.topicId) {
      feynmanQuery = feynmanQuery.eq("topic_id", filters.topicId);
    }
    if (dateFilter) {
      feynmanQuery = feynmanQuery.gte("created_at", dateFilter);
    }

    const { data: feynmanData } = await feynmanQuery.limit(50);

    if (feynmanData) {
      for (const row of feynmanData) {
        const topicData = row.topics as unknown as { name: string } | null;
        // Parse gap analysis for color summary
        let gapSummary: { green: number; amber: number; red: number } | undefined;
        if (row.gaps_json) {
          const gaps = row.gaps_json as unknown as {
            segments?: { status: string }[];
          };
          if (gaps.segments) {
            gapSummary = {
              green: gaps.segments.filter((s) => s.status === "green").length,
              amber: gaps.segments.filter((s) => s.status === "amber").length,
              red: gaps.segments.filter((s) => s.status === "red").length,
            };
          }
        }

        items.push({
          id: row.id,
          type: "feynman",
          topicId: row.topic_id,
          topicName: topicData?.name ?? null,
          date: row.created_at,
          preview: row.raw_text.slice(0, 100),
          gapSummary,
          fullText: row.raw_text,
          aiSummary: row.ai_summary,
        });
      }
    }
  }

  // --- Video Notes ---
  if (filters.type === "all" || filters.type === "video") {
    let notesQuery = supabase
      .from("notes")
      .select("id, video_id, time_segment, note_content, source, created_at, videos(title, topic_id, topics(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dateFilter) {
      notesQuery = notesQuery.gte("created_at", dateFilter);
    }

    const { data: notesData } = await notesQuery.limit(50);

    if (notesData) {
      for (const row of notesData) {
        const videoData = row.videos as unknown as {
          title: string;
          topic_id: string | null;
          topics: { name: string } | null;
        } | null;

        // Filter by topic if needed (through video's topic_id)
        if (filters.topicId && videoData?.topic_id !== filters.topicId) {
          continue;
        }

        items.push({
          id: row.id,
          type: "video",
          topicId: videoData?.topic_id ?? null,
          topicName: videoData?.topics?.name ?? null,
          date: row.created_at,
          preview: row.note_content.slice(0, 100),
          videoTitle: videoData?.title ?? "Unknown video",
          timeSegment: row.time_segment,
          fullText: row.note_content,
        });
      }
    }
  }

  // --- Research (Study Sessions with mode=research) ---
  if (filters.type === "all" || filters.type === "research") {
    let sessionsQuery = supabase
      .from("study_sessions")
      .select("id, topic_id, mode, duration_minutes, started_at, topics(name)")
      .eq("user_id", user.id)
      .eq("mode", "research")
      .order("started_at", { ascending: false });

    if (filters.topicId) {
      sessionsQuery = sessionsQuery.eq("topic_id", filters.topicId);
    }
    if (dateFilter) {
      sessionsQuery = sessionsQuery.gte("started_at", dateFilter);
    }

    const { data: sessionsData } = await sessionsQuery.limit(50);

    if (sessionsData) {
      for (const row of sessionsData) {
        const topicData = row.topics as unknown as { name: string } | null;

        items.push({
          id: row.id,
          type: "research",
          topicId: row.topic_id,
          topicName: topicData?.name ?? null,
          date: row.started_at,
          preview: `Research session${row.duration_minutes ? ` (${row.duration_minutes} min)` : ""}`,
          mode: row.mode,
          durationMinutes: row.duration_minutes,
        });
      }
    }
  }

  // Sort all items by date descending
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { data: items };
}
