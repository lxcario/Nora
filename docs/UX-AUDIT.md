# Nora — UX Audit Report

> **Date:** June 24, 2026
> **Method:** Code-level inspection of all UI components, page files, CSS, and user flows. Cross-referenced with [Nielsen's 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), modern UX audit checklists, and progressive disclosure research.
> **Scope:** Loading states, error handling, accessibility, mobile responsiveness, feedback mechanisms, progressive disclosure, form validation, and micro-interactions.

---

## Executive Summary

Nora's UX is **above average for a project at this stage**. The component library is well-architected, accessibility basics are mostly covered, and the pixel-art theming is consistently applied. However, there are several senior-level gaps that would improve the experience meaningfully.

**Overall rating: 7/10**

| Category | Score | Notes |
|----------|-------|-------|
| Loading States | 8/10 | Route-level skeleton is excellent; per-component loading could improve |
| Error Handling | 7/10 | Error boundary exists; inline error recovery patterns are inconsistent |
| Accessibility | 7/10 | Good ARIA, reduced-motion, focus styles; some gaps in announcements |
| Mobile UX | 8/10 | Bottom nav is solid; "More" drawer works well; touch targets correct |
| Feedback & Micro-interactions | 9/10 | The strongest area — toasts, sounds, animations are cohesive |
| Progressive Disclosure | 5/10 | Biggest gap — all features visible at once, no guided onboarding |
| Form Validation | 6/10 | Per-field errors exist but no inline validation or prevention patterns |
| Navigation & Wayfinding | 7/10 | Sidebar accordion works but information density is high |

---

## Findings by Nielsen's Heuristics

### H1: Visibility of System Status ✅ Mostly Good

**What's working:**
- Toast notifications for XP/coin rewards with progress bars
- Loading skeleton matches the actual dashboard layout (structural fidelity)
- XP bar in top bar provides real-time progress feedback
- Pixel-art shimmer animation on skeletons is distinctive and on-brand

**Gaps identified:**

1. **No loading indicator on server actions** — When a user submits a Feynman explanation or triggers a research query, there's no inline loading state between button click and result. The `PixelButton` has a `loading` prop (shows `...`) but it's up to each page to wire it. Some pages may forget.

2. **No progress indicator on multi-step AI operations** — The Research Desk queries 3 APIs (OpenAlex, Crossref, Unpaywall) then synthesizes. Users see nothing until the full result arrives. A stepped progress indicator ("Searching academic databases... Synthesizing...") would reduce perceived wait time.

3. **Background ingestion has no persistent status** — University onboarding triggers background jobs but there's no visible indicator on subsequent visits (e.g. a subtle badge on the University nav item showing "indexing...").

---

### H2: Match Between System and Real World ✅ Good

**What's working:**
- Pixel-art metaphors are consistent (potions = health/streak, coins = currency, book = review)
- RPG terminology fits the gaming audience (XP, level up, quests, pet companion)
- Academic terminology is correct (FSRS, spaced repetition, interleaving)
- Time-of-day greeting in the top bar creates warmth

**Gaps:**

4. **"Feynman Mode" may confuse non-physics students** — The name assumes familiarity with Feynman's "explain it simply" technique. A subtitle like "Explain & Get Feedback" already exists in the page header but isn't visible in navigation. Consider adding a 1-line tooltip on first visit.

---

### H3: User Control & Freedom ✅ Good

**What's working:**
- Confirm dialog with focus trap for destructive actions
- Sidebar accordion state persists in localStorage
- "Try again" on error boundary

**Gaps:**

5. **No undo for card reviews** — Once you grade a card (Again/Hard/Good/Easy), it's committed immediately. A brief (3-5s) "Undo last grade" toast would provide escape without disrupting flow. FSRS state is cheap to revert since `scheduleReview` is pure.

6. **No "back to previous" after completing a Feynman session** — After submitting an explanation and seeing results, there's no easy way to go back and re-explain (iterative refinement exists but requires explicit UI discovery).

---

### H4: Consistency & Standards ✅ Excellent

**What's working:**
- Pixel-panel, pixel-button, pixel-input are used uniformly everywhere
- Color system is consistent via CSS variables
- Font hierarchy (pixel font for labels, Geist for body) never breaks
- Every theme palette overrides ALL variables — no broken states
- The animation system uses `steps()` consistently for the pixel aesthetic

This is one of Nora's strongest areas. The component library enforces consistency at the architectural level.

---

### H5: Error Prevention ⚠️ Needs Work

7. **No inline validation on Feynman text area** — Users can submit a 5-word "explanation" and get back a full AI evaluation that just says "too short." Preventing submission below a minimum character count (e.g. 50 chars) with a live character counter would save a round-trip.

8. **No confirmation before navigating away from unsaved work** — If a user has typed a 500-word Feynman explanation and accidentally clicks a sidebar link, their work is gone. No `beforeunload` or route-change guard exists.

9. **Research query can be submitted empty** — The ResearchDesk component likely validates server-side, but a client-side guard on empty/whitespace-only queries would prevent a wasted API call.

10. **No duplicate card detection** — Creating the same flashcard twice (same front text) is silently allowed. A "Similar card exists" warning before save would prevent duplication.

---

### H6: Recognition Rather Than Recall ✅ Good

**What's working:**
- Dashboard shows cards-due count prominently
- Quest progress is always visible
- Sidebar shows the pet's mood state
- Primary CTA changes based on context (cards due → review; no cards → Feynman)

**Gap:**

11. **No breadcrumb or "you are here" indicator** — On deep pages (e.g. `/app/study-room`), the sidebar accordion shows the active page, but there's no persistent breadcrumb trail. With 8+ sub-items in the Study accordion, users can lose context.

---

### H7: Flexibility & Efficiency of Use ✅ Good

**What's working:**
- Keyboard shortcuts (Ctrl+Shift+T for timestamp marks in Study Room)
- Multiple theme palettes
- Custom cursor packs
- Animation kill switch
- Material-type configuration per topic

**Gaps:**

12. **No keyboard shortcuts for core study actions** — Card grading (1=Again, 2=Hard, 3=Good, 4=Easy) could use number keys. Feynman submit could use Ctrl+Enter. These are power-user accelerators that don't affect beginners.

13. **No "quick add card" from anywhere** — A global Cmd+K style command palette or floating action button for "add card" would reduce friction for the most common write action.

---

### H8: Aesthetic & Minimalist Design ✅ Excellent

The pixel-art theming is the app's standout quality. The 8px grid, limited color palette, sprite-based borders, and stepped animations create a cohesive "cozy RPG" feel without sacrificing usability.

**Minor concern:**

14. **Dashboard information density** — The dashboard has 5 sections (briefing, CTA, stats, quests, friends). On a 13" laptop without scrolling, users likely only see 2-3 sections above the fold. Consider whether the quest panel should be collapsible after completion ("All done today!" → collapse to a single line badge).

---

### H9: Help Users Recognize, Diagnose, and Recover From Errors ✅ Good

**What's working:**
- Error boundary shows user-friendly message with retry
- ErrorState component has a distinct pixel-art "X" icon
- Input errors display inline with `role="alert"` and red text
- Server action errors surface via DialogFrame with error state

**Gap:**

15. **No contextual help for AI failures** — When Groq is rate-limited or unavailable, users see a generic error. A more specific message ("AI provider is busy — try again in 30 seconds" or "Tip: shorter explanations process faster") would help.

---

### H10: Help & Documentation ⚠️ Missing

16. **No in-app help or onboarding tour** — New users land on the dashboard and must discover all 10+ features through exploration. There's no guided tour, tooltip walkthrough, or "What's this?" contextual help. Progressive disclosure research shows this is a critical gap for complex applications.

17. **No FAQ or help section in the app** — Users with questions have no in-app resource. Even a simple "How does spaced repetition work?" contextual link on the Review page would help.

---

## Progressive Disclosure Assessment

This is the **biggest UX improvement opportunity**. Research from [UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure) and [Interaction Design Foundation](https://www.interaction-design.org/encyclopedia/progressive_disclosure.html) shows that progressive disclosure reduces cognitive overload by revealing features incrementally.

**Current state:** All 8+ study features are visible in the sidebar from day 1. A new user sees: Review Cards, Study Mix, Feynman Mode, Practice Exam, Research Desk, Study Room, Study Planner, My University — all at once. This is overwhelming for a first-time user who hasn't even created subjects yet.

**Recommendations:**

18. **Feature unlock progression** — Hide features behind natural milestones:
   - Day 1: Dashboard + Create Subject + Feynman Mode
   - After first explanation: Review Cards unlocked
   - After 5 cards created: Study Mix unlocked
   - After first research: Research Desk fully visible
   - This doesn't BLOCK access (users can still navigate manually) — it just reduces the sidebar clutter for new users

19. **First-use contextual hints** — When a user visits a feature for the first time, show a single-paragraph explanation in a collapsible panel at the top (not a modal). After dismissal, it never appears again (store in localStorage or profile).

20. **Empty state CTAs should chain** — Currently empty states point generically to Settings. They should chain logically: Review empty → "Create cards via Feynman Mode →" → Feynman empty → "Add subjects first →"

---

## Mobile-Specific Findings

21. **Bottom nav only shows 4 items + More** — This is correct per mobile UX guidelines. The "More" drawer grid is also well-implemented (4-column, icon + label, pixel font). No issues here.

22. **Top bar XP progress is hidden on mobile (`hidden sm:flex`)** — Mobile users don't see their XP progress at all. Consider showing it in a different way (e.g. the pet widget or a compact level badge visible on mobile).

23. **No swipe gestures for card review** — On mobile, swiping left/right is the expected interaction pattern for card review (a la Tinder/Anki). Currently only button taps are supported. This is an advanced enhancement but would significantly improve the mobile review experience.

---

## Accessibility Findings

**What's already excellent:**
- `prefers-reduced-motion` kills ALL animations
- `[data-animations="off"]` provides a manual override
- Custom cursor system is gated behind `@media (hover: hover) and (pointer: fine)` — touch devices unaffected
- PixelButton uses `aria-disabled`, `aria-busy`
- PixelInput uses `aria-invalid`
- ConfirmDialog has `role="alertdialog"`, `aria-modal`, focus trap, Escape handling
- Toast uses `role="status"`, `aria-live="polite"`, `aria-atomic="true"`
- Focus-visible styles are present (`3px solid var(--pixel-accent)`)

**Gaps:**

24. **No skip-to-content link** — Keyboard users navigating the sidebar must tab through every nav item to reach the main content area. A hidden "Skip to main content" link (visible on focus) is a WCAG 2.1 AA requirement for complex navigation.

25. **Custom cursor overrides `!important` on `*`** — While the media query gate protects touch devices, screen-reader or switch-control users on desktop may be affected by the forced cursor override. Consider allowing a preference to disable custom cursors (the cursor-picker exists but the override is always-on within the media query).

26. **No `aria-current="page"` on active nav items** — The sidebar uses `data-state="selected"` for styling but doesn't communicate the current page to assistive technologies via `aria-current`.

27. **Toast auto-dismiss without user action** — Toasts disappear after 3 seconds by default. WCAG 2.2.1 (Timing Adjustable) suggests users should be able to extend or dismiss notifications themselves. The toast has no close button — only a progress bar countdown.

---

## Performance-Related UX

28. **Layout.tsx makes 3-4 sequential Supabase queries** — User auth, academic profile, profile stats, avatar, and pet data are fetched sequentially. This adds up to ~200-400ms before the layout renders. Parallelizing with `Promise.all` where possible would reduce time-to-interactive.

29. **No optimistic updates for gamification** — When a user reviews a card, the XP/coin reward is applied server-side and the UI waits for revalidation. The `SessionStatsProvider` context tracks deltas client-side (good!), but there's still a flash between action and visual feedback for the top bar stats.

30. **Large CSS file** — `globals.css` is comprehensive (~700+ lines of custom styles, themes, animations). While this is fine for initial load (one CSS file), consider whether the theme palette definitions (forest, ocean, lavender, rose, ember) could be lazily loaded since most users will only ever use 1-2.

---

## Recommendations Summary (Prioritized)

### P0 — Fix Before Hackathon (Impacts TestSprite Testing)
| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Add loading indicator on Feynman/Research server actions | 30 min | Prevents "is it broken?" confusion during testing |
| 8 | `beforeunload` guard on unsaved Feynman explanations | 20 min | Prevents data loss that would fail a TestSprite test |
| 24 | Skip-to-content link | 10 min | WCAG compliance, accessible testing |

### P1 — High Impact, Low Effort (Build Week Candidates)
| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 5 | Undo last card review (3s toast) | 1 hour | Major UX win for review flow |
| 7 | Min-length validation on Feynman textarea | 15 min | Prevents wasted AI calls |
| 12 | Keyboard shortcuts for card grading (1-4) | 30 min | Power-user efficiency |
| 15 | Contextual AI error messages | 30 min | Better error recovery |
| 26 | `aria-current="page"` on nav items | 15 min | Accessibility compliance |

### P2 — Medium Impact, Medium Effort (Post-Hackathon)
| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 2 | Stepped progress for Research queries | 2 hours | Perceived performance |
| 16 | In-app onboarding tour (first visit) | 4 hours | Reduces abandonment |
| 18 | Progressive feature unlock | 3 hours | Reduces overwhelm |
| 22 | Mobile XP/level indicator | 1 hour | Mobile engagement |
| 27 | Toast close button + pause on hover | 30 min | WCAG timing compliance |
| 28 | Parallelize layout.tsx queries | 30 min | Faster initial render |

### P3 — Nice to Have (Future)
| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 10 | Duplicate card detection | 3 hours | Data quality |
| 13 | Global command palette (Cmd+K) | 4 hours | Power-user delight |
| 19 | First-use contextual hints | 3 hours | Learning curve |
| 23 | Swipe gestures for mobile review | 4 hours | Mobile native feel |
| 30 | Lazy-load palette CSS | 1 hour | Minor perf gain |

---

## What NOT to Change

These are things that might look like "issues" to a generic UX auditor but are actually **correct design decisions** for Nora:

- **The pixel font for navigation labels** — It's intentionally on-brand. Don't switch to a "more readable" sans-serif for nav. The entire identity is pixel-art.
- **Sound effects on button click** — Some auditors flag this as "distracting." For Nora's audience (gamified study), it's a core engagement mechanic. The mute toggle exists.
- **Custom cursors** — They're gated behind pointer:fine and add delight. Keep them.
- **No dark/light toggle on landing page** — The landing is always dark-themed. This is intentional branding.
- **5-section dashboard** — While dense, every section serves a purpose (briefing, CTA, stats, quests, social). The alternative (separate pages for each) would add clicks.

---

## Conclusion

Nora's UX is production-quality with genuine craftsmanship in the component library, theming system, and micro-interactions. The main gaps are in **progressive disclosure** (new users see everything at once), **error prevention** (no beforeunload, no inline validation), and **a few accessibility details** (skip-link, aria-current, toast timing).

For the hackathon specifically, items #1, #8, and #24 should be fixed before build week starts — they directly affect whether TestSprite tests can interact with the app cleanly. The rest can be addressed during or after the event.

---

*Sources: [Nielsen Norman Group Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | [UXPin Progressive Disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure) | [Accessibility Checker Microinteractions](https://www.accessibilitychecker.org/blog/microinteractions/) | [CourseUX Audit Checklist](https://courseux.com/ux-audit-checklist/)*

Content was rephrased for compliance with licensing restrictions.
