import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { FeynmanEditor } from "./_components/feynman-editor";
import { DialogFrame } from "@/components/pixel-ui";

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
        <DialogFrame>
          <p className="text-sm text-center text-[var(--pixel-text-secondary)]">
            No topics found. Go to{" "}
            <a href="/app/settings" className="font-medium">
              Settings
            </a>{" "}
            to create subjects and topics first.
          </p>
        </DialogFrame>
      ) : (
        <FeynmanEditor topics={topicOptions} />
      )}
    </div>
  );
}
