import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { StudyRoomLayout } from "./_components/study-room-layout";

interface StudyRoomPageProps {
  searchParams: Promise<{ video?: string; t?: string }>;
}

export default async function StudyRoomPage({ searchParams }: StudyRoomPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch user topics grouped by subject
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color, topics(id, name)")
    .order("created_at", { ascending: true });

  const topicOptions =
    subjects?.flatMap((s) =>
      (s.topics ?? []).map((t: { id: string; name: string }) => ({
        id: t.id,
        name: t.name,
        subjectName: s.name,
      }))
    ) ?? [];

  // Parse URL params for video auto-load
  const initialVideoId = params.video ?? undefined;
  const initialSeekTime = params.t ? parseInt(params.t, 10) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Room"
        description="Watch educational videos, generate AI notes, create flashcards, and practice Feynman explanations — all in one workspace."
      />
      <StudyRoomLayout
        topics={topicOptions}
        initialVideoId={initialVideoId}
        initialSeekTime={isNaN(initialSeekTime as number) ? undefined : initialSeekTime}
      />
    </div>
  );
}
