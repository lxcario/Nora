import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DialogFrame, PixelCounter } from "@/components/pixel-ui";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile stats
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

  // Calculate streak
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
  (sessions ?? []).forEach((s) =>
    activityDates.add((s.started_at as string).split("T")[0])
  );
  (reviews ?? []).forEach((r) =>
    activityDates.add((r.reviewed_at as string).split("T")[0])
  );

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

  const xpToday = profile?.xp ?? 0;
  const coins = profile?.coins ?? 0;

  // ── Quest progress (real data) ──
  // Cards reviewed today
  const { count: reviewsToday } = await supabase
    .from("card_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .gte("reviewed_at", `${today}T00:00:00`);

  // Feynman explanations today
  const { count: feynmanToday } = await supabase
    .from("feynman_explanations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .gte("created_at", `${today}T00:00:00`);

  // Study sessions today (each counts as ~25 min)
  const { count: sessionsToday } = await supabase
    .from("study_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .gte("started_at", `${today}T00:00:00`);

  const reviewProgress = Math.min(reviewsToday ?? 0, 20);
  const feynmanProgress = Math.min(feynmanToday ?? 0, 3);
  const studyMinutes = Math.min((sessionsToday ?? 0) * 25, 30);
  const allQuestsDone = reviewProgress >= 20 && feynmanProgress >= 3 && studyMinutes >= 30;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ═══ Quick stat tiles ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon="/sprites/travel-book/icons/Book.png"
          value={cardsDue ?? 0}
          label="Cards due today"
        />
        <StatTile
          icon="/sprites/travel-book/icons/Sun.png"
          value={xpToday}
          label="Total XP"
        />
        <StatTile
          icon="/sprites/travel-book/icons/PotionRed.png"
          value={streak}
          suffix={streak === 1 ? " day" : " days"}
          label="Current streak"
        />
        <StatTile
          icon="/sprites/travel-book/icons/Coin.png"
          value={coins}
          label="Coins"
        />
      </div>

      {/* ═══ Today's Quests ═══ */}
      <DialogFrame title="TODAY'S QUESTS">
        <div className="flex flex-col md:flex-row md:items-stretch gap-4">
          {/* Quest items */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuestItem
              icon="/sprites/travel-book/icons/Book.png"
              label="Review 20 cards"
              progress={reviewProgress}
              max={20}
              color="var(--pixel-success)"
            />
            <QuestItem
              icon="/sprites/travel-book/icons/Lightbulb.png"
              label="Explain 3 concepts"
              progress={feynmanProgress}
              max={3}
              color="var(--pixel-accent)"
            />
            <QuestItem
              icon="/sprites/travel-book/icons/Trophy.png"
              label="Study for 30 minutes"
              progress={studyMinutes}
              max={30}
              color="var(--pixel-error)"
            />
          </div>

          {/* Reward badge */}
          <div className="flex flex-row md:flex-col items-center justify-center gap-3 shrink-0 md:pl-4 md:border-l md:border-[var(--pixel-border)]">
            <span className="font-pixel text-[10px] text-[var(--pixel-text-secondary)]">
              {allQuestsDone ? "CLAIMED!" : "REWARD"}
            </span>
            <div className="flex items-center gap-1.5">
              <img src="/sprites/travel-book/icons/Sun.png" alt="XP" width={14} height={14} className="pixel-art" />
              <span className="text-[11px] text-[var(--pixel-accent)]">+25 XP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src="/sprites/travel-book/icons/Coin.png" alt="Coins" width={14} height={14} className="pixel-art" />
              <span className="text-[11px] text-[var(--pixel-accent)]">+10</span>
            </div>
          </div>
        </div>
      </DialogFrame>

      {/* ═══ Study Modes ═══ */}
      <div>
        <h2 className="font-pixel text-sm text-[var(--pixel-text-secondary)] mb-2 px-1">
          STUDY MODES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StudyModeCard
            title="REVIEW CARDS"
            description="Review and master your flashcards."
            href="/app/review"
            icon="/sprites/travel-book/icons/Book.png"
            bgColor="var(--pixel-card-purple)"
          />
          <StudyModeCard
            title="FEYNMAN MODE"
            description="Explain concepts in your own words."
            href="/app/feynman"
            icon="/sprites/travel-book/icons/Lightbulb.png"
            bgColor="var(--pixel-card-teal)"
          />
          <StudyModeCard
            title="RESEARCH DESK"
            description="Search papers and create cards."
            href="/app/research"
            icon="/sprites/travel-book/icons/MagnifyingGlass.png"
            bgColor="var(--pixel-card-navy)"
          />
          <StudyModeCard
            title="STUDY PLANNER"
            description="Plan your schedule and stay on track."
            href="/app/planner"
            icon="/sprites/travel-book/icons/Document.png"
            bgColor="var(--pixel-card-forest)"
          />
          <StudyModeCard
            title="PIXEL ROOM"
            description="Visit your cozy room and pet."
            href="/app/room"
            icon="/sprites/travel-book/icons/Gamepad.png"
            bgColor="var(--pixel-card-olive)"
          />
          <StudyModeCard
            title="COLLECTION"
            description="Cursors, themes, pets, and decorations."
            href="/app/collection"
            icon="/sprites/travel-book/icons/ChestTreasure.png"
            bgColor="var(--pixel-card-plum)"
          />
        </div>
      </div>

      {/* ═══ Footer Tip ═══ */}
      <div className="flex items-center justify-center gap-3 py-2">
        <img src="/sprites/travel-book/icons/Sun.png" alt="" width={14} height={14} className="pixel-art opacity-60" />
        <p className="text-xs text-[var(--pixel-text-secondary)]">
          Tip: Short daily goals lead to big long-term results.
        </p>
        <img src="/sprites/travel-book/icons/Flower.png" alt="" width={14} height={14} className="pixel-art opacity-60" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════════ */

/** Glanceable RPG stat tile */
function StatTile({
  icon,
  value,
  suffix,
  label,
}: {
  icon: string;
  value: number;
  suffix?: string;
  label: string;
}) {
  return (
    <div className="pixel-panel flex items-center gap-4 p-3">
      <div className="shrink-0">
        <img src={icon} alt="" width={36} height={36} className="pixel-art" />
      </div>
      <div className="min-w-0">
        <PixelCounter
          value={value}
          suffix={suffix}
          className="font-pixel text-xl text-[var(--pixel-accent)] block leading-none"
        />
        <span className="text-xs text-[var(--pixel-text-secondary)] block mt-1 truncate">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Quest progress card */
function QuestItem({
  icon,
  label,
  progress,
  max,
  color,
}: {
  icon: string;
  label: string;
  progress: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((progress / max) * 100, 100);

  return (
    <div className="pixel-panel pixel-panel-inset p-2">
      <div className="flex items-center gap-2 mb-2">
        <img src={icon} alt="" width={16} height={16} className="pixel-art" />
        <span className="text-xs text-[var(--pixel-text-primary)] font-medium">
          {label}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-2 overflow-hidden bg-[var(--pixel-bg-primary)] border border-[var(--pixel-border)]">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[var(--pixel-text-secondary)] block text-right mt-1">
        {progress} / {max}
      </span>
    </div>
  );
}

/** Study mode navigation card */
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
      className="pixel-panel group flex items-center gap-4 p-4 transition-all hover:brightness-110"
      style={{ backgroundColor: bgColor }}
    >
      <div className="shrink-0">
        <img src={icon} alt="" width={32} height={32} className="pixel-art" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-pixel text-sm text-[var(--pixel-text-primary)] leading-tight">
          {title}
        </h3>
        <p className="text-xs text-[var(--pixel-text-secondary)] mt-1 leading-snug">
          {description}
        </p>
      </div>
      <span className="text-[var(--pixel-text-secondary)] group-hover:text-[var(--pixel-text-primary)] transition-colors text-xl">
        →
      </span>
    </Link>
  );
}
