# Tasks

## Implementation Order

Tasks are executed in dependency order. Each task is independently committable.

```
[x] Task 1 — Sidebar Collapse         (done, commit 09d6d13)
[x] Task 2 — Pet in Sidebar           (done, commit 0ecd51c)
[x] Task 3 — Party → Friends Rename   (done, commit 63ba794)
[x] Task 4 — formatStreak Utility     (done, commit e47ae07)
[x] Task 5 — Homepage Restructure     (done, commit c22c874)
```

**All tasks complete.**

---

## Task 1 — Sidebar Collapse ✅

**Status: Complete** — `game-sidebar.tsx` rewritten, committed `09d6d13`.

- [x] 1.1 Read `game-sidebar.tsx`, `pixel-sidebar.tsx`, all `_components/` files
- [x] 1.2 Rewrite `game-sidebar.tsx` with 5 top-level items and accordion groups
- [x] 1.3 Implement `isRouteActive()` helper to fix `/app/study` vs `/app/study-room` false positive
- [x] 1.4 Verify `npx tsc --noEmit` passes; commit

---

## Task 2 — Pet in Sidebar

**Goal:** Surface the pet as a persistent ambient element between the logo and the nav items.

**Files to modify:** `game-sidebar.tsx`, `app/(protected)/app/layout.tsx`

**Dependencies:** Task 1 (sidebar structure)

### Subtasks

- [x] 2.1 Read `layout.tsx` in full to understand current prop-passing pattern
- [x] 2.2 Read `src/lib/pokeapi.ts` to understand how sprite URLs are constructed
- [x] 2.3 In `layout.tsx`: add a pet fetch query (`pets` table: `pet_type, name, state, affinity`) alongside the existing profile query; construct the PokéAPI GIF URL from `pet_type`; handle null (no pet row)
- [x] 2.4 Update `GameSidebarProps` to accept `pet: PetSidebarData | null`
- [x] 2.5 In `game-sidebar.tsx`: add `PetWidget` inline component:
  - Container: `pixel-panel` class, centered, ~8px margin, linked to `/app/room`
  - Sprite: `<img>` at 48×48 with `animate-pixel-float` class (or `animate-pet-bob` if a tighter range is needed) and `onError` fallback
  - Name: `font-pixel text-[10px]` centered below sprite
  - Mood badge: emoji + label, colored by `moodConfig[state]`
  - Empty state: `?` text + "Visit My Room →" link
- [x] 2.6 Check `globals.css` for `animate-pixel-float` — if it doesn't produce a 0px→-3px bob, add `animate-pet-bob` keyframe
- [x] 2.7 Verify `npx tsc --noEmit` passes
- [x] 2.8 Commit: `feat(ui): surface pet companion in sidebar`

---

## Task 3 — Party → Friends Rename

**Goal:** Change all user-visible "Party" labels to "Friends" or "Study Circle". Routes and code identifiers unchanged.

**Files to modify:** `party/page.tsx`, `party/_components/party-page.tsx`, `party/_components/party-discovery.tsx`

**Dependencies:** None (can be done in parallel with Task 4)

### Subtasks

- [x] 3.1 Read `party/page.tsx` — identify `PageHeader title` prop
- [x] 3.2 Read `party/_components/party-page.tsx` — find all visible headings containing "Party"
- [x] 3.3 Read `party/_components/party-discovery.tsx` — find all visible headings containing "Party"
- [x] 3.4 In `party/page.tsx`: change `PageHeader title="Party"` → `title="Friends"`
- [x] 3.5 In `party-page.tsx`: update any section headers or display strings (NOT TypeScript identifiers, action names, or prop names)
- [x] 3.6 In `party-discovery.tsx`: update any section headers or display strings
- [x] 3.7 Verify `npx tsc --noEmit` passes
- [x] 3.8 Commit: `feat(ui): rename Party → Friends in all user-visible labels`

---

## Task 4 — formatStreak Utility

**Goal:** Create a pure zero-streak formatting utility and apply it everywhere streak is displayed.

**Files to modify:** `src/lib/format-streak.ts` (new), `app/page.tsx` (homepage StatTile), analytics components (if streak shown as a number)

**Dependencies:** None

### Subtasks

- [x] 4.1 Create `src/lib/format-streak.ts` with `StreakContext` type and `formatStreak` function as specified in design.md
- [x] 4.2 In `app/page.tsx`: find the `StatTile` that renders streak. Import `formatStreak`. When `streak === 0`, pass `formatStreak(0, 'home')` as `value` (as a string) and apply `var(--pixel-accent)` color; when `streak > 0` keep existing display with suffix
- [x] 4.3 Read `analytics/_components/analytics-dashboard.tsx` — if streak is displayed as a number, apply `formatStreak(streak, 'analytics')`
- [x] 4.4 Verify `npx tsc --noEmit` passes
- [x] 4.5 Commit: `feat(ui): add formatStreak utility, fix zero-streak display on homepage`

---

## Task 5 — Homepage Restructure

**Goal:** Replace the flat 4-stat + quests + academic widget + study modes grid layout with a focused 5-section layout: briefing → CTA → stat row → quests (polished) → friends activity.

**Files to modify:** `app/page.tsx`

**Dependencies:** Task 4 (formatStreak must exist before homepage is rewritten)

### Subtasks

- [x] 5.1 Read `_components/academic-timeline-widget.tsx` to confirm it is safe to remove from page.tsx (widget page at `/app/academic` is unaffected)
- [x] 5.2 Remove from `page.tsx`: `AcademicTimelineWidget` import and usage, Study Modes grid section, footer tip
- [x] 5.3 Add `DailyBriefing` sub-component: contextual subtitle from `cardsDue` + server-side hour
- [x] 5.4 Add `PrimaryCTA` sub-component: single large link card (Review Cards or Feynman Mode)
- [x] 5.5 Redesign `StatRow`: keep all 4 stats but give Cards Due + Streak large visual weight and XP + Coins smaller weight; integrate `formatStreak` for streak zero state
- [x] 5.6 Polish Today's Quests: add "Fresh start" label when all progress is 0; add celebratory state label when `allQuestsDone === true`
- [x] 5.7 Add server-side `FriendsFeed` query in `page.tsx` (see design.md for query structure); wrap in try/catch
- [x] 5.8 Add `FriendsActivity` sub-component: section header "YOUR STUDY CIRCLE", feed items with sprite icons, empty state with link to `/app/party`
- [x] 5.9 Verify `npx tsc --noEmit` passes
- [x] 5.10 Commit: `feat(ui): restructure homepage — briefing, CTA, stat row, friends activity`

---

## Quality Gates (run before each commit)

- `npx tsc --noEmit` — zero TypeScript errors
- No new `any` types introduced
- No new npm packages installed
- No files in `_actions/`, `src/lib/supabase/`, or `supabase/migrations/` modified
- No URL/route paths changed
- All 14 original navigation destinations reachable
