import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "./_components/page-header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch real stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level")
    .eq("id", user!.id)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const { count: cardsDue } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .lte("next_review_at", today);

  // Calculate streak (consecutive days with activity)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("started_at")
    .eq("user_id", user!.id)
    .gte("started_at", thirtyDaysAgo.toISOString());

  const { data: reviews } = await supabase
    .from("card_reviews")
    .select("reviewed_at")
    .eq("user_id", user!.id)
    .gte("reviewed_at", thirtyDaysAgo.toISOString());

  const activityDates = new Set<string>();
  (sessions ?? []).forEach((s) => activityDates.add((s.started_at as string).split("T")[0]));
  (reviews ?? []).forEach((r) => activityDates.add((r.reviewed_at as string).split("T")[0]));

  let streak = 0;
  const checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (activityDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome back"
        description={`Signed in as ${user?.email}`}
      />

      {/* Quick stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Level" value={String(profile?.level ?? 1)} icon="/sprites/travel-book/icons/Trophy.png" />
        <StatCard label="XP" value={String(profile?.xp ?? 0)} icon="/sprites/travel-book/icons/Sun.png" />
        <StatCard label="Cards Due" value={String(cardsDue ?? 0)} icon="/sprites/travel-book/icons/Book.png" />
        <StatCard label="Streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} icon="/sprites/travel-book/icons/Coin2.png" />
      </div>

      {/* Navigation cards */}
      <div>
        <h2 className="font-pixel mb-4 text-lg font-semibold">Study Modes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard
            title="Feynman Mode"
            description="Explain concepts in your own words. AI probes your understanding."
            href="/app/feynman"
            icon="/sprites/travel-book/icons/Lightbulb.png"
          />
          <NavCard
            title="Review Cards"
            description="Spaced repetition review. Grade your recall 0–5."
            href="/app/review"
            icon="/sprites/travel-book/icons/Book.png"
          />
          <NavCard
            title="Research Desk"
            description="Search academic papers. Create cards from findings."
            href="/app/research"
            icon="/sprites/travel-book/icons/MagnifyingGlass.png"
          />
          <NavCard
            title="Study Planner"
            description="Your spaced study schedule with exam dates."
            href="/app/planner"
            icon="/sprites/travel-book/icons/Document.png"
          />
          <NavCard
            title="Pixel Room"
            description="Visit your avatar and pet. See today's missions."
            href="/app/room"
            icon="/sprites/travel-book/icons/Gamepad.png"
          />
          <NavCard
            title="Analytics"
            description="Track progress, mastery, and consistency."
            href="/app/analytics"
            icon="/sprites/travel-book/icons/Trophy.png"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-sm p-4"
      style={{
        backgroundImage: "url('/sprites/travel-book/UI_TravelBook_Slot01a.png')",
        backgroundSize: "100% 100%",
        imageRendering: "pixelated",
        border: "none",
      }}
    >
      <img src={icon} alt={label} width={20} height={20} className="pixel-art" />
      <div>
        <p className="font-pixel text-xs font-medium uppercase tracking-wider text-[var(--pixel-text-secondary)]">
          {label}
        </p>
        <p className="font-pixel text-lg font-bold text-[var(--pixel-text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function NavCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-sm p-4 transition-all hover:shadow-md"
      style={{
        backgroundImage: "url('/sprites/travel-book/UI_TravelBook_Frame01a.png')",
        backgroundSize: "100% 100%",
        imageRendering: "pixelated",
        border: "none",
      }}
    >
      <div className="flex items-start gap-3">
        <img src={icon} alt={title} width={20} height={20} className="pixel-art mt-0.5" />
        <div>
          <h3 className="font-pixel text-[var(--pixel-text-primary)] group-hover:text-[var(--pixel-accent)]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
