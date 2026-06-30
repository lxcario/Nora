// ---------------------------------------------------------------------------
// Companion Dialogue Engine
// ---------------------------------------------------------------------------
// Generates contextual one-liners from the pet companion based on the user's
// recent activity. Not AI-generated — handwritten lines with a warm, curious,
// never-childish personality. The companion remembers, celebrates, and gently
// encourages.
//
// Voice guide:
//   - Warm, never childish
//   - Encouraging, never guilt-inducing
//   - Curious, never authoritative
//   - Honest about uncertainty
//   - Celebrates progress, not perfection
//   - Uses "we" and "us" — studying together
// ---------------------------------------------------------------------------

export interface CompanionContext {
  /** 'morning' | 'afternoon' | 'evening' | 'night' */
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  /** Pet's display name */
  petName: string;
  /** The topic the user struggled with most recently (lowest recent Feynman score) */
  struggledTopic: string | null;
  /** A topic mastered today (score >= 80 on latest attempt) */
  masteredTopic: string | null;
  /** Whether the user has an exam within 7 days */
  examSoon: boolean;
  /** Number of cards due today */
  cardsDue: number;
  /** Current study streak in days */
  streak: number;
  /** Whether the user returned after 2+ days away */
  returningAfterBreak: boolean;
  /** Number of flowers blooming in memory garden (R > 0.85) */
  bloomingCount: number;
  /** Whether user completed all quests yesterday */
  allQuestsDoneYesterday: boolean;
}

type DialogueLine = {
  condition: (ctx: CompanionContext) => boolean;
  weight: number;
  line: (ctx: CompanionContext) => string;
};

const DIALOGUE_RULES: DialogueLine[] = [
  // ── Returning after a break (highest priority) ──────────────────────────
  {
    condition: (ctx) => ctx.returningAfterBreak,
    weight: 100,
    line: () => "Welcome back. I missed studying with you.",
  },
  {
    condition: (ctx) => ctx.returningAfterBreak && ctx.cardsDue > 10,
    weight: 95,
    line: () => "You're here. That's what matters. Let's start slow.",
  },

  // ── Struggled topic memory ──────────────────────────────────────────────
  {
    condition: (ctx) => ctx.struggledTopic !== null,
    weight: 80,
    line: (ctx) => `I remember ${ctx.struggledTopic} gave us trouble. Want to revisit it?`,
  },
  {
    condition: (ctx) => ctx.struggledTopic !== null,
    weight: 75,
    line: (ctx) => `${ctx.struggledTopic} is still growing. That's okay — it takes time.`,
  },

  // ── Mastered topic celebration ──────────────────────────────────────────
  {
    condition: (ctx) => ctx.masteredTopic !== null,
    weight: 90,
    line: (ctx) => `We finally figured out ${ctx.masteredTopic}.`,
  },
  {
    condition: (ctx) => ctx.masteredTopic !== null,
    weight: 85,
    line: (ctx) => `${ctx.masteredTopic} is becoming clearer. I can tell.`,
  },

  // ── Exam approaching ───────────────────────────────────────────────────
  {
    condition: (ctx) => ctx.examSoon,
    weight: 70,
    line: () => "Your exam is close. You've been preparing well.",
  },
  {
    condition: (ctx) => ctx.examSoon && ctx.cardsDue > 0,
    weight: 72,
    line: () => "Let's make sure nothing fades before your exam.",
  },

  // ── Cards due (as memories, not tasks) ──────────────────────────────────
  {
    condition: (ctx) => ctx.cardsDue > 0 && ctx.cardsDue <= 5,
    weight: 50,
    line: () => "A few memories are beginning to fade. Shall we revisit them?",
  },
  {
    condition: (ctx) => ctx.cardsDue > 5 && ctx.cardsDue <= 20,
    weight: 50,
    line: (ctx) => `${ctx.cardsDue} memories could use a visit today.`,
  },
  {
    condition: (ctx) => ctx.cardsDue > 20,
    weight: 50,
    line: () => "There's a lot to revisit. Let's take it one at a time.",
  },
  {
    condition: (ctx) => ctx.cardsDue === 0,
    weight: 60,
    line: () => "All caught up. A good day to explore something new.",
  },

  // ── Streak ─────────────────────────────────────────────────────────────
  {
    condition: (ctx) => ctx.streak >= 7,
    weight: 40,
    line: (ctx) => `${ctx.streak} days of growing together. Quietly proud.`,
  },
  {
    condition: (ctx) => ctx.streak >= 3 && ctx.streak < 7,
    weight: 35,
    line: () => "You've been showing up. That matters more than you think.",
  },

  // ── Memory garden ──────────────────────────────────────────────────────
  {
    condition: (ctx) => ctx.bloomingCount >= 3,
    weight: 45,
    line: (ctx) => `${ctx.bloomingCount} flowers blooming in your garden.`,
  },
  {
    condition: (ctx) => ctx.bloomingCount === 0 && ctx.cardsDue > 0,
    weight: 30,
    line: () => "Your garden needs tending. Nothing a review session won't fix.",
  },

  // ── All quests done yesterday ──────────────────────────────────────────
  {
    condition: (ctx) => ctx.allQuestsDoneYesterday,
    weight: 55,
    line: () => "Yesterday was a full day. You earned today's pace.",
  },

  // ── Time-of-day greetings (fallback / low priority) ────────────────────
  {
    condition: (ctx) => ctx.timeOfDay === "morning",
    weight: 20,
    line: () => "Good morning. Ready to learn something new?",
  },
  {
    condition: (ctx) => ctx.timeOfDay === "afternoon",
    weight: 20,
    line: () => "Good afternoon. Still time to grow today.",
  },
  {
    condition: (ctx) => ctx.timeOfDay === "evening",
    weight: 20,
    line: () => "Evening. A calm time to review what you know.",
  },
  {
    condition: (ctx) => ctx.timeOfDay === "night",
    weight: 20,
    line: () => "Late night studying? I'll keep you company.",
  },
];

/**
 * Picks the best companion dialogue line for the current context.
 * Filters eligible rules, picks the highest-weight one (with slight randomness
 * to avoid repetition across sessions).
 */
export function getCompanionLine(ctx: CompanionContext): string {
  const eligible = DIALOGUE_RULES.filter((r) => r.condition(ctx));

  if (eligible.length === 0) {
    return "I'm here. Whenever you're ready.";
  }

  // Sort by weight descending, then pick from top 3 with randomness
  eligible.sort((a, b) => b.weight - a.weight);
  const topCandidates = eligible.slice(0, Math.min(3, eligible.length));
  const picked = topCandidates[Math.floor(Math.random() * topCandidates.length)];

  return picked.line(ctx);
}

/**
 * Determines time-of-day from a UTC hour + timezone offset.
 * For server-side use where we know the user's timezone.
 */
export function getTimeOfDay(hour: number): CompanionContext["timeOfDay"] {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
