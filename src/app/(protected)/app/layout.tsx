import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "./_components/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch minimal HUD data for the top bar
  const { data: profile } = await supabase
    .from("profiles").select("xp, coins, level").eq("id", user.id).single();
  const { data: pet } = await supabase
    .from("pets").select("pet_type, name, affinity").eq("user_id", user.id).single();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--pixel-bg-primary)" }}>
      <TopBar profile={profile} pet={pet} />
      <main className="pixel-content-area flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 pb-20 md:pb-6">{children}</div>
      </main>
    </div>
  );
}
