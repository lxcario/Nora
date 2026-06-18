# Requirements Document

## Introduction

The UI Overhaul restructures Nora's navigation and homepage to deliver the app's emotional promise — *cozy, social, motivating study companion* — on first load. The work is UI-only: no server actions, no schema migrations, no new routes, no new packages. Every existing feature and route remains reachable.

This spec covers five tasks executed in dependency order:

1. **Sidebar Collapse** — 14 items → 5 top-level with accordions *(complete)*
2. **Pet in Sidebar** — persistent companion widget in the sidebar
3. **Party → Friends Rename** — UI text only, routes unchanged
4. **formatStreak Utility** — zero-streak copy fix applied globally
5. **Homepage Restructure** — briefing → CTA → stat row → quests → friends feed

## Glossary

- **GameSidebar**: The `_components/game-sidebar.tsx` client component that renders the desktop sidebar. This is the active sidebar (the app layout imports it). `pixel-sidebar.tsx` in the shared library is not used.
- **AccordionGroup**: The expandable nav section added in Task 1 inside `GameSidebar`.
- **PetWidget**: The new sidebar section that shows the user's animated pet sprite, name, and mood state.
- **PokéAPI_Sprite**: The animated Gen V GIF at `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/{id}.gif`.
- **FriendsActivity**: The new homepage section that shows party members' recent study actions.
- **FriendsFeed**: The data object derived from `study_sessions`, `card_reviews`, and `feynman_explanations` for the user's party members in the last 24 hours.
- **formatStreak**: A pure utility function `(streak: number, context: StreakContext) => string` that returns display text for any streak value.
- **PrimaryCTA**: The single large call-to-action card on the homepage that directs the user to their most important daily action.
- **StatRow**: The 4-stat summary row on the homepage (cards due, streak, XP, coins) replacing the current equal-weight 4-column grid.
- **AcademicTimelineWidget**: The `_components/academic-timeline-widget.tsx` component currently rendered on the homepage. It is removed from the homepage by this overhaul (the `/app/academic` page is unaffected).

---

## Requirement 1: Sidebar Collapse

**Status: Complete** — implemented and committed in `game-sidebar.tsx` (commit `09d6d13`).

**User Story:** As a student, I want the sidebar to show 5 top-level destinations so that I know immediately where to go on day one.

### Acceptance Criteria

1. WHEN the sidebar renders, IT SHALL display exactly 5 top-level navigation items: Home, Study, Friends, My Room, Settings.
2. THE Study top-level item SHALL be an `AccordionGroup` containing: Review Cards (`/app/review`), Study Mix (`/app/study`), Feynman Mode (`/app/feynman`), Research Desk (`/app/research`), Study Room (`/app/study-room`), Study Planner (`/app/planner`), My University (`/app/academic`).
3. THE My Room top-level item SHALL be an `AccordionGroup` containing: Pixel Room (`/app/room`), Collection (`/app/collection`), Analytics (`/app/analytics`), History (`/app/history`).
4. THE Friends top-level item SHALL be a direct link to `/app/party`.
5. THE Settings top-level item SHALL be a direct link to `/app/settings`.
6. WHEN a user navigates to any child route, THE corresponding `AccordionGroup` SHALL automatically expand.
7. THE expanded/collapsed state of each `AccordionGroup` SHALL be persisted in `localStorage` under the key `nora_sidebar_state`.
8. WHEN a user presses Enter or Space on an `AccordionGroup` button, THE accordion SHALL toggle open or closed.
9. ALL 14 original navigation destinations SHALL remain reachable.
10. THE `/app/study` active state SHALL NOT activate when the current path is `/app/study-room` or any other route that begins with `/app/study/`.

---

## Requirement 2: Pet in Sidebar

**User Story:** As a student, I want to see my pet companion in the sidebar at all times, so that the app feels alive and my study habits have an immediate visual reflection.

### Acceptance Criteria

1. WHEN the `GameSidebar` renders, IT SHALL display the `PetWidget` between the NORA logo header and the navigation items.
2. THE `PetWidget` SHALL display the user's pet as an animated `PokéAPI_Sprite` at 48×48 CSS pixels.
3. THE `PetWidget` SHALL apply a `translateY` bob animation cycling between 0px and -3px on a 2-second ease-in-out infinite loop.
4. THE `PetWidget` SHALL display the pet's name in the pixel font, centered, below the sprite.
5. THE `PetWidget` SHALL display a mood badge below the name with the following values: `😊 Happy` when `state = 'happy'`, `😐 Neutral` when `state = 'neutral'`, `😢 Sad` when `state = 'sad'` or `state = 'forest_rescue'`.
6. THE mood badge SHALL use `var(--pixel-success)` color for Happy, `var(--pixel-warning)` for Neutral, and `var(--pixel-error)` for Sad/Forest Rescue.
7. WHEN a user clicks the `PetWidget`, THE browser SHALL navigate to `/app/room`.
8. IF no pet record exists for the user, THE `PetWidget` SHALL display a `?` placeholder and the text "Visit My Room →" linking to `/app/room`.
9. THE pet data SHALL be fetched server-side in `layout.tsx` alongside the existing profile queries and passed to `GameSidebar` as a prop, consistent with how `profile` data is already handled.
10. THE `PetWidget` SHALL NOT be added to the topbar, individual page bodies, or any component other than `GameSidebar`.
11. THE `PetWidget` SHALL render with a pixel-art border consistent with the `pixel-panel` class used elsewhere in the sidebar.

---

## Requirement 3: Party → Friends Rename

**User Story:** As a student, I want the social feature to be called "Friends" instead of "Party", so that the label feels warm and inviting rather than like a Discord server category.

### Acceptance Criteria

1. THE sidebar nav label for `/app/party` SHALL display "FRIENDS" (already done in Task 1).
2. THE `PageHeader` title in `party/page.tsx` SHALL change from `"Party"` to `"Friends"`.
3. THE `PageHeader` description in `party/page.tsx` SHALL remain `"Study together with friends"` (unchanged, already appropriate).
4. ANY heading, `<title>`, section label, or display string visible to the user inside `party/_components/party-page.tsx` and `party/_components/party-discovery.tsx` that reads "Party" SHALL be updated to "Friends" or "Study Circle" as appropriate to context.
5. THE URL path `/app/party` SHALL NOT change.
6. NO TypeScript type names, server action function names, Supabase column names, or `party_*` table names SHALL change.
7. NO database schema, no files in `_actions/`, and no files in `src/lib/supabase/` SHALL be modified.

---

## Requirement 4: formatStreak Utility

**User Story:** As a student who hasn't built a streak yet, I want to see an encouraging message instead of "0 Days", so that the app motivates me rather than highlighting my absence.

### Acceptance Criteria

1. A pure function `formatStreak(streak: number, context: StreakContext): string` SHALL be created in `src/lib/format-streak.ts`.
2. `StreakContext` SHALL be the union type `'home' | 'analytics' | 'profile'`.
3. WHEN `streak === 0` and `context === 'home'`, THE function SHALL return `"Day 1 starts now ✨"`.
4. WHEN `streak === 0` and `context === 'analytics'`, THE function SHALL return `"—"`.
5. WHEN `streak === 0` and `context === 'profile'`, THE function SHALL return `"Not started yet"`.
6. WHEN `streak > 0`, THE function SHALL return `streak.toString()` regardless of context (the caller handles suffix and emoji).
7. THE homepage `StatTile` for streak SHALL use `formatStreak(streak, 'home')` to determine its display value. WHEN `streak === 0`, IT SHALL show the encouraging string in `var(--pixel-accent)` (soft amber) instead of `var(--pixel-text-primary)`.
8. THE `AnalyticsDashboard` component SHALL use `formatStreak(streak, 'analytics')` wherever streak is displayed as a number.
9. IF streak is displayed in `/app/settings` or a profile component, IT SHALL use `formatStreak(streak, 'profile')`.
10. THE utility SHALL have no dependencies on React, Next.js, or Supabase.

---

## Requirement 5: Homepage Restructure

**User Story:** As a student opening Nora, I want the homepage to tell me exactly what to do today and show me what my friends are up to, so that I feel oriented and motivated within 10 seconds of loading.

### Acceptance Criteria

**Section 1 — Daily Briefing Header**

1. WHEN the homepage renders and `cardsDue > 0`, THE briefing subtitle SHALL reflect the time of day: morning (before 12:00) `"You have {n} cards waiting. Let's start strong."`, afternoon (12:00–17:59) `"Still time to review those {n} cards."`, evening (18:00+) `"End the day right — {n} cards to go."`.
2. WHEN `cardsDue === 0`, THE briefing subtitle SHALL read `"All caught up! A great day to explore something new."`.
3. THE existing greeting (e.g. "Good afternoon, Student! ☀️") already lives in `GameTopBar` and SHALL NOT be duplicated on the homepage.

**Section 2 — Primary CTA**

4. WHEN `cardsDue > 0`, THE `PrimaryCTA` SHALL display `"Review Your {n} Cards →"` and link to `/app/review`.
5. WHEN `cardsDue === 0`, THE `PrimaryCTA` SHALL display `"Explore Feynman Mode →"` and link to `/app/feynman`.
6. THE `PrimaryCTA` SHALL be the largest and most visually prominent element on the homepage, using `var(--pixel-accent)` as its background or border color.

**Section 3 — Stat Row**

7. THE `StatRow` SHALL display four stats: Cards Due, Streak, XP, and Coins.
8. Cards Due and Streak SHALL be visually larger (prominent display size) than XP and Coins (secondary display size).
9. WHEN `streak === 0`, THE Streak stat SHALL display `formatStreak(0, 'home')` in `var(--pixel-accent)` color; IT SHALL NOT display `"0"`, `"0 days"`, or `"0 DAYS"`.
10. WHEN `streak > 0`, THE Streak stat SHALL display `"🔥 {n} days"` or `"🔥 {n} day"` appropriately.

**Section 4 — Today's Quests (keep, minor polish)**

11. THE Today's Quests section SHALL remain structurally unchanged.
12. WHEN all quest progress values are 0, THE section SHALL display a sub-label: `"Fresh start — all quests ready"`.
13. WHEN all quests are complete (`allQuestsDone === true`), THE section SHALL display a celebratory state: `"All done today! 🎉"` with the reward badge prominently shown.

**Section 5 — Friends Activity**

14. WHEN the user belongs to a party, THE `FriendsActivity` section SHALL display a feed of study actions from party members in the last 24 hours, sourced from `study_sessions`, `card_reviews`, and `feynman_explanations`.
15. EACH feed item SHALL display: member display name, action description (e.g. "reviewed 14 cards", "completed a Feynman session", "is on a {n}-day streak"), and an appropriate sprite icon.
16. THE section header SHALL read `"YOUR STUDY CIRCLE"` in the same uppercase pixel font style as other section headers.
17. WHEN the user has no party, THE section SHALL display an empty state: `"Invite a friend to study together →"` linking to `/app/party`.
18. THE `FriendsFeed` data SHALL be fetched server-side in `page.tsx` wrapped in a try/catch; failures SHALL silently render the empty state.

**Removals**

19. THE `AcademicTimelineWidget` SHALL be removed from the homepage. The widget's page (`/app/academic`) is unaffected.
20. THE Study Modes 6-card grid SHALL be removed from the homepage.
21. THE footer tip line ("Tip: Short daily goals lead to big long-term results.") SHALL be removed.
