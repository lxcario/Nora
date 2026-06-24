# Feature Spec: Study Streaks Dashboard Widget

> **Purpose:** The primary new feature built during TestSprite Hackathon S3 build week (June 30 – July 7, 2026). Designed to touch shared components, gamification, and the dashboard — maximizing cross-feature regression potential for the TestSprite verification loop.

---

## 1. Overview

A **Streaks & Consistency** widget on the dashboard that shows the user's current streak, best streak, weekly consistency heatmap (mini), and a motivational "streak shield" mechanic — all styled with the pixel-art UI system.

**Why this feature:**
- Touches `layout.tsx` (shared shell) — high regression potential
- Touches gamification (`rewardAction`, XP/coins) — connects to existing flows
- Touches the dashboard `page.tsx` — the first thing every user sees
- Adds new UI components to `pixel-ui/` — tests rendering
- Adds a new server action — tests data flow
- Small enough to ship in 2-3 days, visible enough to impress judges
- Creates testable user flows for TestSprite (streak display, shield activation, consistency tracking)

---

## 2. User Story

> As a student using Nora, I want to see my study streak prominently on the dashboard, understand my weekly consistency pattern at a glance, and know I have a "shield" that protects my streak if I miss one day — so I feel motivated without anxiety.

---

## 3. Design

### 3.1 Widget Layout (Dashboard)

```
┌─────────────────────────────────────────────────────┐
│  🔥 STREAK                                          │
│                                                      │
│  ┌──────────┐   Current: 7 days                     │
│  │  pixel   │   Best:    14 days                    │
│  │  flame   │   Shield:  1 remaining ◆             │
│  │  sprite  │                                       │
│  └──────────┘                                       │
│                                                      │
│  ┌─Mon─┬─Tue─┬─Wed─┬─Thu─┬─Fri─┬─Sat─┬─Sun─┐      │
│  │ ██  │ ██  │ ██  │ ░░  │ ░░  │ ░░  │ ░░  │      │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘      │
│         This week's consistency                      │
└─────────────────────────────────────────────────────┘
```

### 3.2 Streak Shield Mechanic

- Users earn 1 **Streak Shield** for every 7 consecutive days studied
- A shield auto-activates when you miss a day, preserving the streak
- Maximum 3 shields banked at once
- When a shield is used, the day shows a "shield" icon instead of empty in the heatmap
- Shields cost nothing — they're earned through consistency, rewarding sustained effort

**Design philosophy alignment:** Compassionate design — no punishment, just protection earned through real effort.

### 3.3 Visual States

| State | Visual |
|-------|--------|
| Active day (studied) | Filled pixel square (accent color, `var(--pixel-accent)`) |
| Missed day (no shield) | Empty pixel square (border only, muted) |
| Shielded day | Shield icon pixel sprite (gold/amber) |
| Today (not yet studied) | Pulsing/breathing pixel square (subtle opacity animation) |
| Future days | Hidden or very faint dots |

### 3.4 Streak Milestones

| Streak | Reward | Visual |
|--------|--------|--------|
| 3 days | +5 bonus coins | Flame sprite size 1x |
| 7 days | +1 streak shield, +10 coins | Flame sprite size 2x |
| 14 days | +20 coins, pet affinity +10 | Flame sprite with sparkles |
| 30 days | +50 coins, exclusive badge | Golden flame sprite |

---

## 4. Technical Design

### 4.1 Data Model

No new migration needed. Uses existing data:
- `study_sessions.started_at` — session activity dates
- `card_reviews.reviewed_at` — review activity dates
- `profiles.xp`, `profiles.coins` — for milestone rewards

**New column (migration 017):**
```sql
ALTER TABLE profiles
  ADD COLUMN streak_shields integer NOT NULL DEFAULT 0,
  ADD COLUMN best_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN streak_shield_used_dates text[] DEFAULT '{}';
```

### 4.2 Pure Module: `src/lib/streak-shields.ts`

```typescript
/**
 * Streak shield logic — pure module, no DB, no side effects.
 *
 * Rules:
 *   - 1 shield earned per 7 consecutive study days
 *   - Max 3 shields banked
 *   - Shield auto-activates on missed day
 *   - Shield preserves the streak counter
 */

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  shieldsAvailable: number;
  shieldUsedDates: string[]; // YYYY-MM-DD[]
  weekConsistency: DayStatus[];
}

export type DayStatus = "studied" | "missed" | "shielded" | "today" | "future";

export function computeStreakState(
  activityDates: Set<string>,
  shieldUsedDates: string[],
  existingShields: number,
  bestStreak: number,
  today: Date
): StreakState { ... }

export function shouldEarnShield(currentStreak: number, existingShields: number): boolean {
  return currentStreak > 0 && currentStreak % 7 === 0 && existingShields < 3;
}

export function computeWeekConsistency(
  activityDates: Set<string>,
  shieldUsedDates: string[],
  today: Date
): DayStatus[] { ... }
```

### 4.3 Server Action: `src/app/(protected)/app/_actions/streaks.ts`

```typescript
"use server";

export interface StreakWidgetData {
  currentStreak: number;
  bestStreak: number;
  shieldsAvailable: number;
  weekConsistency: DayStatus[];
  milestoneReached: number | null; // 3, 7, 14, 30 or null
}

export async function getStreakWidgetData(): Promise<StreakWidgetData> { ... }

export async function processStreakShield(): Promise<{ used: boolean; error?: string }> { ... }
```

### 4.4 UI Component: `src/components/pixel-ui/streak-widget.tsx`

Client component wrapping the widget visuals:
- Pixel flame sprite (sized by streak tier)
- Streak counter with pixel font
- Shield indicator (pixel diamond sprites)
- Mini week heatmap (7 colored squares)
- Milestone toast on achievement

### 4.5 Dashboard Integration: `src/app/(protected)/app/page.tsx`

Insert the widget between Section 2 (Primary CTA) and Section 3 (Stat Row):
```tsx
{/* ═══ Section 2.5 — Streak Widget ═══ */}
<StreakWidget data={streakData} />
```

This is the key integration point — it touches `page.tsx` which is the core dashboard. Any layout changes here can cascade to other elements.

---

## 5. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/lib/streak-shields.ts` | Pure streak shield logic |
| `src/lib/streak-shields.test.ts` | Unit tests (property-based with fast-check) |
| `src/app/(protected)/app/_actions/streaks.ts` | Server action for streak data |
| `src/components/pixel-ui/streak-widget.tsx` | Client component |
| `supabase/migrations/017_streak_shields.sql` | DB column additions |

### Modified Files
| File | Change | Regression Risk |
|------|--------|-----------------|
| `src/app/(protected)/app/page.tsx` | Add StreakWidget to dashboard | **HIGH** — touches layout flow |
| `src/app/(protected)/app/layout.tsx` | Pass streak data to shell (if needed) | **HIGH** — shared across all pages |
| `src/components/pixel-ui/index.ts` | Export new component | LOW |
| `src/app/(protected)/app/_actions/gamification.ts` | Award shields on milestone | MEDIUM |
| `src/lib/streak.ts` | Integrate shield-aware computation | MEDIUM |

---

## 6. Test Plan (Unit Tests)

Add to `src/lib/streak-shields.test.ts`:

```typescript
describe("streak-shields", () => {
  // SHIELD-1: shield earned every 7 days
  it("earns a shield at streak 7, 14, 21", () => { ... });

  // SHIELD-2: max 3 shields
  it("never exceeds 3 shields", () => { ... });

  // SHIELD-3: shield preserves streak on missed day
  it("uses a shield instead of breaking streak", () => { ... });

  // SHIELD-4: no shield = streak resets
  it("resets streak when no shield available and day missed", () => { ... });

  // SHIELD-5: week consistency array is correct
  it("returns 7-element array with correct statuses", () => { ... });

  // SHIELD-6: best streak tracks maximum
  it("best streak only increases, never decreases", () => { ... });

  // SHIELD-7: property-based — shields <= 3 for any history
  it.prop("shields never exceed 3", fc.array(...), (history) => { ... });
});
```

---

## 7. TestSprite Test Flows (Hackathon Loop Material)

These are the TestSprite frontend tests to create during build week:

| # | Test Plan | What it verifies |
|---|-----------|-----------------|
| 1 | Dashboard loads with streak widget visible | Widget renders, flame sprite loads |
| 2 | Streak counter displays correct number | Data flows from server to UI |
| 3 | Week heatmap shows 7 day cells | Layout correctness |
| 4 | Shield indicator shows diamond sprites | Gamification visual |
| 5 | Streak at 0 shows encouraging message | Edge case / empty state |
| 6 | After completing a review, streak updates | End-to-end data flow |

**Expected regression points (the golden material for LOOP.md):**
- Adding the widget to `page.tsx` may shift the layout of existing quest cards
- The new component importing into the dashboard could break code splitting
- Streak data fetching in `page.tsx` adds a new DB query — could slow the dashboard load
- CSS z-index of the flame animation may conflict with the sidebar pet widget
- The shield sprite path may 404 if the asset isn't deployed correctly

---

## 8. Implementation Order (Build Week)

### Day 1 (June 30)
1. Create migration 017 (streak_shields columns)
2. Implement `src/lib/streak-shields.ts` pure module
3. Write unit tests for the pure module
4. Create the server action `streaks.ts`

### Day 2 (July 1)
5. Build `streak-widget.tsx` component
6. Integrate into `page.tsx` dashboard
7. Style with pixel-art aesthetic (flame sprites, shield diamonds)
8. Run TestSprite tests against the new widget — expect layout failures

### Day 3 (July 2)
9. Fix regressions caught by TestSprite
10. Add streak milestone rewards to `gamification.ts`
11. Polish animations (flame breathing, shield sparkle)
12. Full TestSprite suite rerun — document the loop

---

## 9. Regression Maximization Strategy

The whole point of building this feature during the hackathon is to **create real regressions** that TestSprite catches. Here's how we maximize that:

1. **Touch `page.tsx` layout** — the dashboard is tested by multiple TestSprite tests. Adding a new widget WILL shift element positions.

2. **Import into the main chunk** — the streak widget becomes part of the dashboard's server component tree. If it errors, the whole page breaks.

3. **Add a new DB query** — the streak data fetch adds latency. If it's slow or errors, the dashboard render is affected.

4. **Share CSS variables** — the flame animation uses `var(--pixel-accent)` and `var(--pixel-bg-surface)`. Theme changes could break it.

5. **Touch gamification.ts** — other features (Feynman, Review, Research) all call `rewardAction`. If we break that file, everything regresses.

---

## 10. Pixel Art Assets Needed

| Asset | Size | States | Location |
|-------|------|--------|----------|
| Flame sprite (1x) | 16x16 | idle (2 frames) | `/public/sprites/streak/flame-1x.png` |
| Flame sprite (2x) | 24x24 | idle (3 frames) | `/public/sprites/streak/flame-2x.png` |
| Flame sprite (golden) | 24x24 | idle (3 frames) | `/public/sprites/streak/flame-gold.png` |
| Shield diamond | 12x12 | filled / empty | `/public/sprites/streak/shield.png` |
| Week cell (filled) | 8x8 | — | Can use CSS with pixel borders |
| Week cell (shielded) | 8x8 | — | Shield overlay on cell |

**Fallback:** If sprites aren't ready, use CSS-only pixel squares with `box-shadow` pixel art technique (the existing `pixel-panel` pattern). The flame can be an emoji (🔥) with pixel-font sizing until the sprite is drawn.

---

## 11. Success Criteria

- [ ] Widget renders on dashboard without breaking existing content
- [ ] Streak computation is correct (unit tests pass)
- [ ] Shield mechanic works (earned, used, displayed)
- [ ] Week consistency heatmap shows accurate data
- [ ] All existing TestSprite tests still pass after integration
- [ ] At least 1 genuine regression caught and fixed via the TestSprite loop
- [ ] Mobile responsive (widget stacks vertically on small screens)
- [ ] Pixel-art aesthetic consistent with existing UI

---

## 12. Compassionate Design Notes

Following Nora's design philosophy:

- **No punishment for breaking a streak** — the shield protects, and even without it, the message is "Start fresh!" not "You failed"
- **Best streak is always visible** — even if current streak is 0, the best-ever number celebrates past achievement
- **"At risk" state is gentle** — see the proposal comment in `page.tsx` (Option B tooltip recommended)
- **Shield is earned, not purchased** — consistency rewards more consistency, no pay-to-win
- **Week view shows the pattern, not a judgment** — muted colors for missed days, never red/alarming
