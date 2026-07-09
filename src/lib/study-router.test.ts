/**
 * Tests for src/lib/study-router.ts
 *
 * Table-driven coverage of the priority ladder (first match wins), with a
 * focus on the new mastery-celebration rule (Req 3) and that it sits in the
 * right place in the precedence order.
 */

import { describe, it, expect } from "vitest";
import { getNextStudyAction, type StudyRouterContext } from "./study-router";

// A neutral context that, on its own, falls through to the default action:
// nothing due, no exam, no struggled/mastered topic, already explained today.
const base: StudyRouterContext = {
  cardsDue: 0,
  examSoon: false,
  struggledTopic: null,
  masteredTopic: null,
  feynmanProgressToday: 2,
  returningAfterBreak: false,
  allQuestsDone: false,
  streak: 0,
};

const ctx = (overrides: Partial<StudyRouterContext>): StudyRouterContext => ({
  ...base,
  ...overrides,
});

describe("getNextStudyAction — priority ladder (href routing)", () => {
  const cases: Array<{ name: string; input: StudyRouterContext; href: string }> = [
    {
      name: "1. exam soon + cards due → review (urgent)",
      input: ctx({ examSoon: true, cardsDue: 3 }),
      href: "/app/review",
    },
    {
      name: "2. many cards due (>5) → review",
      input: ctx({ cardsDue: 8 }),
      href: "/app/review",
    },
    {
      name: "3. struggled topic (quota not hit) → feynman",
      input: ctx({ struggledTopic: "Thermodynamics", feynmanProgressToday: 0 }),
      href: "/app/feynman",
    },
    {
      name: "4. small review load (1-5) → review",
      input: ctx({ cardsDue: 3 }),
      href: "/app/review",
    },
    {
      name: "5. nothing explained today → feynman",
      input: ctx({ feynmanProgressToday: 0 }),
      href: "/app/feynman",
    },
    {
      name: "6. mastered a topic (nothing due, explained) → eureka",
      input: ctx({ masteredTopic: "Calculus", feynmanProgressToday: 2 }),
      href: "/app/eureka",
    },
    {
      name: "7. returning after break → feynman",
      input: ctx({ returningAfterBreak: true }),
      href: "/app/feynman",
    },
    {
      name: "8. all quests done → research",
      input: ctx({ feynmanProgressToday: 3, allQuestsDone: true }),
      href: "/app/research",
    },
    {
      name: "9. default → feynman",
      input: base,
      href: "/app/feynman",
    },
  ];

  it.each(cases)("$name", ({ input, href }) => {
    expect(getNextStudyAction(input).href).toBe(href);
  });
});

describe("getNextStudyAction — mastery rule specifics", () => {
  it("names the mastered topic in label and reason", () => {
    const action = getNextStudyAction(ctx({ masteredTopic: "Linear Algebra" }));
    expect(action.href).toBe("/app/eureka");
    expect(action.label).toContain("Linear Algebra");
    expect(action.reason).toContain("Linear Algebra");
  });

  it("includes the streak when it's meaningful (>1)", () => {
    const action = getNextStudyAction(ctx({ masteredTopic: "Optics", streak: 7 }));
    expect(action.reason).toContain("7-day streak");
  });

  it("omits streak note when streak is 0 or 1", () => {
    expect(getNextStudyAction(ctx({ masteredTopic: "Optics", streak: 1 })).reason)
      .not.toContain("streak");
  });
});

describe("getNextStudyAction — mastery precedence", () => {
  it("does NOT fire when an exam is soon (guarded by !examSoon)", () => {
    // exam soon + no cards due + mastered topic → mastery is skipped, falls to default
    const action = getNextStudyAction(
      ctx({ examSoon: true, masteredTopic: "Calculus", feynmanProgressToday: 2 })
    );
    expect(action.href).toBe("/app/feynman");
  });

  it("does NOT fire when cards are due (review takes precedence)", () => {
    const action = getNextStudyAction(ctx({ cardsDue: 2, masteredTopic: "Calculus" }));
    expect(action.href).toBe("/app/review");
  });

  it("yields to a struggled topic (struggle is addressed before celebration)", () => {
    const action = getNextStudyAction(
      ctx({ struggledTopic: "Optics", masteredTopic: "Calculus", feynmanProgressToday: 1 })
    );
    expect(action.href).toBe("/app/feynman");
    expect(action.label).toContain("Optics");
  });
});
