import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { ListenClient } from "./_components/listen-client";

export const metadata = { title: "Listen Mode — Nora" };

export default async function ListenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Listen Mode"
        description="Your notes become a study conversation. Read through it like a dialogue with a friend."
      />
      <ListenClient topics={topicOptions} />
    </div>
  );
}
