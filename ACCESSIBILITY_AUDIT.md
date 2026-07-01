# Accessibility Audit

Keyboard · Focus · Screen readers · ARIA · Reduced motion · Contrast · Semantic HTML · Cognitive.

Per the brief, only improvements that *materially* improve usability are listed — no checklist theatre. Two honesty notes up front:

1. **Full WCAG conformance can't be confirmed from code alone.** Real validation needs manual testing with screen readers (NVDA/VoiceOver), keyboard-only runs, and contrast measurement on rendered pixels. This audit flags concrete, code-visible issues and likely problems; it is not a conformance certificate.
2. **Nora's baseline is above average.** `src/app/(protected)/app/layout.tsx` has a real skip link, `globals.css` honors `prefers-reduced-motion` *and* adds a user-facing animation kill switch (`[data-animations="off"]`), buttons have `:focus-visible` outlines and 44×44 min targets, and the custom cursor is correctly gated to `@media (hover: hover) and (pointer: fine)`. Someone here cares. The findings below are the gaps that remain.

Severity uses WCAG-ish framing: **A** (blocks some users) · **AA** (significant barrier) · **AAA/polish**.

---

## A-1 · Modals don't trap or restore focus

**Files:** `src/components/pixel-ui/command-palette.tsx`, `src/app/(protected)/app/_components/study-session-receipt.tsx` (full-screen overlay), `src/components/pixel-ui/confirm-dialog.tsx`

**Issue:** The command palette focuses its input on open (good) but Tab can move focus to elements *behind* the overlay, and on close focus isn't returned to the triggering element. The receipt modal (`fixed inset-0 z-[90]`) and confirm dialog appear to be the same. This fails **WCAG 2.4.3 Focus Order** and **2.1.2 No Keyboard Trap**'s intent (here the opposite problem — no containment), and it's disorienting for screen-reader and keyboard users who lose their place.

**Fix:**
- Trap focus within the dialog while open (cycle Tab/Shift+Tab within it).
- Restore focus to the trigger (or a sensible anchor) on close.
- Add `role="dialog"` + `aria-modal="true"` + a labelled title (`aria-labelledby`) to each overlay.
- Make the backdrop click + `Esc` both close (command palette already does Esc; confirm the others do).

**Difficulty:** Medium (a small `useFocusTrap` hook reused across the three). **Impact:** High for keyboard/AT users.

---

## A-2 · Command palette is a listbox missing its roles

**Files:** `src/components/pixel-ui/command-palette.tsx`

**Issue:** Result items have `role="option"` and `aria-selected` (good), but the container isn't a `role="listbox"`, the text input isn't wired to the active option via `aria-activedescendant`, and there's no `aria-controls`. A screen reader user typing in the field won't be told which option is highlighted as they arrow through. This is a **WCAG 4.1.2 Name, Role, Value** gap.

**Fix:**
- Wrap results in `role="listbox"` with an id; input gets `role="combobox"`, `aria-expanded`, `aria-controls={listboxId}`, and `aria-activedescendant={activeOptionId}`.
- Give each option a stable id and set it as active-descendant on arrow nav.

**Difficulty:** Low-Medium. **Impact:** Medium-High for AT users; the palette is a power-user feature and power users include AT users.

---

## A-3 · Pixel font at 8–10px is a cognitive/low-vision barrier

**Files:** pervasive — `text-[8px]`, `text-[9px]`, `text-[10px]` with `font-pixel` (command palette footer, stat labels, receipt, quest sublabels). Cross-referenced in UX_CRAFT_AUDIT P1-I.

**Issue:** Bitmap/pixel fonts degrade fast below ~11–12px because glyphs are built on a coarse grid; at 8px, distinguishing characters is hard for everyone and a real barrier for low-vision and some dyslexic readers. This isn't a strict WCAG failure (1.4.4 is about zoom/reflow), but it materially hurts readability in a product whose thesis is "users read for hours."

**Fix:**
- Floor the pixel font at 11px; below that, use Geist (the body font), which stays legible small.
- Verify the app survives 200% browser zoom and text-only zoom without clipping (1.4.4 / 1.4.10 Reflow) — pixel layouts with fixed `text-[Npx]` are at risk.

**Difficulty:** Medium (many sites, mechanical). **Impact:** Medium-High.

---

## AA-4 · Some status is conveyed by color/icon-glyph alone

**Files:** `error-spotter-client.tsx` (`✓ / ◐ / ✗` glyphs colored success/warning/error), inline red error text in `study/page.tsx` and `memory-map/page.tsx` (color-only), `memory-map` plant health (color + label — this one's fine).

**Issue:** **WCAG 1.4.1 Use of Color.** Where meaning rides on red/green text or a colored check/cross, color-blind users may miss it. NN/g's [error-message guidance](https://www.nngroup.com/articles/error-message-guidelines/) recommends redundant indicators (icon + text + style). The shared `ErrorState`/`EmptyState` components *do* pair an icon with text (good) — the gap is the hand-rolled inline cases.

**Fix:** Ensure every status has a non-color signal: a text label ("Found it" / "Not an error here"), a shape difference, or both. The Error Spotter verdicts already have words — just make sure the words, not only the ✓/✗ color, carry the meaning. Audit ad-hoc red `<p>` errors to include an icon or the word "Couldn't…".

**Difficulty:** Low. **Impact:** Medium.

---

## AA-5 · Contrast needs measurement on the muted/disabled tokens

**Files:** `globals.css` — `--pixel-text-muted: #8b7355` on `--pixel-bg-primary: #1a1410` (dark); light theme `--pixel-text-muted: #93785a` on `#f3e7cf`; disabled states use `opacity: 0.5` + `grayscale`.

**Issue:** Muted tan on near-black, and especially the very small muted labels (`text-[9px]`), are likely **borderline for WCAG 1.4.3 (4.5:1 for normal text, 3:1 for large)**. Disabled controls dropped to 50% opacity can fall below any usable ratio (1.4.3 exempts disabled, but if "muted helper text" uses similar values it's not exempt). The off-theme `party-admin.tsx` colors (indigo/zinc, see COMPONENT_CONSISTENCY P0-1) also need checking since they bypass the curated palette.

**Fix:**
- Measure `--pixel-text-muted` and `--pixel-text-secondary` against each surface; bump luminance until small text clears 4.5:1.
- Don't use `--pixel-text-muted` for anything the user *needs* to read (use it only for truly secondary decoration).
- Re-check after the P0-1 color cleanup.

**Difficulty:** Low (measure) + Low (tune values). **Impact:** Medium-High (contrast is the most common real-world WCAG failure).

---

## AA-6 · The global `* { cursor: url(...) !important }` is heavy-handed

**Files:** `globals.css` cursor system.

**Issue:** Applying a custom cursor to `*` with `!important` (even gated to fine pointers) overrides everything, including states where a specific system cursor communicates affordance (text I-beam, `not-allowed`, resize). The code *does* re-specify pointer/text/not-allowed variants (thoughtful), but `!important` on `*` is fragile and can fight user/AT cursor customizations and high-contrast modes.

**Fix:** Keep the custom cursor, but (a) ensure `prefers-reduced-motion`/high-contrast and forced-colors users get the system cursor, (b) consider a setting "Use system cursor" (there's already a cursor picker — add "System" as an option), (c) verify `not-allowed` and text cursors still read correctly on disabled and editable elements.

**Difficulty:** Low. **Impact:** Low-Medium (mostly edge users, but real for them).

---

## A-7 · Verify live regions for async results and toasts

**Files:** `toast.tsx` (has `role="status"` `aria-live="polite"` — good), but AI results (Feynman feedback, research answers, exam scoring) that appear after a wait should announce.

**Issue:** When a screen-reader user submits a Feynman explanation and feedback renders after several seconds, nothing may announce that results arrived (**WCAG 4.1.3 Status Messages**). The toast is handled; the *main content* updates may not be.

**Fix:** Wrap async-result containers (Feynman gap analysis, research answer, exam result) in an `aria-live="polite"` region, or move focus to the result heading when it arrives. Pair with the loading copy ("Thinking…") so the wait is announced too.

**Difficulty:** Low-Medium. **Impact:** Medium for AT users on the core loop.

---

## Reduced motion — a note and a caution

**Good:** `globals.css` zeroes animations/transitions under `prefers-reduced-motion: reduce` *and* via `[data-animations="off"]`. The view-transition iris wipe is disabled for both. This is better than most products do.

**Caution:** The rule `* { transition-duration: 0ms !important; }` also kills transitions that convey state (e.g., a focus ring fade, an expanding panel). That's acceptable and arguably correct, but verify nothing *functional* depends on a transition completing (e.g., a callback on `transitionend`) — if it does, it'll break under reduced motion. This is a behavioral check, not a visual one.

---

## Semantic HTML — mostly good, spot-checks

- Buttons are real `<button>` (PixelButton) — good for keyboard.
- Skip link present and correctly `sr-only`/`focus:not-sr-only` — good.
- Decorative images use `alt=""` consistently — good.
- **Check:** page `<h1>/<h2>` order is logical per route (PageHeader provides titles; confirm there's exactly one h1 per page and headings don't skip levels — **WCAG 1.3.1**).
- **Check:** the bottom nav / sidebar nav use `<nav>` with an `aria-label` so AT users can distinguish "primary" from "study modes."

---

## What I could not verify (stated honestly)

- Actual contrast ratios (needs rendered-pixel measurement).
- Screen-reader announcement order and quality (needs NVDA/VoiceOver runs).
- Keyboard reachability of every interactive element on every route (needs a manual tab-through).
- Behavior at 200% zoom / 320px reflow.
- Forced-colors / Windows High Contrast rendering of the sprite-based borders (border-image may disappear in forced-colors mode — **likely issue**, worth a dedicated check since the entire panel/button system is `border-image`).

**The forced-colors one is worth elevating:** because Nora's panels and buttons get their borders from `border-image` sprites, Windows High Contrast Mode (which strips background images) could render borderless, invisible panels. Add a `@media (forced-colors: active)` fallback that draws real `border` + `outline` so the UI survives. **Difficulty: Low. Impact: High for forced-colors users.**

---

## Priority order

1. **A-1** focus trap/restore on modals (+ `role="dialog"`).
2. **forced-colors fallback** for border-image panels/buttons (invisible UI risk).
3. **AA-5** contrast measurement + token tuning.
4. **A-3** pixel-font size floor.
5. **A-2** command-palette combobox/listbox roles.
6. **A-7** live regions for async results.

Nora doesn't need an accessibility *rescue*. It needs the last 20% — focus management, forced-colors survival, and contrast/size tuning — to match the care already visible in the baseline.
