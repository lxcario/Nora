import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { ErrorSpotterClient } from "./_components/error-spotter-client";

export const metadata = { title: "Error Spotter — Nora" };

export default async function ErrorSpotterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's topics for the selector
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subjects(name)")
    .eq("user_id", user!.id)
    .order("name");

  const topicOptions = (topics ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    subjectName: ((t.subjects as unknown as { name: string } | null)?.name) ?? "General",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Error Spotter"
        description="The AI wrote an explanation with hidden mistakes. Can you find them?"
      />
      <ErrorSpotterClient topics={topicOptions} />
    </div>
  );
}
