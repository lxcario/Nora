import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { getHistory, type HistoryType, type HistoryDays } from "../_actions/history";
import { HistoryFilters } from "./_components/history-filters";
import { HistoryList } from "./_components/history-list";

interface HistoryPageProps {
  searchParams: Promise<{ type?: string; topic?: string; days?: string }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;

  // Parse filters from URL
  const type = (["all", "feynman", "video", "research"].includes(params.type ?? "")
    ? params.type
    : "all") as HistoryType;

  const days = (["7", "30", "90", "all"].includes(params.days ?? "")
    ? params.days === "all"
      ? "all"
      : Number(params.days)
    : "all") as HistoryDays;

  const topicId = params.topic || undefined;

  // Fetch user's topics for the filter dropdown
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name")
    .eq("user_id", user!.id)
    .order("name");

  // Fetch history items
  const { data: items, error } = await getHistory({ type, topicId, days });

  return (
    <div className="space-y-6">
      <PageHeader
        title="History & Journals"
        description="Review your past study sessions, explanations, and notes."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <HistoryFilters topics={topics ?? []} />

      <HistoryList items={items ?? []} />
    </div>
  );
}
