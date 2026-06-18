# UX Audit — Requirements

## Overview

Resolve all P0 and P1 UX issues identified in the Nora deep UX audit. The goal is to eliminate the "split personality" between pixel-art themed pages and legacy SaaS-white styled pages, ensure mobile navigation works, and protect users from accidental destructive actions.

## Guiding Principle

> Every screen must feel cozy, social, and motivating. No punishment, no anxiety, no confusion.

---

## Functional Requirements

### FR-1: Mobile Navigation
- **FR-1.1:** On viewports < 768px, a fixed bottom navigation bar with 5 primary tabs must be visible on all app pages (excluding onboarding).
- **FR-1.2:** The bottom nav must provide min 44×44px touch targets per tab.
- **FR-1.3:** Main content must not be obscured by the bottom nav (appropriate bottom padding).

### FR-2: Global Error & Loading States
- **FR-2.1:** The global error boundary must use the pixel-art design system (DialogFrame, PixelButton, pixel CSS vars). No lucide icons, no Tailwind color classes.
- **FR-2.2:** The global loading state must use pixel-art design system (LoadingSkeleton or pixel-themed animation). No indigo/lucide elements.
- **FR-2.3:** Error messages must be warm and blame-free, with an actionable retry option.

### FR-3: Destructive Action Safety
- **FR-3.1:** All destructive actions (delete card, delete subject, delete topic, leave party) must require explicit confirmation via a pixel-themed modal dialog.
- **FR-3.2:** The confirmation dialog must be keyboard-accessible (Tab cycles buttons, Escape cancels).
- **FR-3.3:** Confirmation copy must name the action and state whether it's reversible.
- **FR-3.4:** No native `window.confirm()` or `window.alert()` calls anywhere in the app.

### FR-4: Visual Consistency — Review & Study Sessions
- **FR-4.1:** Review Cards page and ReviewSession component must use pixel-ui components exclusively (DialogFrame, PixelButton, PixelProgressBar, pixel-panel).
- **FR-4.2:** Study Mix page and StudySession component must use pixel-ui components exclusively.
- **FR-4.3:** Grade buttons (0–5) must use pixel theme color vars, not raw Tailwind color classes.
- **FR-4.4:** Session complete screens must use pixel-panel styling with PixelButton for actions.
- **FR-4.5:** Progress indicators must use PixelProgressBar (segmented bar), not rounded-full Tailwind bars.

### FR-5: Visual Consistency — Social & Analytics
- **FR-5.1:** Party page (discovery + member view) must use pixel-ui components exclusively.
- **FR-5.2:** Analytics dashboard must use PixelStatCard, PixelBarChart, and PixelHeatmap.
- **FR-5.3:** History page (filters + list) must use pixel-ui components exclusively.
- **FR-5.4:** Weekly Calendar must use pixel-panel, pixel vars, and PixelButton for navigation.

### FR-6: Empty States & Feedback
- **FR-6.1:** Every page that can have zero data must render a meaningful empty state using the EmptyState component (icon + message + action).
- **FR-6.2:** All error displays must use ErrorState or DialogFrame with state="error" — never raw red text.
- **FR-6.3:** Loading states must use LoadingSkeleton — never plain text like "Loading...".

### FR-7: Gamification Context
- **FR-7.1:** XP bar and coins display in the top bar must have tooltip text explaining what they are and how they're earned.
- **FR-7.2:** Collection page must explain the relationship between coins and unlockables.

---

## Non-Functional Requirements

### NFR-1: No Schema Changes
All improvements are UI-only. No database migrations, no new tables, no new server actions beyond what already exists.

### NFR-2: No New Routes
No new pages or API routes. All changes modify existing components.

### NFR-3: Independent Commits
Each task must be independently committable and must not break other features.

### NFR-4: Accessibility
- All interactive elements must have appropriate ARIA attributes.
- Confirmation dialogs must trap focus and support keyboard navigation.
- Touch targets on mobile must be ≥ 44×44 CSS pixels.

### NFR-5: Performance
- No additional JavaScript bundles beyond what's already loaded.
- Component reskins reuse existing pixel-ui library — no new heavy dependencies.
