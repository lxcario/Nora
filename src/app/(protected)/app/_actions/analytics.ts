"use server";

import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";

export interface AnalyticsData {
  sessionsThisWeek: number;
  cardsReviewed: number;
  cardsCreated: number;
  studyMinutes: number;
  streak: number;
  dailySessions: { date: string; count: number }[];
  dailyReviews: { date: string; count: number }[];
  topicMastery: { name: string; avgGrade: number; totalReviews: number }[];
}

export async function getAnalytics(): Promise<{
  data?: AnalyticsData;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString();

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString();

  // Sessions this week
  const { count: sessionsThisWeek } = await supabase
    .from("study_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", sevenDaysStr);

  // Cards reviewed (last 30 days)
  const { count: cardsReviewed } = await supabase
    .from("card_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("reviewed_at", thirtyDaysStr);

  // Cards created (last 30 days)
  const { count: cardsCreated } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", thirtyDaysStr);

  // Total study minutes this week
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("duration_minutes")
    .eq("user_id", user.id)
    .gte("started_at", sevenDaysStr);

  const studyMinutes = (sessions ?? []).reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0
  );

  // Daily sessions (last 30 days)
  const { data: allSessions } = await supabase
    .from("study_sessions")
    .select("started_at")
    .eq("user_id", user.id)
    .gte("started_at", thirtyDaysStr)
    .order("started_at", { ascending: true });

  const dailySessionsMap = new Map<string, number>();
  (allSessions ?? []).forEach((s) => {
    const date = (s.started_at as string).split("T")[0];
    dailySessionsMap.set(date, (dailySessionsMap.get(date) ?? 0) + 1);
  });
  const dailySessions = Array.from(dailySessionsMap.entries()).map(
    ([date, count]) => ({ date, count })
  );

  // Daily reviews (last 30 days)
  const { data: allReviews } = await supabase
    .from("card_reviews")
    .select("reviewed_at")
    .eq("user_id", user.id)
    .gte("reviewed_at", thirtyDaysStr)
    .order("reviewed_at", { ascending: true });

  const dailyReviewsMap = new Map<string, number>();
  (allReviews ?? []).forEach((r) => {
    const date = (r.reviewed_at as string).split("T")[0];
    dailyReviewsMap.set(date, (dailyReviewsMap.get(date) ?? 0) + 1);
  });
  const dailyReviews = Array.from(dailyReviewsMap.entries()).map(
    ([date, count]) => ({ date, count })
  );

  // Streak — uses the shared computeStreak function (single source of truth).
  const allActivityDates = new Set<string>([
    ...dailySessionsMap.keys(),
    ...dailyReviewsMap.keys(),
  ]);
  const streak = computeStreak(allActivityDates, today);

  // Topic mastery (avg grade per topic)
  const { data: reviewsWithTopics } = await supabase
    .from("card_reviews")
    .select("grade, cards(topics(name))")
    .eq("user_id", user.id)
    .gte("reviewed_at", thirtyDaysStr);

  const topicGrades = new Map<string, { total: number; count: number }>();
  (reviewsWithTopics ?? []).forEach((r) => {
    const card = r.cards as unknown as { topics: { name: string } | null } | null;
    const topicName = card?.topics?.name ?? "Uncategorized";
    const current = topicGrades.get(topicName) ?? { total: 0, count: 0 };
    current.total += r.grade;
    current.count += 1;
    topicGrades.set(topicName, current);
  });

  const topicMastery = Array.from(topicGrades.entries()).map(
    ([name, { total, count }]) => ({
      name,
      avgGrade: Math.round((total / count) * 10) / 10,
      totalReviews: count,
    })
  );

  return {
    data: {
      sessionsThisWeek: sessionsThisWeek ?? 0,
      cardsReviewed: cardsReviewed ?? 0,
      cardsCreated: cardsCreated ?? 0,
      studyMinutes,
      streak,
      dailySessions,
      dailyReviews,
      topicMastery,
    },
  };
}
