# Nora — UI Overhaul Agent Prompt
> Paste this entire prompt to your AI agent (Kiro, Cursor, Claude Code, etc.) as the task brief.

---

## CONTEXT & MISSION

You are working on **Nora** — a cozy, gamified study companion app built with Next.js 15 App Router, TypeScript, Tailwind CSS v4, Supabase, and a custom pixel-art component library (`/src/components/pixel-ui/`). The app is partially built and visually distinctive — it uses a warm dark brown palette, pixel-art borders, sprite icons from the Sprout Lands UI pack, and an ALL-CAPS pixel font for navigation.

Your mission is a **UI/UX restructure** — not a feature build. You are not adding new backend logic, new database tables, or new server actions. You are reorganizing, surfacing, and restructuring existing UI so that Nora's emotional promise — *"cozy, social, motivating study companion"* — is immediately felt on first load.

**Do not remove any existing features. Do not touch server actions, database schema, or API routes. Only modify UI layer files: components, page layouts, and client-side state.**

---

## CODEBASE ORIENTATION

Before making any changes, read these files to understand the existing structure:

```
src/app/(protected)/app/_components/    ← shared layout components (sidebar, topbar)
src/app/(protected)/app/page.tsx        ← homepage
src/app/(protected)/app/party/          ← social party feature (to be renamed)
src/components/pixel-ui/               ← full pixel component library
src/lib/sfx.ts                         ← 8-bit sound effects
```

The sidebar component lives in `src/app/(protected)/app/_components/`. Find it, read it fully before touching it.

The pet/avatar system uses PokéAPI animated Gen V sprites and stores state in Supabase (`pets` table, `avatars` table). The pixel room page is at `src/app/(protected)/app/room/`. Read this before surfacing the pet.

The party system is at `src/app/(protected)/app/party/`. Read the page and any sub-components before renaming.

---

## TASK 1 — SIDEBAR COLLAPSE (Priority: Critical)

### Problem
The sidebar currently has 15 navigation items at equal visual weight. This makes Nora feel like a dashboard tool, not a cozy study companion. A student on day one has no idea where to start.

### What to do

Restructure the sidebar to **5 top-level items only**:

```
1. Home
2. Study
3. Friends        ← was "Party"
4. My Room        ← was "Pixel Room"
5. Settings
```

**Group the secondary features** under expandable sub-items or route them as tabs within their parent page — do NOT delete them from the app:

- **Study** expands to reveal: Review Cards, Study Mix, Feynman Mode, Research Desk, Study Room, Study Planner
- **Friends** is a direct link to the renamed party page (see Task 5)
- **My Room** expands to reveal: Pixel Room, Collection, Analytics, History
- **Settings** stays as-is

### Implementation notes

- Use an accordion/expandable pattern consistent with the existing pixel-ui component library. Check if `pixel-sidebar.tsx` already has a grouped/collapsible variant before building one.
- The expanded sub-items should use a smaller font size and slightly indented left padding to create clear visual hierarchy.
- Keep the existing active state styling (the golden highlight) for the top-level items.
- Sub-items get a simpler active indicator — a left border accent in the golden color, no full background fill.
- "Study Music" (currently pinned at the bottom) stays pinned at the bottom outside the main nav group. It's a utility, not a feature.
- The sidebar collapse must be **keyboard accessible** — Enter/Space toggles the accordion.
- Persist expanded/collapsed state in `localStorage` with the key `nora_sidebar_state`.

### What NOT to do
- Do not remove any routes or pages
- Do not change any existing URL paths
- Do not touch the sidebar's visual aesthetic (pixel borders, dark background, font, sprite icons)

---

## TASK 2 — PET VISIBILITY (Priority: Critical)

### Problem
The pet is the emotional core of Nora — a companion whose mood mirrors the student's study consistency. Currently it's buried at sidebar item 11. It should be **ambient and always present**.

### What to do

Surface the pet as a **persistent element in the sidebar**, between the NORA logo/header and the navigation items.

**Specifically:**

1. Fetch the current user's pet data from Supabase (the `pets` table — check the existing Supabase types in `src/lib/supabase/` for the exact schema).
2. Display the pet's animated sprite (PokéAPI Gen V animated sprite URL: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/{pokemon_id}.gif`) in the sidebar at approximately **48×48px**.
3. Display the pet's current mood state below the sprite as a small pixel-art status badge: `😊 Happy`, `😐 Neutral`, `😢 Sad`. Match the badge styling to the existing pixel-ui component library's tag/badge pattern.
4. Display the pet's name in the pixel font, small, centered under the sprite.
5. Wrap the whole element in a link to `/app/room` so clicking the pet navigates there.
6. Add a subtle CSS animation: the sprite should have a gentle `translateY` bob — `2px up, 2px down` on a 2s ease-in-out infinite loop — to feel alive without being distracting.

**Data fetching:** Use a React Server Component pattern consistent with the rest of the app. If the sidebar is already a client component, use a `useEffect` + Supabase client call. Check how other components in `_components/` fetch user data and follow the same pattern exactly.

**Empty state:** If the user has no pet yet, show a small "?" sprite placeholder with the text "Visit My Room →" linking to `/app/room`.

### What NOT to do
- Do not add the pet to the topbar — sidebar only
- Do not add pet to every individual page body — sidebar presence is enough
- Do not create a new Supabase table or server action for this

---

## TASK 3 — HOMEPAGE RESTRUCTURE (Priority: High)

### Problem
The current homepage (`/app/page.tsx`) gives equal weight to everything and leads with a "0 Days" streak which demoralizes users who haven't built a habit yet. "Your Semester" — an onboarding incomplete state — sits in prime homepage real estate. The Study Modes grid duplicates the sidebar with no hierarchy.

### What to do

Restructure the homepage into the following **5 sections in order**, replacing the current layout:

---

**Section 1 — Daily Briefing Header** (replaces the current greeting)

Keep the personalized greeting ("Good afternoon, Resque! ☀️") but add a **contextual subtitle** based on time of day and cards due:
- Morning + cards due: *"You have {n} cards waiting. Let's start strong."*
- Afternoon + cards due: *"Still time to review those {n} cards."*
- Evening + cards due: *"End the day right — {n} cards to go."*
- No cards due: *"All caught up! A great day to explore something new."*

This subtitle replaces the raw stat cards as the emotional lead.

---

**Section 2 — Primary CTA** (new, replaces stat cards as hero)

A single large pixel-art button/card — the most visually prominent element on the page:

```
[ 📚 Review Your 20 Cards → ]
```

- If cards due > 0: Shows card count, links to `/app/review`
- If cards due = 0: Shows "Explore Feynman Mode →" linking to `/app/feynman`
- Style: Full-width or prominent center, uses the golden/amber accent color, larger than everything else on the page
- This is the ONE thing Nora wants you to do today

---

**Section 3 — Stat Row** (replaces the 4-card stat grid, redesigned)

Keep the 4 stats (cards due, XP, streak, coins) but:

- **Streak zero state fix:** If streak = 0, do NOT show "0 DAYS". Instead show: `"Day 1 starts now ✨"` with a subtle encouraging color (soft amber, not red/grey).
- If streak > 0, show normally with a fire emoji: `🔥 {n} Days`
- **Deprioritize coins and XP visually** — make them smaller than streak and cards due. Streak and cards due are actionable; XP and coins are vanity. Reflect this in font size and card size.
- Remove the equal-size 4-column grid. Use: `[Cards Due — large] [Streak — large] [XP — small] [Coins — small]`

---

**Section 4 — Today's Quests** (keep as-is, minor polish)

This section is working well. Keep it. Minor changes only:
- Add a subtle pixel-art divider above this section
- If all quests are 0/x, add a small encouraging label: *"Fresh start — all quests ready"*
- If all quests are complete, replace the section with a celebratory state: *"All done today! 🎉 +25 XP earned"*

---

**Section 5 — Friends Activity** (new section, replaces "Your Semester" and Study Modes grid)

This is the social hook. Replace "Your Semester" and the Study Modes grid with a **Friends Activity feed**.

Query the `party_members` table to find the current user's party, then query recent `study_sessions`, `card_reviews`, and `feynman_explanations` from party members (last 24 hours).

Display as a simple activity list:
```
🔥 Elif reviewed 14 cards today
⭐ Kemal completed a Feynman session on Calculus
📚 Ayşe is on a 5-day streak
```

**Empty state (no party / no friends yet):**
```
[ Invite a friend to study together → ]   ← links to /app/friends
```

**Loading state:** Use the existing `loading-skeleton.tsx` pixel component.

**Section header:** "YOUR STUDY CIRCLE" in the same uppercase pixel font style as other section headers.

**Remove entirely:**
- The "Your Semester" prompt block (move its CTA to a small notification dot on the "My Room" or Settings nav item instead)
- The Study Modes 6-card grid (the sidebar now handles navigation; the homepage should not be a second menu)

---

### Implementation notes for homepage
- Follow the existing server component pattern in `page.tsx` — fetch data at the top, pass as props
- Keep all existing Tailwind classes and pixel-ui components; extend, don't replace
- The friends activity query should be wrapped in a try/catch — if it fails (user has no party), silently show the empty state

---

## TASK 4 — ZERO STREAK STATE (Priority: Medium)

This is partially handled in Task 3's stat row, but apply the same logic **everywhere** streak is displayed in the app — analytics page, profile, party view, history.

**Rule:** If `streak === 0`, never display "0 days" or "0 DAYS". Always display one of:
- `"Day 1 starts now"` (homepage)
- `"—"` (analytics/history tables where a dash reads neutrally)
- `"Not started yet"` (profile/settings)

Create a small utility function in `src/lib/` called `formatStreak(streak: number, context: 'home' | 'analytics' | 'profile'): string` and use it everywhere streak is rendered.

---

## TASK 5 — RENAME "PARTY" → "FRIENDS" (Priority: Medium)

### What to do

1. Rename the sidebar nav item label from "Party" to **"Friends"**
2. Update the page title/header inside `/app/party/page.tsx` from "Party" to **"Friends"** (or "Study Circle" — pick the one that fits the existing pixel-art header component style better)
3. Update any breadcrumb, page `<title>`, and `<meta>` description references to "party" → "friends" or "study circle"
4. **Do NOT rename the route** (`/app/party` stays as `/app/party`) — changing URLs breaks existing links and is out of scope
5. Do NOT rename any database tables, Supabase column names, TypeScript types, or server action function names — this is UI text only

### Tone guidance
The rename should feel warm and inviting, not transactional. "Friends" is direct and clear. "Study Circle" is slightly more evocative. Either works — pick what reads better in the pixel-art ALL-CAPS style: `FRIENDS` vs `STUDY CIRCLE`. If `STUDY CIRCLE` feels too long for the sidebar, use `FRIENDS`.

---

## QUALITY CHECKLIST

Before marking any task complete, verify:

**Functionality**
- [ ] All 15 original navigation destinations are still reachable (no routes removed)
- [ ] Sidebar accordion persists state in localStorage
- [ ] Pet sprite loads and bobs; empty state shows correctly when no pet exists
- [ ] Friends activity feed shows real data when party exists; empty state when not
- [ ] Streak zero state shows encouraging text, not "0 DAYS", everywhere
- [ ] Primary CTA on homepage links to correct route based on cards-due count
- [ ] "Your Semester" block is removed from homepage
- [ ] Study Modes 6-card grid is removed from homepage

**Visual consistency**
- [ ] No new fonts introduced — use only what's already in the project
- [ ] No new colors introduced — use only existing CSS variables/Tailwind tokens
- [ ] Pet display matches pixel-ui library aesthetic (pixel borders, correct background)
- [ ] Friends activity section matches existing section header styling
- [ ] Sidebar accordion items use the same icon sprites as the original nav items

**Code quality**
- [ ] No TypeScript errors introduced (`npx tsc --noEmit` passes)
- [ ] No new `any` types
- [ ] Supabase queries use the existing typed client from `src/lib/supabase/`
- [ ] Error boundaries / try-catch on all new data fetching
- [ ] No hardcoded user IDs or test data left in production code

**Do not**
- [ ] Do not install new npm packages without explicit approval
- [ ] Do not modify any file in `src/app/(protected)/app/_actions/`
- [ ] Do not modify any file in `src/lib/supabase/` (types, client)
- [ ] Do not touch the database schema or run any migrations
- [ ] Do not change any existing URL/route paths

---

## EXECUTION ORDER

Complete tasks in this order. Each task is independently deployable — commit after each one.

```
1. TASK 1 — Sidebar collapse         (foundation for everything else)
2. TASK 2 — Pet in sidebar           (depends on sidebar structure)
3. TASK 5 — Rename Party → Friends   (small, do it while sidebar is open)
4. TASK 4 — formatStreak utility     (small utility, do before homepage)
5. TASK 3 — Homepage restructure     (depends on formatStreak, do last)
```

---

## AESTHETIC REMINDER

Nora's visual identity is non-negotiable. Every change must feel native to the existing design:

- **Dark warm brown background** — `#1a1208` range
- **Golden/amber accent** — used for active states, CTAs, highlights
- **Pixel borders** — all cards and panels use the 9-slice pixel border system
- **ALL-CAPS pixel font** — section headers and nav items
- **Sprite icons** — from the Sprout Lands UI pack, already in the project
- **8px grid** — all spacing in multiples of 8px

If any new element you add doesn't look like it was always part of Nora, it's wrong. Match, don't invent.
