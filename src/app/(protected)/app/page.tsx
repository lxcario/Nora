import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DialogFrame, PixelCounter } from "@/components/pixel-ui";
import { formatStreak } from "@/lib/format-streak";

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

interface FriendActivity {
  userId: string;
  displayName: string;
  activityType: "review" | "feynman" | "session";
  count: number;
}

interface FriendsFeed {
  activities: FriendActivity[];
  partyName: string | null;
}

async function getFriendsFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<FriendsFeed> {
  try {
    // 1. Find the user's party
    const { data: membership } = await supabase
      .from("party_members")
      .select("party_id, parties(name)")
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) return { activities: [], partyName: null };

    const partyName =
      (membership.parties as { name?: string } | null)?.name ?? null;

    // 2. Get other party member IDs
    const { data: members } = await supabase
      .from("party_members")
      .select("user_id")
      .eq("party_id", membership.party_id)
      .neq("user_id", userId);

    const memberIds = (members ?? []).map((m) => m.user_id as string);
    if (memberIds.length === 0) return { activities: [], partyName };

    // 3. Fetch display names
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", memberIds);

    const nameMap: Record<string, string> = {};
    (memberProfiles ?? []).forEach((p) => {
      nameMap[p.id as string] = (p.display_name as string | null) ?? "Student";
    });

    // 4. Fetch activity in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: recentReviews }, { data: recentFeynman }, { data: recentSessions }] =
      await Promise.all([
        supabase
          .from("card_reviews")
          .select("user_id")
          .in("user_id", memberIds)
          .gte("reviewed_at", since),
        supabase
          .from("feynman_explanations")
          .select("user_id")
          .in("user_id", memberIds)
          .gte("created_at", since),
        supabase
          .from("study_sessions")
          .select("user_id")
          .in("user_id", memberIds)
          .gte("started_at", since),
      ]);

    // 5. Aggregate per (member × type), count > 0 only
    const counts: Record<string, Record<string, number>> = {};

    (recentReviews ?? []).forEach((r) => {
      const uid = r.user_id as string;
      counts[uid] = counts[uid] ?? {};
      counts[uid]["review"] = (counts[uid]["review"] ?? 0) + 1;
    });
    (recentFeynman ?? []).forEach((r) => {
      const uid = r.user_id as string;
      counts[uid] = counts[uid] ?? {};
      counts[uid]["feynman"] = (counts[uid]["feynman"] ?? 0) + 1;
    });
    (recentSessions ?? []).forEach((r) => {
      const uid = r.user_id as string;
      counts[uid] = counts[uid] ?? {};
      counts[uid]["session"] = (counts[uid]["session"] ?? 0) + 1;
    });

    const activities: FriendActivity[] = [];
    for (const uid of memberIds) {
      const c = counts[uid];
      if (!c) continue;
      const displayName = nameMap[uid] ?? "Student";
      if (c["review"])  activities.push({ userId: uid, displayName, activityType: "review",  count: c["review"]  });
      if (c["feynman"]) activities.push({ userId: uid, displayName, activityType: "feynman", count: c["feynman"] });
      if (c["session"]) activities.push({ userId: uid, displayName, activityType: "session", count: c["session"] });
    }

    // Sort by count desc, cap at 8 items
    activities.sort((a, b) => b.count - a.count);
    return { activities: activities.slice(0, 8), partyName };
  } catch {
    return { activities: [], partyName: null };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profile stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, coins, level, display_name")
    .eq("id", user!.id)
    .single();

  const today = new Date().toISOString().split("T")[0];

  // Cards due
  const { count: cardsDue } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .lte("next_review_at", today);

  // Streak (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: sessions }, { data: reviews }] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("started_at")
      .eq("user_id", user!.id)
      .gte("started_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("card_reviews")
      .select("reviewed_at")
      .eq("user_id", user!.id)
      .gte("reviewed_at", thirtyDaysAgo.toISOString()),
  ]);

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

  const xpTotal = profile?.xp ?? 0;
  const coins = profile?.coins ?? 0;

  // Quest progress
  const [
    { count: reviewsToday },
    { count: feynmanToday },
    { count: sessionsToday },
  ] = await Promise.all([
    supabase
      .from("card_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("reviewed_at", `${today}T00:00:00`),
    supabase
      .from("feynman_explanations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("created_at", `${today}T00:00:00`),
    supabase
      .from("study_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("started_at", `${today}T00:00:00`),
  ]);

  const reviewProgress = Math.min(reviewsToday ?? 0, 20);
  const feynmanProgress = Math.min(feynmanToday ?? 0, 3);
  const studyMinutes = Math.min((sessionsToday ?? 0) * 25, 30);
  const allQuestsDone =
    reviewProgress >= 20 && feynmanProgress >= 3 && studyMinutes >= 30;
  const allQuestsZero = reviewProgress === 0 && feynmanProgress === 0 && studyMinutes === 0;

  // Friends feed
  const friendsFeed = await getFriendsFeed(supabase, user!.id);

  // Time-of-day context for briefing (server-side UTC hour is fine for a subtitle)
  const serverHour = new Date().getUTCHours();
  const cardsDueCount = cardsDue ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ═══ Section 1 — Daily Briefing ═══ */}
      <DailyBriefing cardsDue={cardsDueCount} hour={serverHour} />

      {/* ═══ Section 2 — Primary CTA ═══ */}
      <PrimaryCTA cardsDue={cardsDueCount} />

      {/* ═══ Section 3 — Stat Row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Large: Cards Due */}
        <StatTile
          icon="/sprites/travel-book/icons/Book.png"
          value={cardsDueCount}
          label="Cards due today"
          size="large"
        />
        {/* Large: Streak */}
        <StatTile
          icon="/sprites/travel-book/icons/PotionRed.png"
          value={streak}
          suffix={streak === 1 ? " day" : " days"}
          label="Current streak"
          size="large"
          zeroText={streak === 0 ? formatStreak(0, "home") : undefined}
        />
        {/* Small: XP */}
        <StatTile
          icon="/sprites/travel-book/icons/Sun.png"
          value={xpTotal}
          label="Total XP"
          size="small"
        />
        {/* Small: Coins */}
        <StatTile
          icon="/sprites/travel-book/icons/Coin.png"
          value={coins}
          label="Coins"
          size="small"
        />
      </div>

      {/* ═══ Section 4 — Today's Quests ═══ */}
      <DialogFrame title="TODAY'S QUESTS">
        {allQuestsDone ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <span className="font-pixel text-base text-[var(--pixel-success)]">
              All done today! 🎉
            </span>
            <div className="flex items-center gap-3 mt-1">
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
        ) : (
          <div className="flex flex-col md:flex-row md:items-stretch gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allQuestsZero && (
                <p className="sm:col-span-3 text-xs text-[var(--pixel-text-secondary)] text-center pb-1">
                  Fresh start — all quests ready
                </p>
              )}
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
            <div className="flex flex-row md:flex-col items-center justify-center gap-3 shrink-0 md:pl-4 md:border-l md:border-[var(--pixel-border)]">
              <span className="font-pixel text-[10px] text-[var(--pixel-text-secondary)]">
                REWARD
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
        )}
      </DialogFrame>

      {/* ═══ Section 5 — Friends Activity ═══ */}
      <FriendsActivity feed={friendsFeed} />

    </div>
  );
}

// ---------------------------------------------------------------------------
// Section sub-components
// ---------------------------------------------------------------------------

function DailyBriefing({ cardsDue, hour }: { cardsDue: number; hour: number }) {
  let subtitle: string;
  if (cardsDue === 0) {
    subtitle = "All caught up! A great day to explore something new.";
  } else if (hour < 12) {
    subtitle = `You have ${cardsDue} card${cardsDue === 1 ? "" : "s"} waiting. Let's start strong.`;
  } else if (hour < 18) {
    subtitle = `Still time to review those ${cardsDue} card${cardsDue === 1 ? "" : "s"}.`;
  } else {
    subtitle = `End the day right — ${cardsDue} card${cardsDue === 1 ? "" : "s"} to go.`;
  }

  return (
    <p className="text-sm text-[var(--pixel-text-secondary)] px-1">
      {subtitle}
    </p>
  );
}

function PrimaryCTA({ cardsDue }: { cardsDue: number }) {
  const hasDue = cardsDue > 0;
  return (
    <Link
      href={hasDue ? "/app/review" : "/app/feynman"}
      className="pixel-panel group flex items-center justify-between gap-4 p-5 transition-all hover:brightness-110"
      style={{ backgroundColor: "color-mix(in srgb, var(--pixel-accent) 18%, var(--pixel-bg-surface))" }}
    >
      <div className="flex items-center gap-4">
        <img
          src={hasDue ? "/sprites/travel-book/icons/Book.png" : "/sprites/travel-book/icons/Lightbulb.png"}
          alt=""
          width={40}
          height={40}
          className="pixel-art"
        />
        <span className="font-pixel text-base text-[var(--pixel-accent)]">
          {hasDue
            ? `Review Your ${cardsDue} Card${cardsDue === 1 ? "" : "s"}`
            : "Explore Feynman Mode"}
        </span>
      </div>
      <span className="text-[var(--pixel-accent)] text-2xl group-hover:translate-x-1 transition-transform">
        →
      </span>
    </Link>
  );
}

function FriendsActivity({ feed }: { feed: FriendsFeed }) {
  const ACTIVITY_ICONS: Record<FriendActivity["activityType"], string> = {
    review:  "/sprites/travel-book/icons/Book.png",
    feynman: "/sprites/travel-book/icons/Lightbulb.png",
    session: "/sprites/travel-book/icons/Trophy.png",
  };

  function describe(a: FriendActivity): string {
    switch (a.activityType) {
      case "review":  return `reviewed ${a.count} card${a.count === 1 ? "" : "s"} today`;
      case "feynman": return `completed ${a.count} Feynman session${a.count === 1 ? "" : "s"} today`;
      case "session": return `studied in ${a.count} session${a.count === 1 ? "" : "s"} today`;
    }
  }

  return (
    <div>
      <h2 className="font-pixel text-sm text-[var(--pixel-text-secondary)] mb-2 px-1">
        YOUR STUDY CIRCLE
        {feed.partyName && (
          <span className="ml-2 text-[var(--pixel-accent)]">— {feed.partyName}</span>
        )}
      </h2>

      <div className="pixel-panel p-0 overflow-hidden">
        {feed.activities.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <img
              src="/sprites/travel-book/icons/Team.png"
              alt=""
              width={32}
              height={32}
              className="pixel-art opacity-60"
            />
            <p className="text-sm text-[var(--pixel-text-secondary)]">
              No activity in your circle yet
            </p>
            <Link
              href="/app/party"
              className="font-pixel text-[11px] text-[var(--pixel-accent)] hover:underline"
            >
              Invite a friend to study together →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--pixel-border)]">
            {feed.activities.map((activity, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ backgroundColor: "var(--pixel-bg-surface)" }}
              >
                <img
                  src={ACTIVITY_ICONS[activity.activityType]}
                  alt=""
                  width={16}
                  height={16}
                  className="pixel-art shrink-0"
                />
                <span className="text-sm text-[var(--pixel-text-primary)]">
                  <span className="font-medium">{activity.displayName}</span>{" "}
                  <span className="text-[var(--pixel-text-secondary)]">
                    {describe(activity)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared tile / quest components
// ---------------------------------------------------------------------------

function StatTile({
  icon,
  value,
  suffix,
  label,
  size = "large",
  zeroText,
}: {
  icon: string;
  value: number;
  suffix?: string;
  label: string;
  size?: "large" | "small";
  zeroText?: string;
}) {
  const valueClass =
    size === "large"
      ? "font-pixel text-2xl text-[var(--pixel-accent)] block leading-none"
      : "font-pixel text-lg text-[var(--pixel-text-secondary)] block leading-none";

  return (
    <div className="pixel-panel flex items-center gap-3 p-3">
      <div className="shrink-0">
        <img
          src={icon}
          alt=""
          width={size === "large" ? 36 : 28}
          height={size === "large" ? 36 : 28}
          className="pixel-art"
        />
      </div>
      <div className="min-w-0">
        {zeroText ? (
          <span
            className="font-pixel text-sm block leading-snug"
            style={{ color: "var(--pixel-accent)" }}
          >
            {zeroText}
          </span>
        ) : (
          <PixelCounter
            value={value}
            suffix={suffix}
            className={valueClass}
          />
        )}
        <span
          className="text-xs block mt-1 truncate"
          style={{
            color:
              size === "large"
                ? "var(--pixel-text-secondary)"
                : "var(--pixel-text-muted)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

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
