import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DialogFrame, PixelCounter } from "@/components/pixel-ui";
import { formatStreak } from "@/lib/format-streak";
import { endOfUserLocalDay } from "@/lib/due";
import { computeStreak } from "@/lib/streak";

// ---------------------------------------------------------------------------
// PROPOSAL: Streak "at risk" visual cue (Part 3 — not implemented yet)
// ---------------------------------------------------------------------------
// When the user hasn't completed any activity today and it's past a configurable
// hour threshold (e.g. 6 PM local time), the streak counter is "at risk" of
// breaking. Below are 3 compassionate options (no punishment, no anxiety):
//
// Option A — Warm amber glow:
//   Apply a soft amber background-tint and the .animate-pixel-float class to
//   the streak AmbientStat icon only. Reads as "hey, your potion is floating
//   away!" — playful, not scary. No text change needed.
//
// Option B — Gentle tooltip nudge:
//   Wrap the streak stat in a hover/focus tooltip: "Keep it going? A quick
//   review is all it takes." No color change, no animation — just a friendly
//   reminder that appears on interaction. Least intrusive.
//
// Option C — Soft stepped pulse on the icon:
//   Apply .animate-pixel-blink (already exists — slow on/off at 0.8s) at
//   reduced intensity (opacity between 0.7–1.0 instead of 0.25–1.0). Creates
//   a subtle "breathing" on the potion icon. Pair with the suffix changing
//   from "3 days" to "3 days — keep going!" in muted text.
//
// Recommendation: Option B (tooltip) as default, with Option A available as
// a user preference ("Streak reminders: gentle / off") in Settings.
// ---------------------------------------------------------------------------

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
    .select("xp, coins, level, display_name, timezone")
    .eq("id", user!.id)
    .single();

  const now = new Date();
  const timezone = profile?.timezone ?? "UTC";
  const dueCutoff = endOfUserLocalDay(now, timezone);

  // Cards due (FSRS `due` column, timezone-aware cutoff)
  const { count: cardsDue } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .lte("due", dueCutoff.toISOString());

  const today = now.toISOString().split("T")[0];

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

  const streak = computeStreak(activityDates);

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

  // ── Companion context: what did the user struggle with / master recently? ──
  const { data: recentFeynman } = await supabase
    .from("feynman_explanations")
    .select("score, topics(name)")
    .eq("user_id", user!.id)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  let struggledTopic: string | null = null;
  let masteredTopic: string | null = null;
  for (const f of recentFeynman ?? []) {
    const topicName = (f.topics as unknown as { name: string } | null)?.name ?? null;
    const score = f.score as number;
    if (score < 50 && !struggledTopic && topicName) struggledTopic = topicName;
    if (score >= 80 && !masteredTopic && topicName) masteredTopic = topicName;
  }

  // Check if returning after a break (no activity for 2+ days before today)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date();
  dayBefore.setDate(dayBefore.getDate() - 2);
  const returningAfterBreak = !activityDates.has(yesterday.toISOString().split("T")[0]) && !activityDates.has(dayBefore.toISOString().split("T")[0]);

  // Check if exam within 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const { count: upcomingExams } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .not("exam_date", "is", null)
    .lte("exam_date", sevenDaysFromNow.toISOString().split("T")[0]);

  // Blooming count (for companion context — topics with high retrievability)
  // Quick estimate: count cards with stability > 10 as "blooming" (avoids re-running full memory-map)
  const { count: bloomingCards } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .gt("stability", 10);
  const bloomingCount = Math.min(Math.floor((bloomingCards ?? 0) / 5), 20); // rough topic estimate

  // Pet info for companion line
  const { data: petData } = await supabase
    .from("pets")
    .select("name")
    .eq("user_id", user!.id)
    .maybeSingle();
  const petName = (petData?.name as string) ?? "Buddy";

  // Generate companion dialogue
  const { getCompanionLine, getTimeOfDay } = await import("@/lib/companion-dialogue");
  const companionLine = getCompanionLine({
    timeOfDay: getTimeOfDay(serverHour),
    petName,
    struggledTopic,
    masteredTopic,
    examSoon: (upcomingExams ?? 0) > 0,
    cardsDue: cardsDueCount,
    streak,
    returningAfterBreak,
    bloomingCount,
    allQuestsDoneYesterday: false, // TODO: check yesterday's quests
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ═══ Section 1 — Welcome Home (the "Today" moment) ═══ */}
      <div className="space-y-3">
        <p className="font-pixel text-lg" style={{ color: "var(--pixel-text-primary)" }}>
          Welcome home.
        </p>

        {/* Companion voice */}
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">🐾</span>
          <div>
            <p className="text-sm italic" style={{ color: "var(--pixel-text-secondary)" }}>
              {companionLine}
            </p>
            <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
              — {petName}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Section 2 — Primary CTA ═══ */}
      <PrimaryCTA cardsDue={cardsDueCount} />

      {/* ═══ Section 3 — Stat Row ═══ */}
      {/* Prominent: Cards Due */}
      <StatTile
        icon="/sprites/travel-book/icons/Book.png"
        value={cardsDueCount}
        label="Memories to revisit"
        size="hero"
      />
      {/* Ambient strip: streak / XP / coins */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        <AmbientStat
          icon="/sprites/travel-book/icons/PotionRed.png"
          numericValue={streak > 0 ? streak : undefined}
          textValue={streak === 0 ? formatStreak(0, "home") : undefined}
          suffix={streak > 0 ? (streak === 1 ? " day" : " days") : undefined}
          label="Streak"
        />
        <span className="text-[var(--pixel-border)]">·</span>
        <AmbientStat
          icon="/sprites/travel-book/icons/Sun.png"
          numericValue={xpTotal}
          label="XP"
        />
        <span className="text-[var(--pixel-border)]">·</span>
        <AmbientStat
          icon="/sprites/travel-book/icons/Coin.png"
          numericValue={coins}
          label="Coins"
        />
      </div>

      {/* ═══ Section 4 — Today's Quests ═══ */}
      <div data-tour="quests">
      <DialogFrame title="TODAY'S JOURNEY">
        {allQuestsDone ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <span className="font-pixel text-base text-[var(--pixel-success)]">
              All done for today. You earned this.
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
                label="Revisit 20 memories"
                progress={reviewProgress}
                max={20}
                color="var(--pixel-success)"
              />
              <QuestItem
                icon="/sprites/travel-book/icons/Lightbulb.png"
                label="Explain 3 ideas"
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
      </div>

      {/* ═══ Section 5 — Friends Activity ═══ */}
      <FriendsActivity feed={friendsFeed} />

    </div>
  );
}

// ---------------------------------------------------------------------------
// Section sub-components
// ---------------------------------------------------------------------------

function PrimaryCTA({ cardsDue }: { cardsDue: number }) {
  const hasDue = cardsDue > 0;
  return (
    <Link
      href={hasDue ? "/app/review" : "/app/feynman"}
      data-tour="dashboard-cta"
      className="pixel-panel group flex items-center justify-between gap-4 transition-all hover:brightness-110"
      style={{ padding: "var(--pixel-panel-spacious)", backgroundColor: "color-mix(in srgb, var(--pixel-accent) 18%, var(--pixel-bg-surface))" }}
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
            ? `Revisit ${cardsDue} ${cardsDue === 1 ? "memory" : "memories"}`
            : "Explore something new"}
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
          <div className="flex flex-col items-center gap-2" style={{ padding: "var(--pixel-panel-compact)" }}>
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
  size?: "hero" | "large" | "small";
  zeroText?: string;
}) {
  const isHero = size === "hero";
  const valueClass = isHero
    ? "font-pixel text-2xl text-[var(--pixel-accent)] block leading-none"
    : size === "large"
      ? "font-pixel text-2xl text-[var(--pixel-accent)] block leading-none"
      : "font-pixel text-lg text-[var(--pixel-text-secondary)] block leading-none";

  return (
    <div
      className="pixel-panel flex items-center gap-3"
      style={{ padding: isHero ? "var(--pixel-panel-standard)" : "var(--pixel-panel-compact)" }}
    >
      <div className="shrink-0">
        <img
          src={icon}
          alt=""
          width={isHero ? 40 : size === "large" ? 36 : 28}
          height={isHero ? 40 : size === "large" ? 36 : 28}
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
              size === "small"
                ? "var(--pixel-text-muted)"
                : "var(--pixel-text-secondary)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function AmbientStat({
  icon,
  numericValue,
  textValue,
  suffix,
  label,
}: {
  icon: string;
  numericValue?: number;
  textValue?: string;
  suffix?: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <img src={icon} alt="" width={16} height={16} className="pixel-art" />
      {numericValue !== undefined ? (
        <PixelCounter
          value={numericValue}
          suffix={suffix}
          className="font-pixel text-xs text-[var(--pixel-text-secondary)]"
        />
      ) : (
        <span className="font-pixel text-xs text-[var(--pixel-text-secondary)]">
          {textValue}{suffix ?? ""}
        </span>
      )}
      <span className="text-[10px] text-[var(--pixel-text-muted)]">{label}</span>
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
    <div className="pixel-panel pixel-panel-inset" style={{ padding: "var(--pixel-panel-compact)" }}>
      <div className="flex items-center gap-2 mb-2">
        <img src={icon} alt="" width={16} height={16} className="pixel-art" />
        <span className="text-xs text-[var(--pixel-text-primary)] font-medium">
          {label}
        </span>
      </div>
      <div className="w-full overflow-hidden bg-[var(--pixel-bg-primary)] border-2 border-[var(--pixel-border)]" style={{ height: "10px" }}>
        <div
          className="h-full transition-all animate-pixel-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[var(--pixel-text-secondary)] block text-right mt-1">
        {progress} / {max}
      </span>
    </div>
  );
}
