import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { SettingsTabs } from "./_components/settings-tabs";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Subjects with topics
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color, topics(id, name, exam_date)")
    .order("created_at", { ascending: true });

  // Avatar URL (separate query — missing column pre-migration 003 won't break the page)
  let avatarUrl: string | null = null;
  try {
    const { data: av } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user!.id)
      .single();
    avatarUrl = (av as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  } catch { /* pre-migration */ }

  // Current pet type
  let currentPetType: string | null = null;
  try {
    const { data: pet } = await supabase
      .from("pets")
      .select("pet_type")
      .eq("user_id", user!.id)
      .single();
    currentPetType = pet?.pet_type ?? null;
  } catch { /* no pet yet */ }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Profile, customization, your pet, and study preferences — all in one place."
      />

      <SettingsTabs
        avatarUrl={avatarUrl}
        currentPetType={currentPetType}
        subjects={(subjects ?? []).map((s) => ({
          ...s,
          topics: (s.topics ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            exam_date: t.exam_date ?? null,
          })),
        }))}
        userEmail={user?.email ?? "—"}
        userId={user?.id ?? ""}
        userCreatedAt={
          user?.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "—"
        }
      />
    </div>
  );
}
