import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  const xpToday = profile?.xp ?? 0; // simplified - would need daily tracking

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Row: Pixel Room + Today's Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Pixel Room Preview */}
        <div
          className="lg:col-span-3 rounded-lg p-4 relative overflow-hidden"
          style={{ backgroundColor: "#2a2018", border: "1px solid #3d2817" }}
        >
          <h2 className="font-pixel text-sm mb-3" style={{ color: "#f0e6d2" }}>
            PIXEL ROOM
          </h2>
          {/* Mini room scene */}
          <div
            className="relative h-40 rounded-lg overflow-hidden"
            style={{ backgroundColor: "#1a1410" }}
          >
            {/* Simple room background */}
            <div className="absolute inset-0">
              {/* Wall */}
              <div className="absolute left-0 right-0 top-0 h-[45%] bg-gradient-to-b from-[#2a1f15] to-[#3d2817]">
                {/* Window */}
                <div className="absolute left-[10%] top-[15%] h-[65%] w-[14%] rounded-t-lg border-2 border-[#5a3d2e] bg-gradient-to-b from-[#1a1a3a] to-[#2a2a4a]">
                  <div className="absolute inset-[3px] grid grid-cols-2 grid-rows-2 gap-[1px]">
                    <div className="rounded-tl bg-white/5" />
                    <div className="rounded-tr bg-white/5" />
                    <div className="bg-white/3" />
                    <div className="bg-white/3" />
                  </div>
                </div>
                {/* Shelf */}
                <div className="absolute right-[10%] top-[30%] h-[5%] w-[20%] bg-[#5a3d2e]">
                  <div className="absolute -top-3 left-2 h-3 w-2 rounded-sm bg-[#e74c3c]" />
                  <div className="absolute -top-4 left-5 h-4 w-1.5 rounded-sm bg-[#3498db]" />
                  <div className="absolute -top-3 left-8 h-3 w-2 rounded-sm bg-[#2ecc71]" />
                </div>
              </div>
              {/* Floor */}
              <div className="absolute bottom-0 left-0 right-0 h-[55%] bg-[#4a3520]">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent, transparent 29px, #000 29px, #000 30px), repeating-linear-gradient(0deg, transparent, transparent 29px, #000 29px, #000 30px)",
                  }}
                />
              </div>
              {/* Lamp glow */}
              <div
                className="absolute top-[15%] left-[25%] w-24 h-24 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, #d4a526 0%, transparent 70%)" }}
              />
            </div>
            {/* Pet sleeping - simple representation */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="relative">
                <img
                  src="/sprites/travel-book/icons/CatHead.png"
                  alt="Pet"
                  width={32}
                  height={32}
                  className="pixel-art opacity-90"
                />
                <span className="absolute -top-2 -right-2 text-[10px]">💤</span>
              </div>
            </div>
          </div>
          {/* Visit Room button */}
          <Link
            href="/app/room"
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:brightness-110"
            style={{
              backgroundColor: "#2d4a2d",
              color: "#ffffff",
            }}
          >
            Visit Room →
          </Link>
        </div>

        {/* Today's Focus */}
        <div
          className="lg:col-span-2 rounded-lg p-4"
          style={{ backgroundColor: "#2a2018", border: "1px solid #3d2817" }}
        >
          <h2 className="font-pixel text-sm mb-4" style={{ color: "#f0e6d2" }}>
            TODAY&apos;S FOCUS
          </h2>
          <div className="space-y-3">
            <FocusItem
              icon="/sprites/travel-book/icons/Book.png"
              value={String(cardsDue ?? 0)}
              label="Cards due for review"
            />
            <FocusItem
              icon="/sprites/travel-book/icons/Document.png"
              value="7d"
              label="Next exam"
            />
            <FocusItem
              icon="/sprites/travel-book/icons/Sun.png"
              value={String(xpToday)}
              label="XP earned today"
            />
            <FocusItem
              icon="/sprites/travel-book/icons/Coin2.png"
              value={`${streak} day${streak !== 1 ? "s" : ""}`}
              label="Current streak"
            />
          </div>
        </div>
      </div>

      {/* Today's Quests */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "#2a2018", border: "1px solid #3d2817" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm" style={{ color: "#f0e6d2" }}>
            TODAY&apos;S QUESTS
          </h2>
          <span className="font-pixel text-xs" style={{ color: "#c4a882" }}>
            REWARD
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuestItem
            label="Review 20 cards"
            progress={8}
            max={20}
            reward="+50 XP"
            color="#7da856"
          />
          <QuestItem
            label="Explain 3 concepts"
            progress={1}
            max={3}
            reward="+25 XP"
            color="#5b9bd5"
          />
          <QuestItem
            label="Study 30 minutes"
            progress={12}
            max={30}
            reward="+1 Cookie"
            color="#d4a526"
          />
        </div>
      </div>

      {/* Study Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StudyModeCard
          title="Review"
          description="Spaced repetition flashcards"
          href="/app/review"
          icon="/sprites/travel-book/icons/Book.png"
          bgColor="#4a2d5a"
        />
        <StudyModeCard
          title="Feynman"
          description="Explain concepts simply"
          href="/app/feynman"
          icon="/sprites/travel-book/icons/Lightbulb.png"
          bgColor="#2d4a4a"
        />
        <StudyModeCard
          title="Research"
          description="Search papers & create cards"
          href="/app/research"
          icon="/sprites/travel-book/icons/MagnifyingGlass.png"
          bgColor="#2d3a4a"
        />
        <StudyModeCard
          title="Analytics"
          description="Track progress & mastery"
          href="/app/analytics"
          icon="/sprites/travel-book/icons/Trophy.png"
          bgColor="#4a3d2a"
        />
        <StudyModeCard
          title="Planner"
          description="Schedule & exam dates"
          href="/app/planner"
          icon="/sprites/travel-book/icons/Document.png"
          bgColor="#2d4a3a"
        />
        <StudyModeCard
          title="Collection"
          description="Themes & achievements"
          href="/app/collection"
          icon="/sprites/travel-book/icons/ChestTreasure.png"
          bgColor="#3a2d4a"
        />
      </div>

      {/* Footer tip */}
      <div className="text-center py-3">
        <p className="text-xs" style={{ color: "#c4a882" }}>
          💡 Tip: Short daily goals lead to big results ✨
        </p>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function FocusItem({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <img src={icon} alt="" width={20} height={20} className="pixel-art flex-shrink-0" />
      <div className="flex items-baseline gap-2">
        <span className="font-pixel text-sm" style={{ color: "#d4a526" }}>
          {value}
        </span>
        <span className="text-xs" style={{ color: "#c4a882" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function QuestItem({
  label,
  progress,
  max,
  reward,
  color,
}: {
  label: string;
  progress: number;
  max: number;
  reward: string;
  color: string;
}) {
  const pct = Math.min(progress / max, 1) * 100;
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: "#1e1814", border: "1px solid #3d2817" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: "#f0e6d2" }}>
          {label}
        </span>
        <span className="font-pixel text-[10px]" style={{ color: "#d4a526" }}>
          {reward}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "#1a1410" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[10px] flex-shrink-0" style={{ color: "#c4a882" }}>
          {progress}/{max}
        </span>
      </div>
    </div>
  );
}

function StudyModeCard({
  title,
  description,
  href,
  icon,
  bgColor,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  bgColor: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-4 rounded-lg transition-all hover:brightness-110"
      style={{ backgroundColor: bgColor }}
    >
      <img src={icon} alt={title} width={24} height={24} className="pixel-art flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-pixel text-sm" style={{ color: "#f0e6d2" }}>
          {title}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#c4a882" }}>
          {description}
        </p>
      </div>
      <span style={{ color: "#c4a882" }}>→</span>
    </Link>
  );
}
