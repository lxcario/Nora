import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { GameSidebar } from "./_components/game-sidebar";
import { GameTopBar } from "./_components/game-top-bar";
import { BottomNav, CommandPalette, OnboardingTour } from "@/components/pixel-ui";
import { PreferencesProvider } from "@/components/pixel-ui/preferences-provider";
import { SessionStatsProvider } from "./_components/session-stats-context";
import { StudySessionProvider } from "./_components/study-session-context";
import { StudySessionWidget } from "./_components/study-session-widget";
import { StudySessionReceipt } from "./_components/study-session-receipt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Onboarding gate: students without an academic profile are routed to the
  // onboarding wizard before the rest of the app. The current path comes from
  // the proxy via the `x-pathname` header (layouts don't receive it directly).
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboarding = pathname.startsWith("/app/onboarding");

  const { data: academicProfile } = await supabase
    .from("academic_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!academicProfile && !onOnboarding) {
    redirect("/app/onboarding");
  }

  // The onboarding wizard renders without the game shell (no sidebar/topbar),
  // which also breaks the potential redirect loop on /app/onboarding.
  if (onOnboarding) {
    return <PreferencesProvider>{children}</PreferencesProvider>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level, display_name")
    .eq("id", user.id)
    .single();

  // Parallelize avatar + pet queries — they're independent and each is
  // fault-tolerant (a failure never breaks the layout render).
  const [avatarResult, petResult] = await Promise.all([
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();
        return (data as { avatar_url?: string | null } | null)?.avatar_url ?? null;
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from("pets")
          .select("pet_type, name, state")
          .eq("user_id", user.id)
          .maybeSingle();
        return data;
      } catch {
        return null;
      }
    })(),
  ]);

  const avatarUrl = avatarResult;
  const profileWithAvatar = profile ? { ...profile, avatar_url: avatarUrl } : null;

  // Pet data for sidebar widget
  let petSidebarData: {
    pokemonId: number;
    name: string;
    state: "happy" | "neutral" | "sad" | "forest_rescue";
    spriteUrl: string;
  } | null = null;
  if (petResult) {
    const pokemonId = parseInt(petResult.pet_type ?? "25") || 25;
    petSidebarData = {
      pokemonId,
      name: petResult.name ?? "Buddy",
      state: (petResult.state ?? "neutral") as "happy" | "neutral" | "sad" | "forest_rescue",
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`,
    };
  }

  return (
    <PreferencesProvider>
      <SessionStatsProvider resetKey={`${profile?.xp ?? 0}-${profile?.coins ?? 0}`}>
        <StudySessionProvider>
        {/* Skip-to-content link for keyboard/screen-reader users (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:font-pixel focus:text-sm focus:bg-[var(--pixel-accent)] focus:text-[#1a1410] focus:outline-none focus:rounded-sm"
        >
          Skip to main content
        </a>
        <div className="flex min-h-screen bg-[var(--pixel-bg-primary)]">
          <GameSidebar profile={profileWithAvatar} pet={petSidebarData} />
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <GameTopBar profile={profileWithAvatar} />
            <main id="main-content" className="pixel-grid-bg flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
              {children}
            </main>
            <BottomNav />
            <CommandPalette />
            <OnboardingTour />
          </div>
        </div>
        <StudySessionWidget />
        <StudySessionReceipt />
        </StudySessionProvider>
      </SessionStatsProvider>
    </PreferencesProvider>
  );
}
