# Craft Backlog

The consolidated, prioritized to-do list pulled from all six audits. Each item: ID, what, why it matters, affected files, severity, difficulty, impact, and concrete steps. Cross-references point to the source audit.

**How to read severity:** P0 = breaks a core promise in `docs/CRAFT.md` / `VOICE.md` / `DESIGN_PRINCIPLES.md`. P1 = noticeable craft gap. P2 = polish. A/AA = accessibility barrier.

**The one-paragraph state of Nora:** The foundations are genuinely strong — a real voice spec, a real design-token system, grounded AI, a hand-written companion engine, and an above-average accessibility baseline. Nora doesn't need rescuing; it needs *consistency*. The product currently keeps its promises about 70% of the time and breaks them at the edges (the landing page, a streak counter, off-theme components, smooth spinners, random companion lines). Close that 30% gap and Nora becomes software people could still love in ten years.

---

## Tier 0 — Resolve the contradictions (do first)

These are the items where the code *actively disagrees with the manifesto*. Fixing them is the difference between integrity and marketing.

### CB-1 · Resolve the streak contradiction
- **Why:** `WHY_NORA.md` and `DESIGN_PRINCIPLES.md` #2 forbid streaks; the README brags about not having them; the app ships a streak counter and a "streak at risk" proposal. Streak-anxiety is well-documented ([The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)). (AI_SLOP P0-3, UX_CRAFT P0-A, README R/streak)
- **Files:** `src/app/(protected)/app/page.tsx` (Streak AmbientStat + commented proposal), `src/lib/companion-dialogue.ts` (streak rules), `src/lib/streak.ts`, `src/lib/format-streak.ts`, `docs/SPEC-STREAKS-WIDGET.md`
- **Severity:** P0 · **Difficulty:** Medium · **Impact:** High
- **Steps:** Replace the streak stat with a non-breakable "rhythm" framing ("shown up 4 of the last 7 days") or lean on the Memory Garden; delete the "streak at risk" comment block; rewrite the two streak companion lines to be presence-based, not count-based; update or delete the streak spec doc.

### CB-2 · Make the companion remember (stop per-render randomness)
- **Why:** `CRAFT.md` #1 "Memory, not personalization — remember before it asks." A line that changes on every refresh is dice, not memory. (UX_CRAFT P0-A)
- **Files:** `src/lib/companion-dialogue.ts` (`getCompanionLine` uses `Math.random()`), `src/app/(protected)/app/page.tsx`
- **Severity:** P0 · **Difficulty:** Low · **Impact:** High
- **Steps:** Seed selection deterministically from `hash(userId + localDate)`; line changes only when context changes. ~5 lines.

### CB-3 · Re-voice the landing page
- **Why:** First impression; currently a different (marketing) voice than the README and app. (AI_SLOP P0-1, COPY_REWRITE §1)
- **Files:** `src/app/_components/landing-content.tsx`
- **Severity:** P0 · **Difficulty:** Low · **Impact:** High
- **Steps:** Apply COPY_REWRITE §1 table; match the README's register; drop "vibes/TikTok/no catch/Get Started."

### CB-4 · Delete or replace the generic-quotes feature
- **Why:** Random celebrity quotes are textbook slop and violate "Memory, not personalization." (AI_SLOP P0-2)
- **Files:** `src/app/(protected)/app/_actions/quotes.ts` (+ any caller)
- **Severity:** P0 · **Difficulty:** Low · **Impact:** Medium-High
- **Steps:** Remove the ZenQuotes fetch; if a "thought for today" is wanted, draw from the learner's own journey or a small set of local, on-voice lines.

---

## Tier 1 — Make it look and sound like one product

### CB-5 · Kill off-theme Tailwind colors
- **Why:** `indigo/violet/zinc/amber-600` etc. break the warm `--pixel-*` system and ignore the palette switcher — the clearest "generated, never finished" tell. (COMPONENT P0-1)
- **Files:** `party/_components/party-admin.tsx`, `study-room/_components/feynman-video-prompt.tsx` (+ grep the tree)
- **Severity:** P0(visual) · **Difficulty:** Medium · **Impact:** High
- **Steps:** Replace with `PixelButton`/`DialogFrame`/`--pixel-*`; remove `dark:` color variants; grep-sweep for stray palette classes.

### CB-6 · One pixel loading spinner + centralized loading copy
- **Why:** Smooth lucide spinners contradict the stepped-motion philosophy; "Loading…" contradicts VOICE.md's "Thinking…". (UX_CRAFT P1-E, COMPONENT P1-3, COPY_REWRITE §3, AI_SLOP P1-5)
- **Files:** all `Loader2 animate-spin` sites; new `pixel-ui/PixelSpinner`; new `lib/copy.ts`
- **Severity:** P1 · **Difficulty:** Low-Medium · **Impact:** Medium (high frequency)
- **Steps:** Build `PixelSpinner` (stepped, reuses existing keyframes, honors reduced-motion); replace all `Loader2`; create `LOADING` copy constants and use them.

### CB-7 · Centralize error/result/empty copy in Nora's voice
- **Why:** "Retry", "SOMETHING WENT WRONG", "Error: {digest}", "Excellent!", "✗ False alarm" all violate VOICE.md and NN/g [error guidance](https://www.nngroup.com/articles/error-message-guidelines/). (AI_SLOP P1-6, COPY_REWRITE §4–6)
- **Files:** `pixel-ui/error-state.tsx`, `exam/error.tsx`, `exam/_components/exam-results.tsx`, `error-spotter/_components/error-spotter-client.tsx`, `lib/copy.ts`
- **Severity:** P1 · **Difficulty:** Low · **Impact:** Medium-High
- **Steps:** Apply COPY_REWRITE tables; never surface raw digests/stack to users; route all of it through `lib/copy.ts`.

### CB-8 · Componentize empty states
- **Why:** Hand-rolled empties drift; first-run screens should be identical and on-voice. (COMPONENT P1-4)
- **Files:** `memory-map/page.tsx`, `party/_components/*`, `research/_components/paper-library.tsx`, `rag-query-panel.tsx`; extend `pixel-ui/empty-state.tsx` with optional `description`
- **Severity:** P1 · **Difficulty:** Low-Medium · **Impact:** Medium

### CB-9 · Re-voice pet & onboarding-tour copy (remove guilt + exclamation)
- **Why:** "misses you", "cheer them up!", "You got this!" reintroduce guilt and pep-talk the philosophy rejects. (AI_SLOP P1-7, COPY_REWRITE §7)
- **Files:** `room/_components/pixel-room.tsx`, `pixel-ui/onboarding-tour.tsx`, `_components/game-top-bar.tsx`
- **Severity:** P1 · **Difficulty:** Low · **Impact:** Medium

### CB-10 · Fix command-palette voice ("Dashboard" → "Today", etc.)
- **Why:** Ships a banned word + SaaS descriptions. (AI_SLOP P1-4, COPY_REWRITE §2)
- **Files:** `pixel-ui/command-palette.tsx`
- **Severity:** P1 · **Difficulty:** Low · **Impact:** Medium

---

## Tier 2 — Atmosphere & living world (the "feels alive" tier)

### CB-11 · Deliver time-of-day atmosphere + fix the timezone greeting bug
- **Why:** `CRAFT.md` #4 promises it; greeting currently uses UTC not `profile.timezone`. (UX_CRAFT P0-B)
- **Files:** `src/app/(protected)/app/page.tsx` (`serverHour` UTC bug), `globals.css` (grid/glow vars)
- **Severity:** P1 (bug is P0-ish) · **Difficulty:** Medium · **Impact:** High
- **Steps:** Compute daypart from user timezone; add `[data-daypart]` and shift `--grid-glow`/`--grid-bg-base` subtly; static under reduced-motion.

### CB-12 · Tier celebration so silence becomes meaningful
- **Why:** `CRAFT.md` #5 "Silence is part of the experience"; every reward currently fires a toast. (UX_CRAFT P1-C)
- **Files:** `pixel-ui/toast.tsx`, `_components/xp-toast.tsx`, reward call sites
- **Severity:** P1 · **Difficulty:** Medium · **Impact:** Medium-High
- **Steps:** Small actions → ambient/silent; sessions → toast; rare/meaningful → the loud wiggle+sound.

### CB-13 · Environmental acknowledgment of return/absence
- **Why:** Return is text-only; the room should wordlessly respond. (UX_CRAFT P1-D)
- **Files:** `room/_components/pixel-room.tsx`
- **Severity:** P1 · **Difficulty:** Medium-High · **Impact:** Medium (high payoff, low frequency)

### CB-14 · Replace landing scroll-reveal easing with the app's motion language
- **Why:** Smooth 0.7s ease on the landing fights the app's stepped motion. (UX_CRAFT P1-G)
- **Files:** `landing-content.tsx`
- **Severity:** P1 · **Difficulty:** Low · **Impact:** Low-Medium

### CB-15 · Replace the `alert()` fallback in the session receipt
- **Why:** A native OS alert exposing "html2canvas" shatters immersion. (UX_CRAFT P1-F)
- **Files:** `_components/study-session-receipt.tsx`
- **Severity:** P1 · **Difficulty:** Low · **Impact:** Medium

---

## Tier 3 — Accessibility (parallel track, ship continuously)

### CB-16 · Focus trap + restore + `role="dialog"` on modals
- (ACCESSIBILITY A-1) · Files: `command-palette.tsx`, `study-session-receipt.tsx`, `confirm-dialog.tsx` · **A** · Medium · High
- One reusable `useFocusTrap` hook.

### CB-17 · forced-colors fallback for border-image panels/buttons
- (ACCESSIBILITY "could not verify") · Files: `globals.css` · **A** · Low · High
- Sprite borders may vanish in Windows High Contrast; add `@media (forced-colors: active)` real borders/outlines.

### CB-18 · Contrast measurement + token tuning
- (ACCESSIBILITY AA-5) · Files: `globals.css` muted/secondary/disabled tokens · **AA** · Low · Medium-High
- Measure on rendered pixels; lift small-text tokens to ≥4.5:1.

### CB-19 · Pixel-font size floor (≥11px; Geist below)
- (ACCESSIBILITY A-3, UX_CRAFT P1-I) · Files: all `font-pixel text-[8/9/10px]` · **AA**/typography · Medium · Medium-High

### CB-20 · Command-palette combobox/listbox roles + `aria-activedescendant`
- (ACCESSIBILITY A-2) · Files: `command-palette.tsx` · **A** · Low-Medium · Medium-High

### CB-21 · Live regions for async AI results
- (ACCESSIBILITY A-7) · Files: Feynman/research/exam result containers · **A** · Low-Medium · Medium

### CB-22 · Non-color status indicators on hand-rolled cases
- (ACCESSIBILITY AA-4) · Files: `error-spotter-client.tsx`, inline red errors · **AA** · Low · Medium

### CB-23 · Custom-cursor escape hatch ("System" option)
- (ACCESSIBILITY AA-6) · Files: `globals.css`, `cursor-picker.tsx` · **AA**/polish · Low · Low-Medium

---

## Tier 4 — Polish & hygiene

### CB-24 · Consolidate `DialogFrame` vs `PixelPanel`
- (COMPONENT P1-5) · Pick one canonical panel, alias the other · Medium · Medium

### CB-25 · Square the corners (radius hygiene)
- (COMPONENT P1-2) · Replace `rounded-sm/md` on pixel surfaces with `0` · Low · Medium

### CB-26 · Sentence-case all buttons/labels
- (COMPONENT P2-6) · App-wide casing convention · Low · Low-Medium

### CB-27 · Bound the note-editor AI ghost-text
- (UX_CRAFT P1-K) · Files: `study-room/_components/note-editor.tsx` · Phrases not conclusions; never on Feynman/flashcard surfaces; add a disable setting · Low-Medium · Medium

### CB-28 · Constrain long-form reading width (~60–75ch)
- (UX_CRAFT P2-J) · Files: `research-desk`, `journal` · Low · Medium

### CB-29 · Soften FSRS grade sublabels ("Perfect"→"Knew it", "Forgot"→"Slipped")
- (COPY_REWRITE §8) · Files: `study/_components/study-session.tsx` · Low · Low-Medium

### CB-30 · README honesty pass + tidy repo root
- (README R-1/R-2/R-3) · Files: `README.md`, root dir · Low · Medium
- Live test badge (not "332"); "early" markers on experimental features; move working notes to `docs/notes/`; `alt="Nora"`; precise term for "derring effect"; align repo URL/handle.

---

## Suggested sequencing

**Sprint 1 (integrity):** CB-1, CB-2, CB-3, CB-4 — stop contradicting the manifesto.
**Sprint 2 (one product):** CB-5, CB-6, CB-7, CB-8, CB-10, CB-30 — unify look and voice; build `PixelSpinner` + `lib/copy.ts` as the enforcement layer.
**Sprint 3 (alive):** CB-11, CB-12, CB-9, CB-15 — atmosphere, restraint, warmth.
**Continuous track:** CB-16…CB-23 accessibility, shipped alongside each sprint.
**Backlog:** CB-13, CB-14, CB-24–CB-29 as capacity allows.

---

## The test to apply to every item above

From `docs/CRAFT.md`: *"Does this make Nora feel more alive? Does this help someone understand more deeply? Would this still belong here five years from now?"* And from `docs/VOICE.md`: *"Someone quietly believes you can learn this."*

Every fix in this backlog is in service of one idea — **Nora already knows who it wants to be; the work is making the whole product agree.** None of this is new features. It's a product keeping the promises it already wrote down.
