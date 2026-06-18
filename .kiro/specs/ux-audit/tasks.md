# UX Audit — Tasks

## Sprint 1: Pre-Demo (P0 Fixes)

### Task 1: Render BottomNav in App Layout
- **Requirements:** FR-1.1, FR-1.2, FR-1.3
- **Files:** `src/app/(protected)/app/layout.tsx`
- **Steps:**
  1. Import `BottomNav` from `@/components/pixel-ui`
  2. Render `<BottomNav />` after `</main>` inside the `flex-1 flex flex-col` div
  3. Add `pb-20 md:pb-8` to `<main>` className to prevent content hiding behind fixed nav
- **Acceptance:** BottomNav visible on mobile (<768px), hidden on desktop. 5 tabs navigate. Content not obscured.
- **Status:** not started

### Task 2: Replace error.tsx with Pixel-Themed Error
- **Requirements:** FR-2.1, FR-2.3
- **Files:** `src/app/(protected)/app/error.tsx`
- **Steps:**
  1. Remove lucide-react imports (AlertTriangle)
  2. Import `DialogFrame`, `PixelButton` from `@/components/pixel-ui`
  3. Render centered DialogFrame with state="error", pixel-font heading "Something went wrong", error.message in sans-serif, PixelButton variant="danger" for retry
- **Acceptance:** No lucide icons, no Tailwind color classes. Uses pixel-ui components. Retry works.
- **Status:** not started

### Task 3: Replace loading.tsx with Pixel-Themed Loading
- **Requirements:** FR-2.2
- **Files:** `src/app/(protected)/app/loading.tsx`
- **Steps:**
  1. Remove lucide-react import (Loader2)
  2. Import `LoadingSkeleton` from `@/components/pixel-ui`
  3. Render centered LoadingSkeleton with height={80} and a font-pixel "Loading..." label using pixel-text-secondary color
- **Acceptance:** No lucide icons, no indigo colors. Uses pixel-ui LoadingSkeleton. Matches dark theme.
- **Status:** not started

### Task 4: Create PixelConfirmDialog Component
- **Requirements:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, NFR-4
- **Files:** `src/components/pixel-ui/confirm-dialog.tsx`, `src/components/pixel-ui/index.ts`
- **Steps:**
  1. Create confirm-dialog.tsx with props: open, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel
  2. Render fixed overlay (inset-0 z-50 bg-black/50) with centered DialogFrame
  3. Title in font-pixel, message in sans-serif, Cancel (PixelButton secondary) + Confirm (PixelButton danger)
  4. Implement focus trap: on open, focus Cancel. Tab cycles between buttons only. Escape calls onCancel. Backdrop click calls onCancel.
  5. Add role="alertdialog", aria-modal="true", aria-labelledby, aria-describedby
  6. Export from index.ts barrel
- **Acceptance:** Modal appears on open=true. Keyboard accessible. Escape/backdrop closes. ARIA attributes present. Exported from pixel-ui.
- **Status:** not started

### Task 5: Re-skin Review Page and ReviewSession
- **Requirements:** FR-4.1, FR-4.3, FR-4.4, FR-4.5
- **Files:** `src/app/(protected)/app/review/page.tsx`, `src/app/(protected)/app/review/_components/review-session.tsx`
- **Steps:**
  1. **page.tsx:** Replace 3-stat grid (white cards, lucide icons) with pixel-panel stat tiles using pixel vars. Remove Layers/CheckCircle/Clock imports. Remove the 2 placeholder "—" stats or compute real values.
  2. **page.tsx:** Replace error div (red-50 border) with DialogFrame state="error".
  3. **page.tsx:** Replace empty state (white card) with EmptyState component.
  4. **review-session.tsx:** Replace card wrapper (rounded-lg border-zinc bg-white) with DialogFrame.
  5. **review-session.tsx:** Replace "Reveal Answer" button with PixelButton variant="secondary".
  6. **review-session.tsx:** Replace 6 grade buttons with pixel-themed buttons using color vars from design.md.
  7. **review-session.tsx:** Replace progress bar (rounded-full bg-indigo) with PixelProgressBar.
  8. **review-session.tsx:** Replace session complete screen with DialogFrame + PixelButton.
  9. **review-session.tsx:** Replace all text color classes (zinc-*) with pixel var equivalents.
- **Acceptance:** Zero bg-white, border-zinc, bg-indigo, or lucide icon imports remain. All containers use pixel-panel/DialogFrame. All buttons use PixelButton. Progress uses PixelProgressBar.
- **Status:** not started

### Task 6: Re-skin Study Mix Page and StudySession
- **Requirements:** FR-4.2, FR-4.3, FR-4.4, FR-4.5
- **Files:** `src/app/(protected)/app/study/page.tsx`, `src/app/(protected)/app/study/_components/study-session.tsx`
- **Steps:**
  1. **page.tsx:** Replace error div with DialogFrame state="error".
  2. **page.tsx:** Replace empty state (white card with Shuffle icon) with EmptyState component.
  3. **page.tsx:** Replace "low diversity" hint (amber-50 border) with DialogFrame state="warning".
  4. **study-session.tsx:** Replace card wrapper with DialogFrame.
  5. **study-session.tsx:** Replace type badges (rounded-full bg-indigo-100) with pixel-panel-inset spans.
  6. **study-session.tsx:** Replace grade buttons with pixel-themed grade buttons (same as Task 5).
  7. **study-session.tsx:** Replace progress bar with PixelProgressBar.
  8. **study-session.tsx:** Replace session complete screen with pixel-ui components.
  9. **study-session.tsx:** Replace "Skip" link and all nav buttons with PixelButton.
  10. **study-session.tsx:** Replace all zinc/indigo text classes with pixel var equivalents.
- **Acceptance:** Same criteria as Task 5 — zero legacy Tailwind color classes, all pixel-ui components.
- **Status:** not started

### Task 7: Add Confirmation to Delete Card
- **Requirements:** FR-3.1, FR-3.3
- **Files:** `src/app/(protected)/app/review/_components/review-session.tsx`
- **Steps:**
  1. Import PixelConfirmDialog from pixel-ui
  2. Add state: `const [confirmDelete, setConfirmDelete] = useState(false)`
  3. Replace the delete button onClick to set confirmDelete=true instead of calling deleteCard directly
  4. Render PixelConfirmDialog with message "This card and its review history will be permanently removed." confirmLabel="Delete" onConfirm → call deleteCard + advance + close dialog. onCancel → close dialog.
- **Acceptance:** Clicking "Delete card" shows pixel-themed confirmation. Cancel returns to card. Confirm deletes and advances. No immediate deletion on click.
- **Status:** not started

---

## Sprint 2: Pre-Ship (P1 Fixes)

### Task 8: Re-skin Party Discovery
- **Requirements:** FR-5.1
- **Files:** `src/app/(protected)/app/party/_components/party-discovery.tsx`, `src/app/(protected)/app/party/_components/create-party-form.tsx`
- **Acceptance:** No bg-white/zinc/indigo classes. Uses DialogFrame, PixelButton, PixelInput, LoadingSkeleton, EmptyState.
- **Status:** not started

### Task 9: Re-skin Party Page
- **Requirements:** FR-5.1, FR-3.1, FR-3.4
- **Files:** `src/app/(protected)/app/party/_components/party-page.tsx`, `party-members.tsx`, `party-quests.tsx`, `party-messages.tsx`, `party-cheers.tsx`, `party-admin.tsx`
- **Acceptance:** No window.confirm(). Uses PixelConfirmDialog for leave. All sections in DialogFrame. All buttons PixelButton.
- **Status:** not started

### Task 10: Re-skin Analytics Dashboard
- **Requirements:** FR-5.2
- **Files:** `src/app/(protected)/app/analytics/_components/analytics-dashboard.tsx`
- **Acceptance:** Uses PixelStatCard, PixelBarChart, PixelHeatmap. No bg-white/zinc containers.
- **Status:** not started

### Task 11: Re-skin History Page
- **Requirements:** FR-5.3
- **Files:** `src/app/(protected)/app/history/_components/history-filters.tsx`, `history-list.tsx`
- **Acceptance:** Filters use pixel-panel-inset toggles. Cards use pixel-panel. Empty state uses EmptyState component. No indigo/zinc styling.
- **Status:** not started

### Task 12: Re-skin Weekly Calendar
- **Requirements:** FR-5.4
- **Files:** `src/app/(protected)/app/planner/_components/weekly-calendar.tsx`
- **Acceptance:** Nav bar in pixel-panel. Day cells in pixel-panel-inset. Today highlight uses pixel-accent. No white/zinc/indigo.
- **Status:** not started

### Task 13: Add XP/Coins Tooltips
- **Requirements:** FR-7.1, FR-7.2
- **Files:** `src/app/(protected)/app/_components/game-top-bar.tsx`, `src/app/(protected)/app/collection/page.tsx`
- **Acceptance:** Hovering XP bar shows explanatory text. Hovering coins shows explanatory text. Collection page has intro sentence about coins.
- **Status:** not started

### Task 14: Fix Study Room Search Panel Styling
- **Requirements:** FR-4.1 (consistency)
- **Files:** `src/app/(protected)/app/study-room/_components/study-room-layout.tsx`
- **Acceptance:** Collapsible search panel uses pixel-panel. No zinc/white classes in that section.
- **Status:** not started

---

## Sprint 3: Polish (P2 + P3)

### Task 15: Re-skin Subjects Manager
- **Files:** `src/app/(protected)/app/settings/_components/subjects-manager.tsx`
- **Acceptance:** Uses PixelInput, PixelButton, pixel-panel-inset. Deletes require PixelConfirmDialog.
- **Status:** not started

### Task 16: Replace Feynman Editor Button Overrides
- **Files:** `src/app/(protected)/app/feynman/_components/feynman-editor.tsx`
- **Acceptance:** No `!bg-` or `!text-` important overrides. All action buttons are PixelButton.
- **Status:** not started

### Task 17: Fix Review Stats Placeholders
- **Files:** `src/app/(protected)/app/review/page.tsx`
- **Acceptance:** No stat cards show "—". Either removed or showing real data.
- **Status:** not started

### Task 18: Add Loading State to Party Discovery
- **Files:** `src/app/(protected)/app/party/_components/party-discovery.tsx`
- **Acceptance:** Loading shows LoadingSkeleton, not plain text.
- **Status:** not started

### Task 19: Add Planner Empty State
- **Files:** `src/app/(protected)/app/planner/page.tsx`
- **Acceptance:** Empty week shows EmptyState with guidance + action link.
- **Status:** not started

### Task 20: Standardize Error Messages
- **Files:** Multiple pages (party, planner, study, history)
- **Acceptance:** No raw red-text errors. All use ErrorState or DialogFrame state="error" with human-friendly copy.
- **Status:** not started

### Task 21: Improve Feynman Empty State
- **Files:** `src/app/(protected)/app/feynman/page.tsx`
- **Acceptance:** Uses EmptyState component with icon, message, actionHref.
- **Status:** not started

### Task 22: Style Music Player Volume Slider
- **Files:** `src/app/(protected)/app/_components/music-player.tsx` or `src/app/globals.css`
- **Acceptance:** Volume slider matches pixel theme. No browser-default blue slider.
- **Status:** not started

### Task 23: Give forest_rescue Unique Display
- **Files:** `src/app/(protected)/app/_components/game-sidebar.tsx`
- **Acceptance:** forest_rescue shows "🌲 Lost in forest" in warning color, distinct from sad.
- **Status:** not started

### Task 24: Remove Dead Lucide Imports
- **Files:** `src/app/(protected)/app/_components/profile-popover.tsx`
- **Acceptance:** No unused imports. Rendered output unchanged.
- **Status:** not started
