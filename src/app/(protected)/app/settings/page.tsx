import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/page-header";
import { SubjectsManager } from "./_components/subjects-manager";
import { PetSelector } from "./_components/pet-selector";
import { ProfileForm } from "./_components/profile-form";
import { AvatarUpload } from "../_components/avatar-upload";
import {
  DialogFrame,
  PreferencesPanel,
  CursorPicker,
} from "@/components/pixel-ui";

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

  // Avatar (separate query so missing column pre-migration can't break the page)
  let avatarUrl: string | null = null;
  try {
    const { data: av } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user!.id)
      .single();
    avatarUrl = (av as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  } catch {
    avatarUrl = null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Manage your profile, subjects, and preferences."
      />

      {/* Preferences — animations, sound, cursor */}
      <DialogFrame title="PREFERENCES">
        <PreferencesPanel />
        <div className="mt-4 border-t border-[var(--pixel-border)] pt-4">
          <p className="font-pixel mb-2 text-sm text-[var(--pixel-text-primary)]">
            Cursor
          </p>
          <CursorPicker />
        </div>
      </DialogFrame>

      {/* Subjects & Topics */}
      <DialogFrame title="SUBJECTS & TOPICS">
        <SubjectsManager
          subjects={(subjects ?? []).map((s) => ({
            ...s,
            topics: s.topics ?? [],
          }))}
        />
      </DialogFrame>

      {/* Account section */}
      <DialogFrame title="ACCOUNT">
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
      </DialogFrame>

      {/* Profile section */}
      <DialogFrame title="PROFILE">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <AvatarUpload currentUrl={avatarUrl} size={72} showCaption />
          <div className="flex-1">
            <ProfileForm />
          </div>
        </div>
      </DialogFrame>

      {/* Avatar & Pet */}
      <DialogFrame title="CHOOSE YOUR PET">
        <PetSelector currentPetType={null} />
      </DialogFrame>

      {/* Credits */}
      <DialogFrame title="CREDITS & LICENSES">
        <ul className="space-y-1 text-sm text-[var(--pixel-text-secondary)]">
          <li>Character sprites: LPC (CC BY-SA 3.0 / GPL 3.0)</li>
          <li>UI — Travel Book by Crusenho (CC BY 4.0)</li>
          <li>UI — Sprout Lands by Cup Nooble (non-commercial)</li>
          <li>Fonts: CC0 / OFL pixel fonts</li>
          <li>Icons: Lucide (ISC license)</li>
        </ul>
        <p className="mt-2 text-xs text-[var(--pixel-text-muted)]">
          Full credits in docs/ASSETS.md
        </p>
      </DialogFrame>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--pixel-border)] pb-2 last:border-0">
      <span className="text-sm text-[var(--pixel-text-secondary)]">{label}</span>
      <span className="text-sm font-medium text-[var(--pixel-text-primary)]">
        {value}
      </span>
    </div>
  );
}
