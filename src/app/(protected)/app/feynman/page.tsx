import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { FeynmanEditor } from "./_components/feynman-editor";
import { EmptyState } from "@/components/pixel-ui";

export default async function FeynmanPage() {
  const supabase = await createClient();

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
        <EmptyState
          icon="pen"
          message="No topics found. Create subjects and topics in Settings to get started."
          actionLabel="Go to Settings"
          actionHref="/app/settings"
        />
      ) : (
        <FeynmanEditor topics={topicOptions} />
      )}
    </div>
  );
}
