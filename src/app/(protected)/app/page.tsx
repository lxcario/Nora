import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "./_components/page-header";
import {
  Star,
  Sparkles,
  Layers,
  Flame,
  PenLine,
  FlaskConical,
  CalendarDays,
  Gamepad2,
  BarChart3,
} from "lucide-react";

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
        <StatCard label="Level" value={String(profile?.level ?? 1)} icon={Star} />
        <StatCard label="XP" value={String(profile?.xp ?? 0)} icon={Sparkles} />
        <StatCard label="Cards Due" value={String(cardsDue ?? 0)} icon={Layers} />
        <StatCard label="Streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} icon={Flame} />
      </div>

      {/* Navigation cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Study Modes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard
            title="Feynman Mode"
            description="Explain concepts in your own words. AI probes your understanding."
            href="/app/feynman"
            icon={PenLine}
            color="border-l-indigo-500"
          />
          <NavCard
            title="Review Cards"
            description="Spaced repetition review. Grade your recall 0–5."
            href="/app/review"
            icon={Layers}
            color="border-l-emerald-500"
          />
          <NavCard
            title="Research Desk"
            description="Search academic papers. Create cards from findings."
            href="/app/research"
            icon={FlaskConical}
            color="border-l-amber-500"
          />
          <NavCard
            title="Study Planner"
            description="Your spaced study schedule with exam dates."
            href="/app/planner"
            icon={CalendarDays}
            color="border-l-sky-500"
          />
          <NavCard
            title="Pixel Room"
            description="Visit your avatar and pet. See today's missions."
            href="/app/room"
            icon={Gamepad2}
            color="border-l-pink-500"
          />
          <NavCard
            title="Analytics"
            description="Track progress, mastery, and consistency."
            href="/app/analytics"
            icon={BarChart3}
            color="border-l-violet-500"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Icon className="h-5 w-5 text-zinc-400" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function NavCard({
  title,
  description,
  href,
  icon: Icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-lg border border-l-4 border-zinc-200 bg-white p-4 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 ${color}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-zinc-400 group-hover:text-indigo-500" />
        <div>
          <h3 className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {title}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
