# Nora — Deep UX Audit + Improvement Spec
> Paste this entire prompt to your AI agent as the task brief.

---

## MISSION

You are conducting a **deep UX audit of Nora** — a cozy, gamified study companion app. Your job is to read every page in the app, evaluate the user experience against Nora's emotional promise, and produce two deliverables:

1. **A UX Audit Report** — every problem found, scored by severity
2. **A UX Improvement Spec** — prioritized tasks to fix them, ready to implement

This is analysis and documentation only. **Do not modify any source files.**

---

## NORA'S EMOTIONAL PROMISE

Every UX decision must be evaluated against this north star:

> *"A cozy, social, motivating study companion. Students feel oriented, encouraged, and connected — never overwhelmed, punished, or confused."*

The three pillars:
- **Cozy** — warm, safe, never harsh. No punishment for missed days. No anxiety-inducing UI.
- **Social** — friends are visible and ambient. Studying feels shared, not solitary.
- **Motivating** — clear daily intent. Progress is always visible. Small wins feel rewarding.

Any UI pattern that contradicts these pillars is a UX problem, regardless of how well it's coded.

---

## PHASE 1 — CODEBASE ORIENTATION (do this before any analysis)

Read these files first to understand the full app structure:

```
src/app/(protected)/app/layout.tsx          ← root layout, prop passing
src/app/(protected)/app/_components/        ← all shared components (read every file)
src/components/pixel-ui/                    ← full pixel component library (read every file)
src/lib/                                    ← utilities, SM-2, LLM, formatStreak, etc.
```

Then read every page file in order:

```
src/app/(protected)/app/page.tsx                    ← Homepage
src/app/(protected)/app/review/page.tsx             ← Review Cards (SM-2 flashcard review)
src/app/(protected)/app/study/page.tsx              ← Study Mix
src/app/(protected)/app/feynman/page.tsx            ← Feynman Mode
src/app/(protected)/app/research/page.tsx           ← Research Desk
src/app/(protected)/app/study-room/page.tsx         ← Video Study Room
src/app/(protected)/app/planner/page.tsx            ← Study Planner
src/app/(protected)/app/academic/page.tsx           ← My University
src/app/(protected)/app/analytics/page.tsx          ← Analytics
src/app/(protected)/app/history/page.tsx            ← History
src/app/(protected)/app/room/page.tsx               ← Pixel Room
src/app/(protected)/app/party/page.tsx              ← Friends / Study Circle
src/app/(protected)/app/collection/page.tsx         ← Collection
src/app/(protected)/app/settings/page.tsx           ← Settings
src/app/(protected)/app/onboarding/page.tsx         ← Onboarding wizard (if exists)
```

For each page, also read its `_components/` subdirectory if one exists.

Read the Supabase types file to understand the data model:
```
src/lib/supabase/types.ts   (or database.types.ts — find the correct filename)
```

---

## PHASE 2 — UX AUDIT

After reading every page, produce a structured audit report. Evaluate each page against the framework below.

### Audit Framework

For every page, assess these 8 dimensions:

**1. First Impression (0–10)**
What does a new user see the first time they visit this page? Is the purpose immediately clear? Is there a useful empty state or does it show a broken/blank experience?

**2. Task Clarity (0–10)**
Is it obvious what the user is supposed to do on this page? Is the primary action prominent? Are secondary actions visually subordinate?

**3. Emotional Tone (0–10)**
Does this page feel cozy and encouraging, or clinical and transactional? Does any element create anxiety, confusion, or a sense of failure?

**4. Feedback & Response (0–10)**
Does the user get clear feedback after actions? Loading states, success confirmations, error messages — are they present, clear, and warm in tone?

**5. Empty States (0–10)**
When a user has no data (no cards, no friends, no history), what do they see? Empty states should guide, not abandon.

**6. Navigation & Wayfinding (0–10)**
Can the user easily understand where they are, how they got here, and where they can go? Are breadcrumbs, back links, or contextual navigation present where needed?

**7. Mobile Responsiveness (0–10)**
Does the layout degrade gracefully on small screens? Are touch targets large enough? Does the bottom nav work correctly?

**8. Consistency (0–10)**
Does this page use the same component patterns, spacing, typography, and tone as the rest of the app? Any deviation should be flagged.

### Severity Classification

For every problem found, classify it:

- **P0 — Critical**: Breaks the core loop or causes confusion on first use. Fix before any demo.
- **P1 — High**: Significantly hurts the emotional promise. Fix before shipping.
- **P2 — Medium**: Noticeable friction but workaround exists. Fix in next sprint.
- **P3 — Low**: Polish item. Fix when time allows.

### Cross-Page UX Patterns to Specifically Look For

While reading the codebase, actively hunt for these known failure modes:

**Empty state failures**
- Pages that render nothing (blank div, null) when the user has no data
- Missing onboarding prompts on first visit to a feature
- Tables or lists with no "no results" message

**Zero/null state displays**
- Any number displayed as "0" when it should be encouraging copy (like the streak fix)
- Any percentage, score, or metric shown as "0%" or "0/0" on first use
- Progress bars at 0% with no context

**Tone failures**
- Error messages written in technical language ("Error: 500", "undefined", "fetch failed")
- Destructive actions (delete, leave group) with no confirmation dialog
- Punishment-adjacent copy ("You haven't studied today", "Streak lost", "No activity")

**Navigation dead ends**
- Pages with no clear "back" or "next" path
- Features that can only be reached from one specific place
- Breadcrumbs missing on deeply nested pages

**Loading state gaps**
- Actions that fire with no loading indicator (buttons that appear frozen)
- Pages that fetch data with no skeleton/spinner
- Optimistic UI patterns missing (card review updates should feel instant)

**Onboarding gaps**
- Features that require setup but don't guide the user to complete it
- Pages that are useful only after onboarding is done but are accessible before it
- Tooltip or callout systems that are missing for non-obvious features

**Mobile-specific issues**
- Elements that overflow on small screens
- Tap targets smaller than 44×44px
- Modals or dialogs that don't scroll on mobile

**Gamification tone**
- Any mechanic that punishes instead of redirecting
- XP/coin displays that feel pointless (no shop, no purpose explained)
- Level display with no explanation of what leveling up unlocks

---

## PHASE 3 — AUDIT REPORT FORMAT

Produce the audit report as a Markdown file at:
```
.kiro/specs/ux-audit/audit-report.md
```

Structure it exactly as follows:

```markdown
# Nora UX Audit Report

## Executive Summary
[3–5 sentence summary of the overall UX health. What's working well. What's the most urgent category of problem.]

## Overall Scores

| Page | First Imp. | Task Clarity | Emotional Tone | Feedback | Empty States | Wayfinding | Mobile | Consistency | AVG |
|---|---|---|---|---|---|---|---|---|---|
| Homepage | x | x | x | x | x | x | x | x | x.x |
| Review Cards | ... |
[complete table for all pages]

## Critical Issues (P0)
[List every P0 issue found across all pages]

### [ISSUE-001] [Issue title]
- **Page:** [which page]
- **Severity:** P0
- **What happens:** [describe the broken experience]
- **Why it matters:** [connection to the emotional promise]
- **Recommended fix:** [specific, actionable]

[repeat for each P0 issue]

## High Priority Issues (P1)
[Same format as P0 section]

## Medium Priority Issues (P2)
[Same format]

## Low Priority Issues (P3)
[Same format — can be briefer]

## What's Working Well
[Honest list of UX patterns done right — don't skip this]

## Page-by-Page Detailed Notes
[For each page: a paragraph of detailed observations beyond what the score table captures]
```

---

## PHASE 4 — UX IMPROVEMENT SPEC

After completing the audit report, produce an improvement spec at:
```
.kiro/specs/ux-audit/improvement-spec.md
```

Structure it as follows:

```markdown
# Nora UX Improvement Spec

## Scope
UI-only changes. No new routes, no schema migrations, no server actions unless absolutely required for an empty state fix. Every task must be independently committable.

## Priority Queue

### SPRINT 1 — Pre-Demo (P0 fixes only)
[Tasks that must be done before any hackathon demo]

#### Task UX-001: [Title]
- **Fixes issue:** ISSUE-XXX
- **Files to modify:** [list]
- **What to change:** [specific, implementable instruction]
- **Acceptance criteria:** [testable condition]
- **Estimated effort:** [S / M / L]

[repeat for each P0 fix]

### SPRINT 2 — Pre-Ship (P1 fixes)
[Tasks that must be done before launch]

[same task format]

### SPRINT 3 — Polish (P2 + P3 fixes)
[Nice-to-have improvements]

[same task format]

## Empty State Catalog
[A complete list of every empty state in the app with: current behavior, recommended behavior, and example copy]

| Page / Component | Current empty state | Recommended empty state | Suggested copy |
|---|---|---|---|

## Error Message Catalog
[Every error message in the app with: current text, recommended text]

| Location | Current message | Recommended message |
|---|---|---|

## Tone & Copy Consistency Rules
[Derived from the audit — rules for writing copy that the whole app should follow]

1. [Rule]
2. [Rule]
...
```

---

## QUALITY REQUIREMENTS FOR THE OUTPUT

The audit report must:
- Cover **every page** listed in Phase 1 — no page skipped
- Include **at least one observation per dimension** per page (don't leave blanks)
- Flag **every empty state** in the app, not just broken ones
- Be **specific** — cite actual component names, prop values, copy strings from the code
- Be **honest** — if a page is genuinely well done, say so and explain why

The improvement spec must:
- Be **directly implementable** — an agent reading it should be able to execute each task without ambiguity
- Respect the **no schema / no routes** constraint unless explicitly called out
- Include **acceptance criteria** for every task — not vague goals but testable conditions
- Reference the audit report issue IDs (ISSUE-001, etc.) so tasks trace back to findings

---

## CONSTRAINTS

- **Do not modify any source files** — this is analysis only
- **Do not run the app** — analyze from code only
- **Do not install packages**
- **Do not make assumptions** about how something looks — if you can't tell from the code, flag it as "needs visual verification" in the report
- **Do not skip pages** — every route must be audited

---

## EXECUTION ORDER

```
1. Read all orientation files (_components/, pixel-ui/, lib/)
2. Read pages in order — homepage first, settings last
3. Take notes per page as you read (don't try to hold it all in context)
4. Write audit-report.md
5. Write improvement-spec.md
6. Do NOT commit — leave both files as untracked for human review
```

Report your findings honestly. Nora's emotional promise is the benchmark. If something doesn't serve a cozy, social, motivating experience — it's a problem, regardless of how well the code is written.
