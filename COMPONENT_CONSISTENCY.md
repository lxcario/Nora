# Component Consistency Audit

Where the design system holds, and where it has quietly drifted.

Nora has a real design system: CSS custom-property tokens (`--pixel-*`), a 9-slice `.pixel-panel` / `.pixel-btn` via `border-image`, density tokens (`--pixel-panel-compact/standard/spacious`), and a coherent stepped-animation library — all in `src/app/globals.css`, with a component library in `src/components/pixel-ui/`. When components use these, Nora looks handcrafted and unified.

The drift happens at the edges — features that were clearly built fast (or generated) and never re-skinned to the system. The worst offenders read like they came out of a default shadcn/Tailwind starter and were never themed. In a pixel-art product with a tight warm palette, a single `bg-indigo-600` button is as jarring as a sans-serif word in a hand-lettered sign.

Severity: **P0** visibly breaks the visual identity · **P1** noticeable inconsistency · **P2** tidy-up.

---

## P0-1 · Off-theme Tailwind palette colors break the pixel skin entirely

**Files:**
- `src/app/(protected)/app/party/_components/party-admin.tsx` — `bg-indigo-600`, `hover:bg-indigo-700`, `bg-amber-600`, `hover:bg-amber-700`, `bg-red-700`, `hover:bg-red-800`, `border-zinc-300`, `dark:border-zinc-700`, `text-zinc-700`, `dark:text-zinc-300`, `rounded-md`
- `src/app/(protected)/app/study-room/_components/feynman-video-prompt.tsx` — `border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20`, `text-violet-500`, `text-violet-700 dark:text-violet-300`, `rounded-md`

**The problem:** Everywhere else in Nora, color comes from `--pixel-accent` (#d4a526 amber/gold), `--pixel-error` (#c45a58 muted red), `--pixel-success` (#7da856 sage), on warm brown surfaces. These two files instead use Tailwind's stock `indigo`, `violet`, `amber`, `red`, and `zinc` ramps — cool, saturated, generic, and completely outside the warm earth-tone system. They also assume a `dark:` class strategy, while the rest of the app themes via `[data-theme]`/`[data-palette]` attributes on `<html>` and CSS variables. So these components won't even respond correctly to the palette switcher (Forest/Ocean/Lavender/Rose/Ember) that every other surface honors.

**Why it matters most:** This is the clearest "AI-generated, never finished" tell in the codebase. A user who themes their app to "Forest" and then opens Party admin will see indigo and zinc buttons that ignore their choice. It's the visual equivalent of the voice drift in the slop audit.

**Before:**
```tsx
<button className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm
  font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
  {savingSettings ? "Saving…" : "Save"}
</button>
```
**After:**
```tsx
<PixelButton variant="primary" loading={savingSettings} onClick={...}>
  {savingSettings ? "Saving…" : "Save"}
</PixelButton>
```
And for the violet "evaluating" panel:
```tsx
// before: rounded-md border border-violet-200 bg-violet-50 dark:bg-violet-900/20 … text-violet-500
// after:  <DialogFrame> with <PixelSpinner/> + text-[var(--pixel-accent)]
```

**Steps:**
1. Replace every raw color class in these two files with `PixelButton` / `DialogFrame` / `--pixel-*` variables.
2. Remove all `dark:` color variants — theming is variable-driven, not class-driven.
3. Grep the whole `src/` tree for Tailwind palette classes that don't belong: `indigo|violet|zinc|slate|sky|emerald|rose-[0-9]|amber-[0-9]|red-[0-9]|bg-(blue|green|gray)-`. Fix every hit.

**Difficulty:** Medium (two files are the bulk; the grep may surface a few more). **Impact:** High — restores the single most important property of a design system: looking like one product.

---

## P1-2 · Corner-radius language is inconsistent (pixel art should be square)

**Files:** `.pixel-btn` and `.pixel-panel` in `globals.css` use `border-radius: 0` (correct for pixel art). But: `research/_components/ingestion-progress.tsx` (`rounded-sm` ×4), `room/_components/pixel-room.tsx` (`rounded-sm` ×2), `pixel-ui/loading-skeleton.tsx` (`rounded-sm`), `pixel-ui/pixel-input.tsx` (`rounded-sm`), `research-desk.tsx` (`rounded-full` status dots), `party-admin.tsx` / `feynman-video-prompt.tsx` (`rounded-md`), `layout.tsx` skip-link (`rounded-sm`).

**The problem:** A pixel-art aesthetic reads as crisp because corners are *square* (or stepped). Mixing `rounded-sm` (2px), `rounded-md` (6px), and `rounded-full` introduces soft, anti-aliased corners that fight the `image-rendering: pixelated` philosophy stated throughout `globals.css` and `docs/PRODUCT_DESCRIPTION.md`. It's subtle per element but creates a low-grade "two design languages" hum.

**Before/After:** Decide one rule and enforce it: **pixel surfaces are square** (`border-radius: 0`). Exceptions only where genuinely needed (a circular avatar/pet frame). Replace `rounded-sm`/`rounded-md` on panels, inputs, skeletons, and buttons with `0`. Round status "dots" can stay round (they read as bullets, not pixels) but consider a 2×2 square pixel dot to match the aesthetic.

**Steps:**
1. Add a lint rule or a `// design: no border radius on pixel surfaces` note in `globals.css`.
2. Sweep the `rounded-*` usages above; default to square.
3. Keep `pixel-input` consistent with `pixel-btn` (currently `rounded-sm` vs `0`).

**Difficulty:** Low. **Impact:** Medium.

---

## P1-3 · Three different loading indicators, none of them on-brand

**Files:** lucide `Loader2 ... animate-spin` (smooth 360° spin) in `research-desk.tsx`, `ingestion-progress.tsx`, `feynman-editor.tsx`, `study-room/*`, `party-admin.tsx`; `AnimatedDots` (`animate-pulse` "...") in `ingestion-progress.tsx`; `IndeterminateProgressBar` (custom keyframe) also in `ingestion-progress.tsx`. Meanwhile `globals.css` ships `.animate-pixel-blink` (stepped) and `pixel-pulse` — **unused** at these call sites.

**The problem:** There is no single loading primitive, and the most common one (`Loader2`) is a smooth Material-style spinner — the opposite of the stepped `steps()` motion the whole system is built on (see UX_CRAFT_AUDIT P1-E). Loading is one of the most frequently-seen states, so this inconsistency is high-visibility.

**Before/After:** Create one `<PixelSpinner size>` in `pixel-ui/` (stepped rotation or 3-dot stepped blink, honoring `prefers-reduced-motion` and `[data-animations="off"]`). Replace every `Loader2 animate-spin` and ad-hoc dots with it. Pair with the centralized loading copy from COPY_REWRITE §3.

**Steps:**
1. Build `PixelSpinner` (reuse existing keyframes).
2. Replace `Loader2` imports/usages app-wide.
3. Keep `IndeterminateProgressBar` for true progress, but restyle to square + token colors.

**Difficulty:** Low-Medium. **Impact:** Medium.

---

## P1-4 · Empty states are sometimes a component, sometimes hand-rolled

**Files:** `pixel-ui/empty-state.tsx` (the canonical `<EmptyState>`), used by `study/page.tsx`, `feynman/page.tsx`, etc. But `memory-map/page.tsx`, `party/_components/*`, and `research/_components/paper-library.tsx` hand-roll their own DialogFrame + `<img>` + text + link.

**The problem:** The hand-rolled versions differ in icon size, padding, button vs link, and copy tone. `<EmptyState>` exists precisely to prevent this. Per [empty-state best practice](https://www.sap.com/design-system/fiori-design-web/v1-136/foundations/best-practices/global-patterns/designing-for-empty-states), these are high-impact first-run screens; they should be visually identical across the app so the product feels coherent at exactly the moment a new user is judging it.

**Before/After:** Route every empty state through `<EmptyState message actionLabel actionHref icon>`. If a surface needs a richer empty state (e.g., the Garden's "plant your first memory" wants more warmth), extend `<EmptyState>` with an optional `description` slot rather than forking it.

**Steps:**
1. Replace hand-rolled empties in `memory-map`, `party/*`, `paper-library`, `rag-query-panel` with `<EmptyState>`.
2. Add an optional secondary-line prop if needed.
3. Apply COPY_REWRITE §9 strings.

**Difficulty:** Low-Medium. **Impact:** Medium.

---

## P1-5 · Two near-identical panel components: `DialogFrame` vs `PixelPanel`

**Files:** `pixel-ui/dialog-frame.tsx` and `pixel-ui/pixel-panel.tsx`

**The problem:** Both wrap `.pixel-panel`, both accept a `title` that renders a pixel-font header with a bottom border, both accept a `state`, both handle `large`. But they differ subtly: DialogFrame's title uses `paddingBottom:8 / marginBottom:12` inside the body; PixelPanel's title is a separate `<header>` with its own padding. Same intent, two implementations, slightly different spacing — so two panels with titles can look subtly misaligned depending on which component a developer happened to reach for.

**Before/After:** Pick one. Recommend keeping `PixelPanel` (it's a Server Component, supports `as`, `tone`) and making `DialogFrame` a thin alias/wrapper for backward compatibility, or migrating call sites. Document which to use.

**Steps:**
1. Decide canonical panel (PixelPanel).
2. Reimplement `DialogFrame` as `<PixelPanel>` with the same props, or codemod usages.
3. Note in `pixel-ui/index.ts` which is canonical.

**Difficulty:** Medium. **Impact:** Medium (prevents future drift more than fixing current).

---

## P2-6 · Button label casing is inconsistent

**Examples:** `Get Started`, `Save Profile`, `Save Preferences`, `Save All as Flashcards`, `Take Another Exam`, `Go Home` (Title Case) vs `Set up subjects`, `Explore a topic`, `Invite a friend to study together` (sentence case) vs `Done`, `Save`.

**The problem:** No casing convention. Title Case reads "app-store button"; sentence case reads "gentle/handmade." Given the voice, **sentence case** is the right default ("Save profile," "Take another exam," "Back to Today").

**Before/After:** Adopt sentence case for all button and label text except proper nouns and the wordmark. Add it to the design notes.

**Difficulty:** Low. **Impact:** Low-Medium.

---

## P2-7 · Shadow / elevation language

**Observation:** The system mostly avoids drop shadows (correct — pixel art uses the 9-slice bevel for depth, not soft shadows). Good. Watch that the off-theme components in P0-1 don't introduce Tailwind `shadow-*`; and ensure overlays (command palette, receipt modal) use a consistent scrim (`bg-black/60 backdrop-blur-sm` appears in the receipt — fine — confirm the command palette and confirm-dialog match it).

**Difficulty:** Low. **Impact:** Low.

---

## Consistency scorecard

| Area | State | Worst offender |
|---|---|---|
| Color tokens | Mostly good, **2 files broken** | `party-admin.tsx`, `feynman-video-prompt.tsx` |
| Corner radius | Drifting | `ingestion-progress.tsx`, `pixel-input.tsx` |
| Loading indicators | Fragmented | every `Loader2` usage |
| Empty states | Half-componentized | `memory-map`, `party/*` |
| Panels | Duplicated | `DialogFrame` vs `PixelPanel` |
| Animation language | Strong in CSS, undercut by lucide spinners | spinners |
| Button casing | Inconsistent | mixed app-wide |
| Spacing grid (8px) | Strong | — |
| Shadows | Strong (bevel, not shadow) | — |

**The fix that buys the most:** P0-1 (kill the off-theme colors) and P1-3 (one pixel spinner). Those two changes alone make the app *look* like a single hand-made product instead of a themed core with a few generated bolt-ons.
