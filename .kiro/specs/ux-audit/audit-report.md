# Nora UX Audit Report

## Executive Summary

Nora's emotional promise — cozy, social, motivating — is **partially delivered**. The Homepage, Pixel Room, Onboarding, Academic, Research Desk, and Collection pages successfully embody the pixel-art cozy theme. However, approximately half the app (Review Cards, Study Mix, Analytics Dashboard, History, Party, Weekly Calendar, Subjects Manager) still uses a legacy "SaaS white" visual language — rounded-lg white cards, zinc borders, indigo buttons — that directly contradicts the cozy pixel-art identity. The most urgent category of problem is this **split personality**: a student navigating from the beautifully themed Homepage to Review Cards experiences a jarring visual break that erodes trust and polish. Secondary concerns include missing confirmation dialogs on destructive actions, an unused mobile BottomNav, and gamification mechanics (XP, coins, levels) that are displayed without context for new users.

---

## Overall Scores

| Page | First Imp. | Task Clarity | Emotional Tone | Feedback | Empty States | Wayfinding | Mobile | Consistency | AVG |
|---|---|---|---|---|---|---|---|---|---|
| Homepage | 9 | 9 | 9 | 8 | 9 | 8 | 6 | 9 | 8.4 |
| Review Cards | 7 | 8 | 5 | 7 | 8 | 7 | 6 | 3 | 6.4 |
| Study Mix | 7 | 7 | 5 | 7 | 8 | 6 | 6 | 3 | 6.1 |
| Feynman Mode | 8 | 8 | 8 | 9 | 7 | 7 | 5 | 7 | 7.4 |
| Research Desk | 8 | 8 | 8 | 8 | 7 | 7 | 5 | 8 | 7.4 |
| Study Room | 7 | 7 | 6 | 7 | 8 | 6 | 4 | 5 | 6.3 |
| Planner | 6 | 7 | 6 | 6 | 5 | 7 | 3 | 4 | 5.5 |
| My University | 8 | 7 | 8 | 8 | 7 | 7 | 6 | 8 | 7.4 |
| Analytics | 7 | 7 | 7 | 6 | 8 | 7 | 5 | 4 | 6.4 |
| History | 6 | 7 | 5 | 5 | 7 | 7 | 5 | 3 | 5.6 |
| Pixel Room | 9 | 8 | 10 | 7 | 7 | 7 | 5 | 9 | 7.8 |
| Party (Friends) | 5 | 6 | 4 | 4 | 6 | 6 | 5 | 3 | 4.9 |
| Collection | 8 | 8 | 8 | 6 | 7 | 7 | 7 | 9 | 7.5 |
| Settings | 8 | 8 | 7 | 7 | 6 | 8 | 6 | 6 | 7.0 |
| Onboarding | 9 | 9 | 9 | 8 | N/A | 8 | 7 | 9 | 8.4 |

---

## Critical Issues (P0)

### [ISSUE-001] Visual Split Personality — Legacy Styling on Core Study Pages

- **Page:** Review Cards, Study Mix, Study Session, Review Session
- **Severity:** P0
- **What happens:** The flashcard review flow — the single most-used feature — renders with `bg-white`, `rounded-lg`, `border-zinc-200`, and `bg-indigo-600` buttons. This is a completely different design language from the pixel-panel, `var(--pixel-*)` system used on Homepage, Room, and Research. A student moving from the Homepage CTA ("Review Your 5 Cards →") lands on a page that looks like a different app.
- **Why it matters:** The cozy pixel-art identity IS the emotional promise. The review session is where students spend the most time. If the most-used screen doesn't feel cozy, the promise is broken at the core.
- **Recommended fix:** Re-skin `review-session.tsx` and `study-session.tsx` using `DialogFrame`, `PixelButton`, `pixel-panel`, and CSS custom properties. Replace Tailwind color classes (`bg-white`, `text-zinc-*`, `bg-indigo-*`) with pixel theme vars.

### [ISSUE-002] No Mobile Bottom Navigation Rendered

- **Page:** All pages (layout.tsx)
- **Severity:** P0
- **What happens:** A `BottomNav` component exists in `src/components/pixel-ui/bottom-nav.tsx` with 5 mobile tabs (Home, Feynman, Research, Planner, Stats). However, it is never rendered in `layout.tsx`. On mobile (<768px), the sidebar is `hidden md:flex`, meaning mobile users have **no navigation at all** — they cannot leave whatever page they're on without the browser back button.
- **Why it matters:** A student on mobile is completely stranded. This breaks the core loop on the most common form factor for students.
- **Recommended fix:** Add `<BottomNav />` to the layout, positioned after `</main>` inside the flex-1 column div.

### [ISSUE-003] Destructive Actions Without Confirmation Dialogs

- **Page:** Review Cards (delete card), Settings (delete subject/topic), Party (leave group)
- **Severity:** P0
- **What happens:** 
  - `review-session.tsx`: "Delete card" button fires `deleteCard()` with no confirmation.
  - `subjects-manager.tsx`: Delete subject/topic uses a `<form action={deleteSubject}>` with no warning.
  - `party-page.tsx`: "Leave Group" uses `window.confirm()` — a native browser dialog that breaks the pixel-art immersion.
- **Why it matters:** Accidentally deleting a flashcard you've built review history for is irreversible. The cozy promise means never punishing — accidental deletion IS punishment. The native confirm dialog is jarring and feels clinical.
- **Recommended fix:** Create a `PixelConfirmDialog` component (pixel-panel styled modal). Use it for all destructive actions. Copy should be warm: "Are you sure? This card will be gone forever."

### [ISSUE-004] Global Error Page Uses Non-Pixel Styling

- **Page:** `error.tsx` (renders on any unhandled error)
- **Severity:** P0
- **What happens:** The error boundary renders a `Loader2` spinner icon, `bg-red-500` alert triangle, and a `bg-indigo-600` "Try again" button. These are completely off-brand. If a student hits any server error, the experience breaks visually.
- **Why it matters:** Error states are high-anxiety moments. If the error page doesn't feel safe and cozy, it amplifies the stress. This is the opposite of the emotional promise.
- **Recommended fix:** Replace with `ErrorState` component from pixel-ui (already exists!) or use `DialogFrame` with `state="error"` and a `PixelButton`.

### [ISSUE-005] Global Loading State Uses Non-Pixel Styling

- **Page:** `loading.tsx` (renders during RSC streaming)
- **Severity:** P0
- **What happens:** Shows a `Loader2` (lucide) spinner with `text-indigo-500` and plain "Loading..." text. Doesn't match the pixel theme at all.
- **Why it matters:** Loading states are seen frequently. Every time a page takes >200ms to load, the student sees a non-themed screen, creating a flicker of "wrong app" feeling.
- **Recommended fix:** Replace with `LoadingSkeleton` from pixel-ui, or a centered pixel-panel with a custom pixel spinner animation.

---

## High Priority Issues (P1)

### [ISSUE-006] Party / Friends Page Entirely Off-Brand

- **Page:** Party (both `party-page.tsx` and `party-discovery.tsx`)
- **Severity:** P1
- **What happens:** The entire Friends experience — discovery, member list, quests, messages, admin — uses old-style `bg-white`, `rounded-lg`, `border-zinc-200`, `bg-indigo-600` patterns. The "Social" pillar of Nora's promise is delivered through a page that looks like a generic SaaS admin panel.
- **Why it matters:** "Social" is one of three core pillars. If the social feature doesn't feel warm and cozy, the connection promise falls flat.
- **Recommended fix:** Re-skin using `DialogFrame`, `PixelButton`, `pixel-panel`, pixel theme variables. Party headers should use `font-pixel`. Member cards should be pixel-panel-inset.

### [ISSUE-007] Analytics Dashboard Off-Brand

- **Page:** Analytics (`analytics-dashboard.tsx`)
- **Severity:** P1
- **What happens:** All stat cards, charts, and the heatmap use `bg-white`, `border-zinc-200`, lucide icons with zinc colors. The pixel-ui library has `PixelStatCard`, `PixelBarChart`, `PixelHeatmap`, and `PixelProgressBar` — all purpose-built for this page — but none are used.
- **Why it matters:** Analytics is where students see their progress. Progress visualization is directly "Motivating" (pillar 3). The current clinical styling makes progress feel transactional, not rewarding.
- **Recommended fix:** Replace `StatCard` with `PixelStatCard`, use `PixelBarChart` for daily charts, `PixelHeatmap` for consistency grid.

### [ISSUE-008] History Page Entirely Off-Brand

- **Page:** History (`history-filters.tsx`, `history-list.tsx`)
- **Severity:** P1
- **What happens:** Filter chips use `bg-indigo-100` / `bg-zinc-100` pill styles. History cards use `bg-white`, `border-zinc-200`. The page looks like it belongs to a different product.
- **Why it matters:** History is a journal — it should feel cozy and reflective. Current styling is cold and transactional.
- **Recommended fix:** Convert filter chips to pixel-panel-inset buttons with pixel vars. Convert history cards to DialogFrame or pixel-panel. Use pixel font for date headers.

### [ISSUE-009] Weekly Calendar (Planner) Off-Brand

- **Page:** Planner (`weekly-calendar.tsx`)
- **Severity:** P1
- **What happens:** The entire 7-day grid uses `bg-white`, `border-zinc-200`, `text-indigo-600`, `bg-indigo-600` for today highlight. Navigation uses lucide ChevronLeft/Right with zinc styling.
- **Why it matters:** The planner is a daily touchpoint. If it feels clinical, the student won't return.
- **Recommended fix:** Re-skin day cells with pixel-panel. Use pixel vars for today highlight. Convert nav buttons to PixelButton.

### [ISSUE-010] XP / Coins / Level Not Explained to New Users

- **Page:** Homepage, Top Bar, Profile Popover
- **Severity:** P1
- **What happens:** XP, coins, and level are displayed prominently from the first session. There is no tooltip, onboarding callout, or explanation of what they mean, what coins buy, or what leveling up unlocks.
- **Why it matters:** Gamification without context feels pointless. New users see "+3 XP" and think "so what?" This undermines the "Motivating" pillar.
- **Recommended fix:** Add a first-time tooltip on the XP bar in GameTopBar ("Earn XP by studying. Level up to unlock new pets and themes!"). Add a brief explanation in the Collection page linking coins to future unlockables.

### [ISSUE-011] Study Room Search Panel Mixed Styling

- **Page:** Study Room (`study-room-layout.tsx`)
- **Severity:** P1
- **What happens:** When a video is loaded, the collapsible "Search or load another video" panel uses `border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900` — legacy styling. The empty state (no video) correctly uses `pixel-panel`.
- **Why it matters:** Creates visual inconsistency within the same page — the panel looks wrong next to the pixel-themed rest.
- **Recommended fix:** Convert the collapsible search wrapper to `pixel-panel` with pixel vars.

---

## Medium Priority Issues (P2)

### [ISSUE-012] Subjects Manager Uses Legacy Styling

- **Page:** Settings → Subjects tab (`subjects-manager.tsx`)
- **Severity:** P2
- **What happens:** Subject/topic list items use `border-zinc-200`, `bg-zinc-100`, indigo submit buttons. The wrapper `DialogFrame` is pixel-themed, but the interior content breaks the theme.
- **Why it matters:** Inconsistency within a page that's otherwise well-themed (Settings tabs are pixel-perfect). Student notices the mismatch.
- **Recommended fix:** Replace subject cards with pixel-panel-inset, forms with PixelInput, buttons with PixelButton.

### [ISSUE-013] Feynman Editor — Evaluate Button Uses Inline `!bg-` Overrides

- **Page:** Feynman Mode (`feynman-editor.tsx`)
- **Severity:** P2
- **What happens:** The "Evaluate with AI" button uses `!bg-[var(--pixel-accent)]` with important overrides. This suggests it's fighting a global style reset — fragile and may break.
- **Why it matters:** Technical debt that could produce visual regressions. The button should just be `<PixelButton variant="primary">`.
- **Recommended fix:** Replace inline-styled buttons with `PixelButton` component.

### [ISSUE-014] Review Stats Bar Shows Placeholder Dashes

- **Page:** Review Cards (`page.tsx`)
- **Severity:** P2
- **What happens:** "Reviewed Today" and "Avg. Interval" stat cards display `—` (em dash) as their value because the data isn't fetched. These are permanently static placeholder values.
- **Why it matters:** A new user sees three stat cards, two of which say "—" — this looks broken or unfinished. It provides no value.
- **Recommended fix:** Either compute and display real values (reviewed today count is available from card_reviews), or remove the placeholder cards and show only "Cards Due" until more data is meaningful.

### [ISSUE-015] No Loading State in Party Discovery

- **Page:** Party (`party-discovery.tsx`)
- **Severity:** P2
- **What happens:** While `loadParties` is fetching, the page shows `<p className="text-sm text-zinc-500">Loading groups...</p>` — plain unstyled text with no spinner or skeleton.
- **Why it matters:** Feels unfinished. Should use LoadingSkeleton or at minimum a pixel-themed spinner.
- **Recommended fix:** Use `LoadingSkeleton lines={3}` while loading.

### [ISSUE-016] Planner Empty State Missing

- **Page:** Planner (`weekly-calendar.tsx`)
- **Severity:** P2
- **What happens:** When a user has zero planned sessions and zero academic events, each day cell shows a single `—` character. There's no overarching "nothing planned yet" guidance.
- **Why it matters:** A blank planner doesn't guide. The student should see encouragement to add topics or complete the academic setup.
- **Recommended fix:** If all 7 days are empty, show an `EmptyState` above the calendar with actionable guidance.

### [ISSUE-017] Error Messages Use Technical Language

- **Page:** Various (Party, Research, Planner)
- **Severity:** P2
- **What happens:** Party error: `<p className="text-sm text-red-500">{result.error}</p>` — raw server error string rendered directly. Planner error uses `border-red-200 bg-red-50` alert — clinical styling.
- **Why it matters:** Technical error text creates anxiety. Cozy tone requires human-friendly error copy.
- **Recommended fix:** Wrap all error displays in the `ErrorState` component or `DialogFrame state="error"`. Provide a fallback human message like "Something didn't work. Try again in a moment."

### [ISSUE-018] Study Room Complex Layout Collapses Poorly on Mobile

- **Page:** Study Room (`study-room-layout.tsx`)
- **Severity:** P2
- **What happens:** The 60%/40% split layout uses `lg:flex-row` — on screens below `lg` (1024px), both panels stack vertically. The note editor becomes a full-width column after a full-width video + controls section, creating an extremely long scroll. No BottomNav to navigate away.
- **Why it matters:** On a tablet or phone, the study room is essentially unusable without a lot of scrolling, and there's no way to navigate away (see ISSUE-002).
- **Recommended fix:** Consider tab-based navigation between Video and Notes on mobile. Fix BottomNav (ISSUE-002) first.

---

## Low Priority Issues (P3)

### [ISSUE-019] Collection "Coming Soon" Placeholders

- **Page:** Collection
- **Severity:** P3
- **What happens:** "Themes" and "Decorations" panels show greyed-out previews with "Coming soon" text. Functional but slightly disappointing.
- **Why it matters:** Sets an expectation that won't be met soon. Mildly undermines trust but not urgent.
- **Recommended fix:** Add a note like "Unlocks at higher levels" to make it feel intentional rather than unfinished.

### [ISSUE-020] Profile Popover — Settings Link Uses Lucide Icons Import

- **Page:** Profile Popover (`profile-popover.tsx`)
- **Severity:** P3
- **What happens:** `import { Settings, LogOut } from "lucide-react"` — but the actual rendered icons use sprite images (`/sprites/travel-book/icons/Gear.png` and `Exit.png`). The lucide imports are unused dead code.
- **Why it matters:** Dead code creates confusion for contributors. Minor cleanup.
- **Recommended fix:** Remove unused lucide-react imports.

### [ISSUE-021] Music Player Volume Slider Unstyled

- **Page:** Sidebar (MusicPlayer)
- **Severity:** P3
- **What happens:** `<input type="range">` renders with browser-default styling. On Chrome it's a blue slider that doesn't match the pixel theme.
- **Why it matters:** Minor visual inconsistency in an otherwise well-themed sidebar.
- **Recommended fix:** Style the range input with CSS to match pixel theme colors, or replace with a custom pixel slider.

### [ISSUE-022] Feynman Empty State Links to Settings

- **Page:** Feynman Mode (`feynman/page.tsx`)
- **Severity:** P3
- **What happens:** When no topics exist, the message says "Go to Settings to create subjects and topics first." Uses a plain `<a>` tag, not Link, with no pixel styling.
- **Why it matters:** The guidance is correct but the link is unstyled and uses an anchor instead of Next.js Link (loses client-side navigation).
- **Recommended fix:** Use `<Link>` component, style with pixel-accent color, consider using `EmptyState` component with `actionLabel="Create a Subject" actionHref="/app/settings"`.

### [ISSUE-023] Pet State "forest_rescue" Displays as "Sad"

- **Page:** Sidebar PetWidget, Pixel Room
- **Severity:** P3
- **What happens:** `MOOD_CONFIG` maps `forest_rescue` to `{ emoji: "😢", label: "Sad", color: "var(--pixel-error)" }`. The state name implies a special narrative event but the UI shows it identically to "sad".
- **Why it matters:** Missed storytelling opportunity. The cozy promise benefits from narrative flavor.
- **Recommended fix:** Give `forest_rescue` its own emoji/label like `{ emoji: "🌲", label: "Lost in forest", color: "var(--pixel-warning)" }` with a tooltip explaining the quest to rescue them.

---

## What's Working Well

1. **Homepage** — Excellent first impression. Daily briefing copy is warm and contextual. Primary CTA adapts (cards due → review; no cards → Feynman). Streak zero state uses formatStreak to say "Day 1 starts now ✨" instead of showing "0". Friends activity section has a cozy empty state with actionable link.

2. **Onboarding Wizard** — Beautiful step-by-step flow with StepDots indicator. Uses pixel-ui consistently. Copy is encouraging ("Tell Nora where you study so it can find your real academic calendar"). Error handling is clear. Final step says "You're all set" — warm closure.

3. **Pixel Room** — The emotional centerpiece of the app. Pixel-art scene with furniture, window, pet sprite, HUD overlay. Pet mood messaging is personality-driven. Daily quote adds warmth. Missions section links directly to study features. This is the page that best embodies the promise.

4. **Feynman Mode** — Sophisticated AI evaluation with iterative refine loop, per-topic sparkline progress, ghost autocomplete suggestions. Uses DialogFrame throughout. Score card with delta tracking is genuinely motivating. Suggested flashcards are editable before saving.

5. **Research Desk** — Clean dual-mode (web/papers) with good progressive disclosure. Loading steps animation gives transparency. Source citation display is informative. Uses pixel-ui consistently.

6. **XpToast & SuccessCheck** — Reward feedback is satisfying: floating "+15 XP" with sound effect, appearing after meaningful actions. Feels game-like without being intrusive.

7. **GameSidebar** — Well-organized with accordion groups, localStorage persistence, proper keyboard support (aria-expanded, Enter/Space handling). Pet widget as ambient social companion. Music player pinned at bottom adds atmosphere.

8. **Academic Documents Panel** — Clear document lifecycle (queued → processing → ready → failed) with appropriate status colors. "Extract dates" action is a unique value proposition communicated clearly.

9. **formatStreak utility** — Demonstrates excellent UX thinking at the data layer. Zero is never shown as "0" — it's always reframed positively or neutrally based on context.

10. **Collection Page** — Cursor picker is a delightful touch. Coming-soon items are honest without being deflating. Uses pixel-ui consistently.

---

## Page-by-Page Detailed Notes

### Homepage
The homepage is the gold standard for Nora's pixel-art identity. DailyBriefing adapts copy based on time-of-day and cards-due count — "All caught up! A great day to explore something new." is genuinely encouraging. The PrimaryCTA panel has a subtle accent-mix background that glows. QuestItems show progress/max with pixel-themed bars. The FriendsActivity empty state ("No activity in your circle yet / Invite a friend to study together →") is cozy and actionable. Only downside: no BottomNav for mobile users.

### Review Cards
The core review flow works mechanically but visually belongs to a different app. The stats bar (Cards Due, Reviewed Today, Avg. Interval) renders as white rounded-lg cards with lucide icons in zinc-400. The 6-grade button grid (Blackout through Easy) uses raw Tailwind color classes (`bg-red-600`, `bg-emerald-600`). The "Delete card" link at the bottom fires immediately with no confirmation. The empty state is good copy-wise ("All caught up!") but wrong visually.

### Study Mix
Same visual issues as Review. The "low diversity hint" banner uses `border-amber-200 bg-amber-50` — old-style. The session complete screen has a Trophy lucide icon, not a pixel sprite. The progress bar uses `bg-indigo-500 rounded-full` — should be the segmented PixelProgressBar.

### Feynman Mode
Best of both worlds: uses DialogFrame for panels, pixel vars for theming, but the textarea and buttons still use some inline style overrides (`!bg-[var(--pixel-accent)]`). The autocomplete ghost layer is clever UX. The refine loop with score delta ("+ 12 vs last attempt") is genuinely motivating. The EvaluationSteps animation (progressive check marks) provides good transparency. When no topics exist, the empty state works but uses a plain `<a>` tag.

### Research Desk
Consistently themed. ResearchModeToggle (web/papers) gives clear mode switching. The AlertTriangle warning about AI-generated content is responsible. PaperLibrary with live ingestion polling (status updates from pending → ready) provides good feedback. RagSearchSteps animation mirrors the Feynman evaluation steps. One concern: the paper delete action has no confirmation dialog.

### Study Room
Complex page with solid functionality but mixed visual execution. The empty state (no video loaded) uses pixel-panel correctly and is well-composed. Once a video loads, the collapsible search panel switches to old styling. The split layout (60/40) is appropriate for desktop but problematic on mobile. TimeRangeSelector, GeneratedNotes, and FeynmanVideoPrompt sub-components would need individual review for styling — they're not accessible from the page-level read but appear to use inline styles.

### Planner
The page.tsx wrapper uses pixel vars for academic load indicators and upcoming deadlines — these feel right. But the WeeklyCalendar (the main content) is entirely old-style. The week navigation bar is a white rounded-lg panel. Today's date circle uses `bg-indigo-600`. Session chips are small zinc-colored pills. The AcademicChip inside the calendar correctly uses pixel vars — creating inconsistency within the same component.

### My University (Academic)
Consistently well-themed. The DiscoveryPoller progress bar with "FINDING YOUR OFFICIAL SOURCES…" is encouraging. The AcademicReviewPanel uses pixel-panel-inset for event rows with inline editing. The AcademicDocumentsPanel handles the full upload/index/extract lifecycle cleanly. Status badges (Verified/Inferred/Unreleased) are color-coded appropriately. Only concern: when review.events is empty AND courses is empty, nothing renders — could benefit from a brief "Nora is still looking" message.

### Analytics
The page.tsx shell is well-done: uses DialogFrame for the "not enough data" state with warm copy ("Analytics light up after 3 days of activity. Keep studying — your charts will appear soon."). But the actual AnalyticsDashboard component is entirely old-style. The pixel-ui library exports `PixelStatCard`, `PixelBarChart`, and `PixelHeatmap` — purpose-built alternatives that go unused.

### History
Entirely old-style. Filter chips (type and time range) use indigo/zinc pills. The date-grouped card list uses white rounded cards. The expand/collapse pattern works well functionally. The empty state copy is good ("Start studying with Feynman mode, watch videos, or do research — your activity will show up here") but renders in old styling. TypeBadges for feynman/video/research are color-coded pills that would look better as pixel-panel tags.

### Pixel Room
The crown jewel. The scene viewport with wall/floor textures, window with sky gradient, furniture sprites, pet centerpiece, and HUD overlay is delightful. The daily quote in a pixel-panel adds a reflective touch. Today's Missions with checkable items that link to study features is excellent wayfinding. PartyPresenceIndicator shows who's studying — fulfilling the "social" pillar ambiently. Minor note: the pet affinity heart icon uses lucide (Heart from lucide-react) rather than a sprite.

### Party (Friends)
The weakest page in the app. PartyDiscovery is a plain list with indigo "Join" buttons. PartyPage renders section headers as plain `<h3>` with zinc text. The "Leave Group" uses `window.confirm()` — a native browser dialog that's jarring in a pixel-art app. Error states render as raw `<p className="text-sm text-red-500">` text. The invite code input uses standard zinc-bordered styling. This page most urgently needs the "Social" pillar embodied visually.

### Collection
Well-executed with pixel-ui throughout. CursorPicker is a unique, delightful feature. "Coming soon" sections are honest placeholders. The 4-color theme swatches and 4 decoration icon previews give a taste of what's ahead. Good use of DialogFrame for each section.

### Settings
The tab bar is beautifully themed — pixel-font labels with sprite icons, accent background on active tab. Profile, Customization, Pet, Preferences, and Account tabs all use DialogFrame consistently. The "Feature Row" component in Preferences is well-designed with status badges. Only the Subjects tab interior (SubjectsManager) falls back to old styling.

### Onboarding
Full-screen wizard (no sidebar/topbar shell — intentional). StepDots indicator is pixel-themed with accent colors. Each step has clear guidance, quick-select buttons for common terms ("Fall / Güz", "Spring / Bahar"), and the final step provides warm closure. Error handling shows inline field errors and navigates back to the relevant step. Uses pixel-ui throughout.
