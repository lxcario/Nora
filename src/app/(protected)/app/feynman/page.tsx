import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { FeynmanEditor } from "./_components/feynman-editor";
import { EmptyState, FeatureHint } from "@/components/pixel-ui";

interface FeynmanPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function FeynmanPage({ searchParams }: FeynmanPageProps) {
  const params = await searchParams;
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

      <FeatureHint
        id="feynman-mode"
        title="How it works"
        description="Write an explanation as if you're teaching someone. The AI will evaluate each segment, ask probing questions, and suggest flashcards. Attach a source for grounded feedback."
        icon="/sprites/travel-book/icons/Lightbulb.png"
      />

      {topicOptions.length === 0 ? (
        <EmptyState
          icon="pen"
          message="Start by adding subjects and topics — then use Feynman Mode to explain them in your own words and build your flashcard deck."
          actionLabel="Create your first subject →"
          actionHref="/app/settings"
        />
      ) : (
        <FeynmanEditor topics={topicOptions} defaultTopicId={params.topic} />
      )}
    </div>
  );
}
