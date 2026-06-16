import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { FeynmanEditor } from "./_components/feynman-editor";

export default async function FeynmanPage() {
  const supabase = await createClient();

  // Fetch topics grouped by subject for the selector
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color, topics(id, name)")
    .order("created_at", { ascending: true });

  const topicOptions =
    subjects?.flatMap((s) =>
      (s.topics ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        subjectName: s.name,
        subjectColor: s.color,
      }))
    ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feynman Mode"
        description="Explain concepts in your own words. An AI 'Inquisitive Student' will probe gaps in your understanding."
      />

      {topicOptions.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">
            No topics found. Go to{" "}
            <a
              href="/app/settings"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Settings
            </a>{" "}
            to create subjects and topics first.
          </p>
        </div>
      ) : (
        <FeynmanEditor topics={topicOptions} />
      )}
    </div>
  );
}
