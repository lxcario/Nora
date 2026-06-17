import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GameSidebar } from "./_components/game-sidebar";
import { GameTopBar } from "./_components/game-top-bar";
import { PreferencesProvider } from "@/components/pixel-ui/preferences-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level, display_name")
    .eq("id", user.id)
    .single();

  // Avatar URL is fetched separately so a missing column (pre-migration 003)
  // can't break the main profile query.
  let avatarUrl: string | null = null;
  try {
    const { data: av } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();
    avatarUrl = (av as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  } catch {
    avatarUrl = null;
  }

  const profileWithAvatar = profile ? { ...profile, avatar_url: avatarUrl } : null;

  return (
    <PreferencesProvider>
      <div className="flex min-h-screen bg-[var(--pixel-bg-primary)]">
        <GameSidebar profile={profileWithAvatar} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <GameTopBar profile={profileWithAvatar} />
          <main className="pixel-grid-bg flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </PreferencesProvider>
  );
}
