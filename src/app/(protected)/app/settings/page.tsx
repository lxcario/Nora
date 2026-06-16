import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { User, Palette, Cat, Award, BookOpen } from "lucide-react";
import { SubjectsManager } from "./_components/subjects-manager";
import { PetSelector } from "./_components/pet-selector";
import { ProfileForm } from "./_components/profile-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch subjects with their topics
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color, topics(id, name, exam_date)")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, subjects, and preferences."
      />

      {/* Subjects & Topics */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <BookOpen className="h-4 w-4" />
          Subjects & Topics
        </h2>
        <SubjectsManager
          subjects={
            (subjects ?? []).map((s) => ({
              ...s,
              topics: s.topics ?? [],
            }))
          }
        />
      </section>

      {/* Account section */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <User className="h-4 w-4" />
          Account
        </h2>
        <div className="space-y-3">
          <SettingRow label="Email" value={user?.email ?? "—"} />
          <SettingRow
            label="User ID"
            value={user ? user.id.slice(0, 8) + "..." : "—"}
          />
          <SettingRow
            label="Created"
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "—"
            }
          />
        </div>
      </section>

      {/* Profile section */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <Palette className="h-4 w-4" />
          Profile
        </h2>
        <ProfileForm />
      </section>

      {/* Avatar & Pet */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <Cat className="h-4 w-4" />
          Choose Your Pet
        </h2>
        <PetSelector currentPetType={null} />
      </section>

      {/* Credits */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <Award className="h-4 w-4" />
          Credits & Licenses
        </h2>
        <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Character sprites: LPC (CC BY-SA 3.0 / GPL 3.0)</li>
          <li>UI elements: Kenney Pixel UI Pack (CC0)</li>
          <li>Fonts: CC0 / OFL pixel fonts</li>
          <li>Icons: Lucide (ISC license)</li>
        </ul>
        <p className="mt-2 text-xs text-zinc-400">
          Full credits in docs/ASSETS.md
        </p>
      </section>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
