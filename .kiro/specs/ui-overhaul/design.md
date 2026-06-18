# Design Document: UI Overhaul

## Overview

This design restructures Nora's navigation and homepage to surface the emotional core — pet companion, social accountability, daily review habit — instead of presenting a flat menu of 14 equally-weighted features. No backend logic, routes, or schema changes are involved.

All work targets four files primarily:
- `src/app/(protected)/app/_components/game-sidebar.tsx` — sidebar (Task 1 done, Task 2 extends it)
- `src/app/(protected)/app/layout.tsx` — passes pet data as prop to sidebar (Task 2)
- `src/app/(protected)/app/party/page.tsx` and party sub-components (Task 3)
- `src/lib/format-streak.ts` — new pure utility (Task 4)
- `src/app/(protected)/app/page.tsx` — homepage restructure (Task 5)

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Pet data fetched server-side in `layout.tsx`, passed as prop | Matches the exact existing pattern for `profile` data — layout already fetches and props-drills to `GameSidebar`. Avoids client-side Supabase call, no hydration risk. |
| `PetWidget` rendered inside `GameSidebar` between logo and nav | Sidebar is already a client component; receiving a new prop costs nothing. Pet stays ambient without adding complexity. |
| `formatStreak` as a pure function in `src/lib/` | Zero dependencies; trivially testable; consistent output regardless of caller. |
| Friends activity fetched server-side in `page.tsx` | Homepage is already a server component; query fits naturally alongside existing `study_sessions` and `card_reviews` queries. No new patterns needed. |
| `AcademicTimelineWidget` removed from homepage, not from the app | The widget is valuable on `/app/academic` but occupies prime homepage real estate before onboarding is complete. Removing it from the homepage does not touch the widget itself. |
| Study Modes grid removed | The sidebar now provides full navigation; the grid is redundant and gives equal weight to every feature. |
| PokéAPI animated sprite used in sidebar (same as pixel room) | Already used in `pixel-room.tsx` via `state.pet.sprite` (which is the PokéAPI GIF URL). Consistent source, no new external dependency. |

---

## Architecture

```
layout.tsx (Server Component)
  ├── fetches profile (existing)
  ├── fetches pet data (NEW — pets table)
  ├── GameSidebar (Client Component)
  │   ├── Logo
  │   ├── PetWidget (NEW — receives pet prop)
  │   │   ├── animated GIF sprite (48×48)
  │   │   ├── pet name
  │   │   └── mood badge
  │   ├── AccordionGroup "Study" (Task 1)
  │   ├── NavLink "Friends" (Task 1, renamed Task 3)
  │   ├── AccordionGroup "My Room" (Task 1)
  │   ├── NavLink "Settings" (Task 1)
  │   └── MusicPlayer
  └── GameTopBar (unchanged)

page.tsx (Server Component — homepage)
  ├── fetches profile (existing)
  ├── fetches cardsDue (existing)
  ├── calculates streak (existing)
  ├── fetches quest progress (existing)
  ├── fetches FriendsFeed (NEW — party_members → member activity)
  ├── Section 1: DailyBriefing (NEW — subtitle based on cardsDue + hour)
  ├── Section 2: PrimaryCTA (NEW — single large action card)
  ├── Section 3: StatRow (REDESIGNED — large/small hierarchy + streak fix)
  ├── Section 4: Today's Quests (KEPT — minor polish)
  ├── Section 5: FriendsActivity (NEW — replaces AcademicTimelineWidget + StudyModes grid)
  └── [removed] AcademicTimelineWidget
  └── [removed] Study Modes grid
  └── [removed] Footer tip

src/lib/format-streak.ts (NEW)
  └── formatStreak(streak, context) → string

party/page.tsx + party/_components/ (RENAMED — text only)
```

---

## Component Interfaces

### Task 2: PetWidget props and data shape

```typescript
// Data fetched from `pets` table in layout.tsx:
interface PetSidebarData {
  pokemonId: number;   // parsed from pet_type column (e.g. "25" → 25)
  name: string;        // pets.name
  state: "happy" | "neutral" | "sad" | "forest_rescue";  // pets.state
  spriteUrl: string;   // PokéAPI GIF URL constructed from pokemonId
}

// GameSidebar prop extended:
interface GameSidebarProps {
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
  pet: PetSidebarData | null;  // null = no pet row, shows empty state
}
```

**Sprite URL construction:**
```typescript
const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`;
```

**Bob animation (CSS):** Applied with an inline `style` or a global CSS class. Use the existing `animate-pixel-float` class already defined in `globals.css` — it applies a `translateY` float animation. If that class uses a different range, add a specific `animate-pet-bob` keyframe that goes `0px → -3px → 0px` over 2s ease-in-out infinite.

**Mood badge color mapping:**
```typescript
const moodConfig = {
  happy:         { emoji: "😊", label: "Happy",  color: "var(--pixel-success)" },
  neutral:       { emoji: "😐", label: "Neutral", color: "var(--pixel-warning)" },
  sad:           { emoji: "😢", label: "Sad",     color: "var(--pixel-error)"   },
  forest_rescue: { emoji: "😢", label: "Sad",     color: "var(--pixel-error)"   },
};
```

### Task 4: formatStreak

```typescript
// src/lib/format-streak.ts
export type StreakContext = 'home' | 'analytics' | 'profile';

export function formatStreak(streak: number, context: StreakContext): string {
  if (streak === 0) {
    switch (context) {
      case 'home':      return 'Day 1 starts now ✨';
      case 'analytics': return '—';
      case 'profile':   return 'Not started yet';
    }
  }
  return streak.toString();
}
```

### Task 5: FriendsFeed data shape and query

```typescript
interface FriendActivity {
  userId: string;
  displayName: string;
  activityType: 'review' | 'feynman' | 'session';
  count: number;          // cards reviewed, feynman sessions count, or session count
  streak?: number;        // if available from profile
}

interface FriendsFeed {
  activities: FriendActivity[];
  partyName: string | null;
}
```

**Server-side query in `page.tsx`:**

```typescript
// 1. Find the user's party
const { data: membership } = await supabase
  .from('party_members')
  .select('party_id, parties(name)')
  .eq('user_id', user.id)
  .maybeSingle();

if (!membership) return { activities: [], partyName: null };

// 2. Get all party member IDs (excluding self)
const { data: members } = await supabase
  .from('party_members')
  .select('user_id')
  .eq('party_id', membership.party_id)
  .neq('user_id', user.id);

const memberIds = (members ?? []).map(m => m.user_id);
if (memberIds.length === 0) return { activities: [], partyName: membership.parties?.name ?? null };

// 3. Fetch member display names
const { data: memberProfiles } = await supabase
  .from('profiles')
  .select('id, display_name')
  .in('id', memberIds);

// 4. Fetch activity in last 24h
const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const [{ data: recentReviews }, { data: recentFeynman }, { data: recentSessions }] = await Promise.all([
  supabase.from('card_reviews').select('user_id').in('user_id', memberIds).gte('reviewed_at', since),
  supabase.from('feynman_explanations').select('user_id').in('user_id', memberIds).gte('created_at', since),
  supabase.from('study_sessions').select('user_id').in('user_id', memberIds).gte('started_at', since),
]);

// 5. Aggregate per member and per type
```

The aggregation produces one `FriendActivity` entry per (member × activityType) combination where count > 0. Entries are sorted by count descending, capped at 8 items to keep the feed compact.

### Task 5: Homepage section structure

```tsx
// page.tsx — new structure
<div className="space-y-6 max-w-6xl mx-auto">
  <DailyBriefing cardsDue={cardsDue} hour={serverHour} />   {/* Section 1 — NEW */}
  <PrimaryCTA cardsDue={cardsDue} />                         {/* Section 2 — NEW */}
  <StatRow                                                   {/* Section 3 — REDESIGNED */}
    cardsDue={cardsDue}
    streak={streak}
    xp={xpToday}
    coins={coins}
  />
  <DialogFrame title="TODAY'S QUESTS">                       {/* Section 4 — KEPT */}
    ...
  </DialogFrame>
  <FriendsActivity feed={friendsFeed} />                     {/* Section 5 — NEW */}
</div>
```

**DailyBriefing** — server component sub-function, inline in `page.tsx`:
- Renders `<p>` with subtitle based on `cardsDue` and `hour`
- No separate file needed (fits in page.tsx as a function component)

**PrimaryCTA** — inline sub-component:
- Full-width or centered large `<Link>` styled with `pixel-panel` + accent background
- Text and href vary based on `cardsDue > 0`

**StatRow** — replaces the current `grid grid-cols-2 lg:grid-cols-4` with a 2-tier layout:
- Large tier: Cards Due + Streak (use larger font size, `text-2xl` or `text-3xl`)
- Small tier: XP + Coins (use `text-lg`, secondary color)
- Layout: `grid grid-cols-2 lg:grid-cols-4 gap-3` retained, but `StatTile` gets a `size` prop (`'large' | 'small'`)

**FriendsActivity** — inline sub-component:
- Section header: `"YOUR STUDY CIRCLE"` in `font-pixel text-sm text-[var(--pixel-text-secondary)]`
- Feed items rendered as a list with `pixel-panel pixel-panel-inset` wrapper
- Each item: sprite icon + text description
- Empty state: link to `/app/party`

---

## File Change Summary

| File | Change type | Notes |
|---|---|---|
| `_components/game-sidebar.tsx` | Extend | Add `pet` prop + `PetWidget` component; update `GameSidebarProps` |
| `app/layout.tsx` | Extend | Fetch pet from `pets` table; pass to `GameSidebar` as prop |
| `party/page.tsx` | UI text | Change `PageHeader title` from "Party" to "Friends" |
| `party/_components/party-page.tsx` | UI text | Update any visible "Party" headings to "Friends"/"Study Circle" |
| `party/_components/party-discovery.tsx` | UI text | Update any visible "Party" headings |
| `src/lib/format-streak.ts` | New file | Pure utility, no dependencies |
| `app/page.tsx` | Restructure | Remove widget + grid; add 5-section layout with FriendsFeed |
| `globals.css` | Extend if needed | Add `animate-pet-bob` keyframe if `animate-pixel-float` range differs |

**Files that must NOT be touched:**
- Any file under `_actions/`
- Any file under `src/lib/supabase/`
- Any file under `supabase/migrations/`
- Any route path or URL

---

## Error Handling

- **Pet fetch fails or returns null:** `PetWidget` shows `?` placeholder + "Visit My Room →" link. The sidebar renders normally.
- **FriendsFeed query fails:** Caught in try/catch in `page.tsx`; `friendsFeed` defaults to `{ activities: [], partyName: null }`. The empty state is shown without breaking the page.
- **PokéAPI GIF 404 (e.g., pokémon ID has no animated sprite):** `<img>` tag has `onError` handler that hides the broken image and shows the `?` placeholder fallback.
