# Nora UX Improvement Spec

## Scope

UI-only changes. No new routes, no schema migrations, no server actions unless absolutely required for an empty state fix. Every task must be independently committable.

---

## Priority Queue

### SPRINT 1 — Pre-Demo (P0 fixes only)

These tasks must be done before any hackathon demo. They address navigation breakage, visual identity collapse on core pages, and destructive action safety.


#### Task UX-001: Render BottomNav in App Layout
- **Fixes issue:** ISSUE-002
- **Files to modify:** `src/app/(protected)/app/layout.tsx`
- **What to change:** Import `BottomNav` from `@/components/pixel-ui` and render it after the `<main>` element, inside the `flex-1 flex flex-col` wrapper div. Add `pb-14 md:pb-0` to `<main>` to prevent content from being hidden behind the fixed nav on mobile.
- **Acceptance criteria:** On viewports < 768px, a fixed bottom navigation with 5 tabs (Home, Feynman, Research, Planner, Stats) is visible. Tabs navigate correctly. On desktop (≥768px), the bottom nav is hidden.
- **Estimated effort:** S

#### Task UX-002: Replace Global error.tsx with Pixel-Themed Error
- **Fixes issue:** ISSUE-004
- **Files to modify:** `src/app/(protected)/app/error.tsx`
- **What to change:** Remove lucide `AlertTriangle` import and indigo button. Use `DialogFrame` with `state="error"` wrapping a centered message. Use `PixelButton` with `variant="danger"` for "Try again". Use pixel-font and `var(--pixel-error)` color for the message. Keep `error.message` as content but wrap in warm framing: "Something went wrong" as header.
- **Acceptance criteria:** The error page uses pixel-panel styling with `var(--pixel-error)` border accent. "Try again" button is a PixelButton. No lucide icons, no indigo/bg-white styling visible.
- **Estimated effort:** S


#### Task UX-003: Replace Global loading.tsx with Pixel-Themed Loading
- **Fixes issue:** ISSUE-005
- **Files to modify:** `src/app/(protected)/app/loading.tsx`
- **What to change:** Remove `Loader2` from lucide-react. Render a centered `LoadingSkeleton height={120}` from pixel-ui, or a pixel-panel with a three-dot pixel blink animation (`animate-pixel-blink`) and text "Loading..." in `font-pixel` with `var(--pixel-text-secondary)` color.
- **Acceptance criteria:** Loading screen uses pixel-ui components or pixel CSS vars exclusively. No indigo or lucide elements visible.
- **Estimated effort:** S

#### Task UX-004: Create PixelConfirmDialog Component
- **Fixes issue:** ISSUE-003 (prerequisite for all destructive action fixes)
- **Files to modify:** `src/components/pixel-ui/confirm-dialog.tsx`, `src/components/pixel-ui/index.ts`
- **What to change:** Create a new component `PixelConfirmDialog` that renders a modal overlay with a `DialogFrame` containing: a title ("Are you sure?"), a message prop, a "Cancel" `PixelButton variant="secondary"`, and a "Confirm" `PixelButton variant="danger"`. Use `role="alertdialog"`, `aria-modal="true"`, focus trap on open, Escape to close. Export from the barrel index.
- **Acceptance criteria:** Component renders centered over a semi-transparent backdrop. Cancel closes without action. Confirm calls the onConfirm callback. Keyboard accessible (Tab cycles between buttons, Escape closes). Uses pixel-ui styling exclusively.
- **Estimated effort:** M


#### Task UX-005: Add Confirmation to Delete Card in Review Session
- **Fixes issue:** ISSUE-003
- **Files to modify:** `src/app/(protected)/app/review/_components/review-session.tsx`
- **What to change:** Import `PixelConfirmDialog`. When "Delete card" is clicked, show the dialog with message "This card and its review history will be permanently removed." Only call `deleteCard()` on confirm.
- **Acceptance criteria:** Clicking "Delete card" opens PixelConfirmDialog. Canceling returns to the card. Confirming deletes and advances.
- **Estimated effort:** S

#### Task UX-006: Re-skin Review Session with Pixel-UI
- **Fixes issue:** ISSUE-001
- **Files to modify:** `src/app/(protected)/app/review/_components/review-session.tsx`, `src/app/(protected)/app/review/page.tsx`
- **What to change:**
  - **page.tsx**: Replace the 3-stat bar (`bg-white rounded-lg border-zinc-200`) with `PixelStatCard` components or a single `DialogFrame` containing the stats. Remove lucide `Layers`, `CheckCircle`, `Clock` icons — use pixel sprites or remove.
  - **review-session.tsx**: Wrap the card in `DialogFrame` instead of `rounded-lg border-zinc-200 bg-white`. Replace "Reveal Answer" button with `PixelButton variant="secondary"`. Replace grade buttons row with pixel-themed colored buttons using `var(--pixel-error)` through `var(--pixel-success)`. Replace progress bar `bg-indigo-500 rounded-full` with a `PixelProgressBar variant="xp"`. Session complete screen: use `DialogFrame`, pixel-panel for stats, `PixelButton` for "Done".
- **Acceptance criteria:** No `bg-white`, `border-zinc-200`, `bg-indigo-*`, or lucide icon imports remain in these files. All containers use pixel-panel or DialogFrame. All buttons use PixelButton. Colors reference `var(--pixel-*)` custom properties.
- **Estimated effort:** L


#### Task UX-007: Re-skin Study Session with Pixel-UI
- **Fixes issue:** ISSUE-001
- **Files to modify:** `src/app/(protected)/app/study/_components/study-session.tsx`, `src/app/(protected)/app/study/page.tsx`
- **What to change:**
  - **page.tsx**: Replace the error div (`border-red-200 bg-red-50`) with `DialogFrame state="error"`. Replace empty state container with `EmptyState` component or `DialogFrame`. Replace the "low diversity hint" with `DialogFrame state="warning"`.
  - **study-session.tsx**: Same treatment as review-session — wrap cards in DialogFrame, use PixelButton for grade/reveal/skip, use PixelProgressBar for progress. Session complete screen: pixel-panel for stat grid, PixelButton for "Back to Dashboard". Type badges should use pixel-panel-inset with pixel vars instead of `bg-indigo-100` pills.
- **Acceptance criteria:** Same as UX-006. No old-style Tailwind color classes. All pixel-ui components used.
- **Estimated effort:** L

---

### SPRINT 2 — Pre-Ship (P1 fixes)

These tasks must be done before launch. They address the social pillar, analytics, and mobile UX.

#### Task UX-008: Re-skin Party Discovery with Pixel-UI
- **Fixes issue:** ISSUE-006
- **Files to modify:** `src/app/(protected)/app/party/_components/party-discovery.tsx`, `src/app/(protected)/app/party/_components/create-party-form.tsx`
- **What to change:** Replace all `rounded-lg border-zinc-200 bg-white` containers with `DialogFrame` or `pixel-panel`. Replace `bg-indigo-600` buttons with `PixelButton variant="primary"`. Replace invite code input with `PixelInput type="search"`. Replace loading text with `LoadingSkeleton`. Replace empty state with `EmptyState` component. Use pixel font for section headers.
- **Acceptance criteria:** No `bg-white`, `border-zinc-200`, or `bg-indigo-*` classes remain. All forms use PixelInput. All buttons use PixelButton. Loading uses LoadingSkeleton.
- **Estimated effort:** M


#### Task UX-009: Re-skin Party Page with Pixel-UI
- **Fixes issue:** ISSUE-006
- **Files to modify:** `src/app/(protected)/app/party/_components/party-page.tsx`, `src/app/(protected)/app/party/_components/party-members.tsx`, `src/app/(protected)/app/party/_components/party-quests.tsx`, `src/app/(protected)/app/party/_components/party-messages.tsx`, `src/app/(protected)/app/party/_components/party-cheers.tsx`, `src/app/(protected)/app/party/_components/party-admin.tsx`
- **What to change:** Replace the header badges (`bg-zinc-100 rounded-full`) with pixel-panel-inset spans using pixel vars. Wrap each section in `DialogFrame` with appropriate titles. Replace "Leave Group" button: use `PixelButton variant="danger"` and trigger `PixelConfirmDialog` instead of `window.confirm()`. Replace raw `<p className="text-sm text-red-500">` errors with `ErrorState` or inline `DialogFrame state="error"`.
- **Acceptance criteria:** No native `window.confirm()` calls. No `bg-white`, zinc, or indigo classes. All sections use pixel-panel or DialogFrame. Leave action uses PixelConfirmDialog.
- **Estimated effort:** L

#### Task UX-010: Re-skin Analytics Dashboard with Pixel-UI Components
- **Fixes issue:** ISSUE-007
- **Files to modify:** `src/app/(protected)/app/analytics/_components/analytics-dashboard.tsx`
- **What to change:** Replace `StatCard` with `PixelStatCard`. Replace `BarChartSimple` with `PixelBarChart`. Replace `ConsistencyHeatmap` with `PixelHeatmap`. Replace topic mastery progress bars with `PixelProgressBar`. Remove all `bg-white`, `border-zinc-200`, lucide icon imports (use sprite icons or omit).
- **Acceptance criteria:** All chart/stat components are from pixel-ui library. No old-style containers remain. Colors use pixel CSS vars.
- **Estimated effort:** M

#### Task UX-011: Re-skin History Page with Pixel-UI
- **Fixes issue:** ISSUE-008
- **Files to modify:** `src/app/(protected)/app/history/_components/history-filters.tsx`, `src/app/(protected)/app/history/_components/history-list.tsx`
- **What to change:**
  - **history-filters.tsx**: Replace pill-chip buttons with pixel-panel-inset toggle buttons using `var(--pixel-accent)` for active state. Replace topic `<select>` with `PixelInput type="select"`. Replace day range chips similarly.
  - **history-list.tsx**: Replace `HistoryItemCard` wrapper from `rounded-lg border-zinc-200 bg-white` to `pixel-panel`. Replace TypeBadge pills with pixel-panel-inset spans using pixel vars. Replace date section `<h3>` with `font-pixel` styling. Replace empty state with `EmptyState` component.
- **Acceptance criteria:** No `bg-white`, `bg-indigo-100`, `border-zinc-200` remain. Uses pixel font for headers. Empty state uses EmptyState component.
- **Estimated effort:** M


#### Task UX-012: Re-skin Weekly Calendar with Pixel-UI
- **Fixes issue:** ISSUE-009
- **Files to modify:** `src/app/(protected)/app/planner/_components/weekly-calendar.tsx`
- **What to change:** Replace week navigation bar (`bg-white rounded-lg border-zinc-200`) with `pixel-panel`. Replace nav links with `PixelButton variant="secondary" size="small"`. Replace day cells (`border-zinc-200 bg-white`) with pixel-panel or pixel-panel-inset. Replace today highlight (`bg-indigo-600 text-white` circle) with `var(--pixel-accent)`. Replace session chips to use pixel vars. Keep the AcademicChip component as-is (already uses pixel vars).
- **Acceptance criteria:** Calendar grid uses pixel theme throughout. Today is highlighted with accent color. No white/zinc/indigo classes remain.
- **Estimated effort:** M

#### Task UX-013: Add XP/Coins/Level Explanation for New Users
- **Fixes issue:** ISSUE-010
- **Files to modify:** `src/app/(protected)/app/_components/game-top-bar.tsx`, `src/app/(protected)/app/collection/page.tsx`
- **What to change:**
  - **game-top-bar.tsx**: Add a `title` attribute to the XP bar container: "Earn XP by studying. Level up to unlock pets and themes." Add a `title` to the coins display: "Earn coins from quests. Spend them in the Collection."
  - **collection/page.tsx**: Add a brief introductory sentence at the top: "Earn coins from daily quests and spend them on cursors, themes, and decorations as they unlock."
- **Acceptance criteria:** Hovering over the XP bar or coins in the top bar shows an explanatory tooltip. Collection page has context about what coins are for.
- **Estimated effort:** S

#### Task UX-014: Fix Study Room Collapsible Search Panel Styling
- **Fixes issue:** ISSUE-011
- **Files to modify:** `src/app/(protected)/app/study-room/_components/study-room-layout.tsx`
- **What to change:** Replace the collapsible panel wrapper from `rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900` to `pixel-panel`. Replace the button text styling from `text-zinc-600 dark:text-zinc-400` to `text-[var(--pixel-text-secondary)]`. Replace the divider from `border-zinc-200 dark:border-zinc-700` to `border-[var(--pixel-border)]`.
- **Acceptance criteria:** The collapsible search panel matches the pixel theme. No zinc/white classes in that section.
- **Estimated effort:** S

---

### SPRINT 3 — Polish (P2 + P3 fixes)

Nice-to-have improvements that increase overall consistency.


#### Task UX-015: Re-skin Subjects Manager
- **Fixes issue:** ISSUE-012
- **Files to modify:** `src/app/(protected)/app/settings/_components/subjects-manager.tsx`
- **What to change:** Replace subject cards (`rounded-lg border-zinc-200`) with `pixel-panel pixel-panel-inset`. Replace "Add" buttons (`bg-indigo-600`) with `PixelButton variant="primary" size="small"`. Replace inputs with `PixelInput`. Replace delete buttons with a PixelButton variant or icon button using `var(--pixel-error)` on hover. Add PixelConfirmDialog for delete subject/topic actions.
- **Acceptance criteria:** No zinc/indigo classes. All inputs use PixelInput. All buttons use PixelButton. Deletes require confirmation.
- **Estimated effort:** M

#### Task UX-016: Replace Feynman Editor Inline Button Overrides
- **Fixes issue:** ISSUE-013
- **Files to modify:** `src/app/(protected)/app/feynman/_components/feynman-editor.tsx`
- **What to change:** Replace buttons using `!bg-[var(--pixel-accent)]` overrides with `<PixelButton variant="primary">`. Replace the "Save Selected" button (`!bg-[var(--pixel-success)]`) with `<PixelButton variant="success">`. This applies to the evaluate button, save cards button, and any other inline-styled buttons in the file.
- **Acceptance criteria:** No `!bg-` or `!text-` important overrides in the file. All action buttons are PixelButton components.
- **Estimated effort:** S

#### Task UX-017: Fix Review Stats Placeholder Values
- **Fixes issue:** ISSUE-014
- **Files to modify:** `src/app/(protected)/app/review/page.tsx`
- **What to change:** Remove the "Reviewed Today" and "Avg. Interval" stat cards that show `—`. Keep only "Cards Due" stat. Or, compute "Reviewed Today" from `card_reviews` with `reviewed_at >= today` (the query pattern already exists in homepage). Display it with the pixel-stat-card pattern after UX-006 is done.
- **Acceptance criteria:** No stat cards show `—` as their value. Either cards are removed or display real data.
- **Estimated effort:** S

#### Task UX-018: Add Loading State to Party Discovery
- **Fixes issue:** ISSUE-015
- **Files to modify:** `src/app/(protected)/app/party/_components/party-discovery.tsx`
- **What to change:** Replace `<p>Loading groups...</p>` with `<LoadingSkeleton lines={4} />` from pixel-ui.
- **Acceptance criteria:** While parties are loading, a shimmer skeleton is shown instead of plain text.
- **Estimated effort:** S


#### Task UX-019: Add Planner Empty State
- **Fixes issue:** ISSUE-016
- **Files to modify:** `src/app/(protected)/app/planner/page.tsx`
- **What to change:** Before the `<WeeklyCalendar>` render, check if `sessions.length === 0 && academicEvents.length === 0`. If true, render an `EmptyState` from pixel-ui above the calendar with: message "Your planner is empty this week. Add topics in Settings or upload your academic calendar to get started.", actionLabel "Add Topics", actionHref "/app/settings".
- **Acceptance criteria:** When a user has zero sessions and zero academic events for the week, a helpful EmptyState guides them. Calendar still renders below it.
- **Estimated effort:** S

#### Task UX-020: Standardize Error Messages with ErrorState
- **Fixes issue:** ISSUE-017
- **Files to modify:** `src/app/(protected)/app/party/page.tsx`, `src/app/(protected)/app/planner/page.tsx`, `src/app/(protected)/app/study/page.tsx`, `src/app/(protected)/app/history/page.tsx`
- **What to change:** Replace all instances of `<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700...">` and `<p className="text-sm text-red-500">` with either `<ErrorState message={error} />` (if retry is possible) or `<DialogFrame state="error"><p>...</p></DialogFrame>`. Use human-friendly fallback: `message || "Something didn't work. Try again in a moment."`.
- **Acceptance criteria:** No raw red-text error strings visible. All errors render in pixel-ui styled containers with warm fallback copy.
- **Estimated effort:** S

#### Task UX-021: Improve Feynman Empty State with EmptyState Component
- **Fixes issue:** ISSUE-022
- **Files to modify:** `src/app/(protected)/app/feynman/page.tsx`
- **What to change:** Replace the current `DialogFrame` wrapping a plain `<p>` and `<a>` with the `EmptyState` component: `<EmptyState icon="pen" message="No topics found. Create subjects and topics in Settings to get started." actionLabel="Go to Settings" actionHref="/app/settings" />`.
- **Acceptance criteria:** Empty state uses EmptyState component with icon, message, and action button. Link uses proper href routing.
- **Estimated effort:** S

#### Task UX-022: Style Music Player Volume Slider
- **Fixes issue:** ISSUE-021
- **Files to modify:** `src/app/(protected)/app/_components/music-player.tsx` or `src/app/globals.css`
- **What to change:** Add CSS styling for the range input thumb and track to use pixel theme colors. In globals.css: style `input[type="range"]` with `appearance: none`, custom track height/color using `var(--pixel-bg-elevated)`, and thumb using `var(--pixel-accent)`.
- **Acceptance criteria:** Volume slider visually matches the pixel theme. No browser-default blue slider visible on Chrome, Firefox, or Safari.
- **Estimated effort:** S

#### Task UX-023: Give forest_rescue Pet State Unique Display
- **Fixes issue:** ISSUE-023
- **Files to modify:** `src/app/(protected)/app/_components/game-sidebar.tsx`
- **What to change:** In `MOOD_CONFIG`, change `forest_rescue` from `{ emoji: "😢", label: "Sad", color: "var(--pixel-error)" }` to `{ emoji: "🌲", label: "Lost in forest", color: "var(--pixel-warning)" }`.
- **Acceptance criteria:** Pet widget shows "🌲 Lost in forest" in warning color when state is forest_rescue, distinct from the sad state.
- **Estimated effort:** S

#### Task UX-024: Remove Dead Lucide Imports in Profile Popover
- **Fixes issue:** ISSUE-020
- **Files to modify:** `src/app/(protected)/app/_components/profile-popover.tsx`
- **What to change:** Remove `import { Settings, LogOut } from "lucide-react"` — these are unused since the component uses sprite images for both icons.
- **Acceptance criteria:** No unused imports in the file. No change to rendered output.
- **Estimated effort:** S

---

## Empty State Catalog

| Page / Component | Current empty state | Recommended empty state | Suggested copy |
|---|---|---|---|
| Homepage — Friends Activity | ✅ Good: Team icon + "No activity in your circle yet" + link to invite | Keep as-is | — |
| Homepage — Quests (all zero) | ✅ Good: "Fresh start — all quests ready" | Keep as-is | — |
| Review Cards — No due cards | ✅ Good copy, ❌ old styling | Re-skin with EmptyState component | "All caught up! No cards are due. Create more via Feynman Mode or Research." |
| Study Mix — No queue | ✅ Good copy, ❌ old styling | Re-skin with EmptyState component | "No study items available! Add topics, create flashcards, or upload papers." |
| Feynman Mode — No topics | ⚠️ Plain text with `<a>` tag | Use `EmptyState` component | "No topics found. Create subjects and topics in Settings to get started." |
| Research Desk | ✅ No explicit empty state needed — input is always available | Keep as-is | — |
| Study Room — No video | ✅ Good: MonitorPlay icon + pixel-panel search | Keep as-is | — |
| Planner — Empty week | ❌ Only shows `—` in each day cell | Add `EmptyState` above calendar | "Your planner is empty this week. Add topics or upload your academic calendar." |
| Analytics — < 3 days data | ✅ Good: BarChart3 icon + warm copy | Keep as-is | — |
| Analytics — Topic mastery empty | ⚠️ Plain text "Review some cards..." | Wrap in EmptyState | "Review some cards to see mastery data per topic." |
| History — No items | ✅ Good copy, ❌ old styling | Re-skin with EmptyState | "No history yet. Start studying and your activity will show up here." |
| Party — No party (discovery) | ✅ Functional, ❌ old styling | Re-skin | — |
| Party — No public groups | ⚠️ Plain Users icon + text | Use EmptyState | "No groups available yet. Create one and invite friends!" |
| Collection — Coming soon items | ✅ Honest placeholders | Add "Unlocks at higher levels" | — |
| Settings — No subjects | ⚠️ Plain zinc text | Use EmptyState | "No subjects yet. Add one to start organizing your studies." |
| Academic — No events/courses found | ⚠️ Renders nothing | Add brief message | "Nora is still looking for your academic data. Upload a document to speed this up." |

---

## Error Message Catalog

| Location | Current message | Recommended message |
|---|---|---|
| `error.tsx` (global) | Raw `error.message` or "An unexpected error occurred." | "Something went wrong. This isn't your fault — try refreshing." |
| Party page | Raw `result.error` in red text | "We couldn't load your group info. Try again in a moment." |
| Planner page | Raw error in red-50 alert | "Your planner couldn't load. Refresh to try again." |
| Study Mix page | Raw error in red-50 alert | "Couldn't build your study queue. Try refreshing." |
| Review page | Raw error in red-50 alert | "We hit a snag loading your cards. Give it another try." |
| Research Desk | Raw error string | "Research couldn't complete. Check your connection and try again." |
| Party Discovery — join error | Raw error text | "Couldn't join that group. The code might be wrong or the group may be full." |
| Academic Documents — upload error | Raw error string | "Upload didn't work. Make sure it's a text-based PDF (not a scan)." |
| Subjects Manager — delete failure | No error shown (silent) | "Couldn't delete. Try again in a moment." |

---

## Tone & Copy Consistency Rules

1. **Never show "0" for metrics that haven't started.** Use encouraging alternatives: "Day 1 starts now ✨", "—" (for charts), or "Not started yet" (for profiles). Follow the `formatStreak` pattern.

2. **Error messages are warm, blame-free, and actionable.** Format: "[What went wrong] — [what you can do]." Never expose raw error codes or stack traces. Never blame the user.

3. **Empty states have three parts: icon + message + action.** Use the `EmptyState` component. Message explains why it's empty. Action tells the user what to do next. Never show a blank container.

4. **Destructive actions always confirm.** Use `PixelConfirmDialog`. Copy should name the action and state irreversibility clearly: "This card will be permanently deleted."

5. **No punishment language.** Never say "You haven't...", "Streak lost", "Missed days". Reframe: "Ready to pick up where you left off?" or "Day 1 starts now ✨".

6. **Progress is always visible.** If a value is zero, show a prompt to start rather than a zero. If a bar is empty, show "Fresh start" rather than an empty track.

7. **Pixel font for labels, sans-serif for body text.** Headers, stat labels, nav items, badges use `font-pixel`. Longer body text, descriptions, and chat messages use the default sans-serif (Geist). Never use pixel font for paragraphs longer than one line.

8. **Colors come from CSS custom properties only.** Never use Tailwind color classes (`text-zinc-*`, `bg-indigo-*`, `text-red-*`) directly. Always reference `var(--pixel-text-primary)`, `var(--pixel-error)`, `var(--pixel-accent)`, etc. This enables theming.

9. **Loading states use LoadingSkeleton or pixel-blink animation.** Never show a lucide Loader2 spinner with `text-indigo-500`. Use the pixel-themed shimmer skeleton or three-dot blink pattern.

10. **Social features should feel ambient, not transactional.** Friends activity is a feed, not a leaderboard. Quests are shared goals, not competitions. Cheers are warm gestures. Never rank friends by performance.
