import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GameSidebar } from "./_components/game-sidebar";
import { GameTopBar } from "./_components/game-top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level, display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#1a1410" }}>
      <GameSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-h-screen">
        <GameTopBar profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
