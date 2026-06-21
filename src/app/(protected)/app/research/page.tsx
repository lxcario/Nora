import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { ResearchDesk } from "./_components/research-desk";

export default async function ResearchPage() {
  const supabase = await createClient();

  // Get topics for the card-saving dropdown
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, topics(id, name)")
    .order("created_at", { ascending: true });

  const topicOptions =
    subjects?.flatMap((s) =>
      (s.topics ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        subjectName: s.name,
      }))
    ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Research Desk"
        description="Ask a research question. AI searches academic databases and the web, then synthesizes a cited answer."
      />
      <ResearchDesk topics={topicOptions} />
    </div>
  );
}
