import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "./_components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-pixel-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Add bottom padding on mobile to account for fixed BottomNav */}
        <div className="mx-auto max-w-6xl px-6 py-8 pb-20 md:pb-8">{children}</div>
      </main>
    </div>
  );
}
