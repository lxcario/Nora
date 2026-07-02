/**
 * Study Router — picks the single best next action for the student.
 *
 * Pure function. No database, no network, no side effects.
 * Takes the context the dashboard already computes and returns one
 * recommendation: where to go, what the companion says about it, and
 * which icon to show.
 *
 * Priority ladder (first match wins):
 *   1. Cards fading + exam soon → review (urgent)
 *   2. Cards fading (>5 due) → review
 *   3. Struggled topic recently → revisit via Feynman
 *   4. Cards due (1-5) → gentle review nudge
 *   5. Feynman quota not hit today → explain something
 *   6. Returning after break → easy re-entry (review if cards, else feynman)
 *   7. All quests done → explore (research desk)
 *   8. Default → feynman (the core act)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudyRouterContext {
  cardsDue: number;
  examSoon: boolean;
  struggledTopic: string | null;
  masteredTopic: string | null;
  feynmanProgressToday: number;
  reviewProgressToday: number;
  returningAfterBreak: boolean;
  allQuestsDone: boolean;
  streak: number;
}

export interface StudyAction {
  /** Route to navigate to */
  href: string;
  /** Companion-voiced label for the CTA button */
  label: string;
  /** Short reason shown below the CTA (what the companion is thinking) */
  reason: string;
  /** Sprite icon path */
  icon: string;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function getNextStudyAction(ctx: StudyRouterContext): StudyAction {
  // 1. Urgent: exam approaching + cards fading
  if (ctx.examSoon && ctx.cardsDue > 0) {
    return {
      href: "/app/review",
      label: `Revisit ${ctx.cardsDue} ${ctx.cardsDue === 1 ? "memory" : "memories"} before your exam`,
      reason: "Your exam is close. Let's make sure nothing fades.",
      icon: "/sprites/travel-book/icons/Book.png",
    };
  }

  // 2. Significant review load
  if (ctx.cardsDue > 5) {
    return {
      href: "/app/review",
      label: `${ctx.cardsDue} memories need revisiting`,
      reason: "A few are starting to dim. A short session keeps them safe.",
      icon: "/sprites/travel-book/icons/Book.png",
    };
  }

  // 3. Struggled topic — nudge toward re-explaining
  if (ctx.struggledTopic && ctx.feynmanProgressToday < 3) {
    return {
      href: "/app/feynman",
      label: `Revisit ${ctx.struggledTopic}`,
      reason: "Last time was rough. Try explaining it fresh — see what clicks now.",
      icon: "/sprites/travel-book/icons/Lightbulb.png",
    };
  }

  // 4. Small review load (1-5 cards)
  if (ctx.cardsDue > 0) {
    return {
      href: "/app/review",
      label: `${ctx.cardsDue} ${ctx.cardsDue === 1 ? "memory is" : "memories are"} fading`,
      reason: "Quick session — won't take long.",
      icon: "/sprites/travel-book/icons/Book.png",
    };
  }

  // 5. Haven't explained anything today yet
  if (ctx.feynmanProgressToday === 0) {
    return {
      href: "/app/feynman",
      label: "Explain something you're learning",
      reason: "No explanations yet today. Teaching is how you find the gaps.",
      icon: "/sprites/travel-book/icons/Lightbulb.png",
    };
  }

  // 6. Returning after a break — gentle re-entry
  if (ctx.returningAfterBreak) {
    return {
      href: "/app/feynman",
      label: "Welcome back — let's start easy",
      reason: "Pick any topic. No pressure, just warming up.",
      icon: "/sprites/travel-book/icons/Lightbulb.png",
    };
  }

  // 7. All quests done today — celebrate + suggest exploration
  if (ctx.allQuestsDone) {
    return {
      href: "/app/research",
      label: "Explore something new",
      reason: "All done for today. A good time to dig into something curious.",
      icon: "/sprites/travel-book/icons/Trophy.png",
    };
  }

  // 8. Default: feynman (the core cognitive act)
  return {
    href: "/app/feynman",
    label: "Explain something you're learning",
    reason: "The best way to find what you don't know yet.",
    icon: "/sprites/travel-book/icons/Lightbulb.png",
  };
}
