# Nora — Frontend Excellence Specification
**Goal: take Nora from a solid, functional pixel-study app to an Awwwards-caliber product.**

This document is grounded entirely in direct screenshot review of 15 live screens (Home, Review Cards, Study Mix, Feynman Mode, Practice Exam, Research Desk in both modes, Study Room, Study Planner, My University x2, Pixel Room, Collection, Analytics, History, Settings) plus the public landing page. No external "best practices" research was used — every claim here traces to something actually observed in the product. Treat this as a senior frontend engineer's implementation spec, not a checklist copied from a blog post.

---

## 0. Where Nora already stands

Before tearing into problems: the bones are good. Specifically:

- **The Collection screen's theming system is genuinely sophisticated** — Dark/Light base + 6 color palettes (None, Ember, Forest, Ocean, Lavender, Rose) + independent accent override + animation/sound toggles. Few hobby/indie products bother building this. Don't lose it in a redesign — extend it.
- **My University's micro-copy is the gold standard for the whole app.** "We only use real, official documents — never invented dates." "Missing dates are marked Unreleased — never guessed." This is confident, specific, trust-building copy. Every other screen should be edited to this bar.
- **The landing page has real character** — atmospheric dark background, glow accents, copy with personality ("No streak reset drama," "just vibes"). It is the single best reference for what "Nora's voice" sounds like visually and verbally.
- **The Pixel Room concept (pet mood, evolution, missions) is a strong emotional hook** that most study apps don't have. It's currently underused, not poorly designed.

The work ahead is not "fix bad taste." It's "raise a 7/10 system to a 9.5/10 system by closing the gaps between its best screen and its weakest screen, and by adding the layer of motion and detail that separates 'finished' from 'award-winning.'"

---

## 1. The core problem: Awwwards is won on *consistency + motion + finish*, not features

Looking across all 15 screens side by side, the recurring issues are not "this looks bad" — they're "this looks unfinished" or "this looks inconsistent with the screen next to it." Specifically:

### 1.1 Dead space is the most common defect
Home, Study Mix, Practice Exam (bottom half), Research Desk empty state, Study Planner — all have a dense top section followed by 40–60% of the viewport sitting empty with no content, no texture, no ambient detail. This isn't "minimalism," it's unfinished layout. A judge scrolling through will read it as incomplete.

**Fix direction:** every page needs a deliberate decision about its bottom half — either real content (suggested next action, recent activity, related items) or ambient design (a parallax background layer, a subtle pixel-art scene, a soft glow gradient) that makes empty space feel intentional rather than accidental.

### 1.2 Border weight and color are used identically everywhere, regardless of hierarchy
Every card across every screen uses the same pinkish-mauve 2px border, the same corner radius, the same internal padding — Upload PDF, Your Papers, Today's Quests, Analytics stat cards, Settings sections. There is no visual signal for "this is the primary action" vs. "this is supplementary information." Compare to My University, where the confirmed-state callout (green border, checkmark) actually stands out — that's the exception, not the rule.

**Fix direction:** establish 3 tiers of visual weight (primary / secondary / tertiary) and apply them with discipline. A composer or primary CTA should look different from a static info card, every time, on every screen.

### 1.3 Zero visible motion in any static screenshot
Across all 15 screens, nothing suggests animation exists except the Collection page's "Animations" toggle (which implies *some* stepped pixel animation exists somewhere, but it's not visible in any screen we captured — Home's quest progress bars, Analytics' bar charts, and Pixel Room's mood states all look like they'd benefit from it). Awwwards judging explicitly weights "Creativity" and overall craft heavily, and motion is the single highest-leverage lever for that score. A pixel-art aesthetic is *made* for this — stepped/quantized animation (not smooth easing) is cheap to build and extremely on-brand.

**Fix direction:** see Section 3 (Motion Language) below — this is the single highest-impact addition you can make.

### 1.4 Empty/zero states are inconsistent
Analytics shows "0" for Sessions and Minutes right next to populated numbers (58 Reviews, 35 Cards, 2D Streak) with no visual distinction — a 0 reads as a bug, not as "you haven't done this yet." Research Desk's empty state ("Your Papers (1)" with no upload) and Practice Exam's disabled-looking generate button are similarly under-designed.

**Fix direction:** every numeric/list/chart component needs an explicit zero-state treatment — different color weight, a short encouraging microcopy line, or an icon — never just a bare "0" or "No sessions yet" in the same type style as real data.

### 1.5 The confidence-rating color scale in Review Cards sends an unintended emotional signal
"1 – Can't Recall" is rendered in a red/bordo "error" color. This is a self-assessment tool, not a pass/fail test — coloring "I don't remember" the same way you'd color a form validation error subtly punishes honest self-reporting, which cuts against the app's own stated philosophy ("never judges when you skip a day"). This is a one-line token change, but it matters for brand integrity.

---

## 2. Visual identity: commit to one direction, all the way

Based on the landing page (the strongest existing asset) and the Pixel Room (the most characterful in-app screen), the identity to commit to is:

> **Nocturnal pixel-RPG companion app.** Dark, warm, glowing — a cozy lit room at night, not a parchment desk in daylight.

This doesn't mean deleting the Light theme — Collection's theme system should stay, because user choice is good UX. It means the *design system underneath both themes* needs the same bones: same border logic, same motion, same spacing rules, same iconography. Right now "Dark" and "Light" mode appear to just invert a palette; they should instead be two skins over one consistently-detailed system.

### 2.1 Typography
- Keep the pixel display font for headings (it's already distinctive and on-brand) but verify it has real weight variation — right now most headings look like the same weight at different sizes.
- Pair it with a humanist monospace or a clean grotesk for body text — avoid system-default sans for anything users read for more than a few words (explanations, paper content, history entries).
- Establish a real type scale (e.g., 11 / 13 / 16 / 20 / 28 / 40px) and stop letting font sizes drift ad hoc between screens — Settings labels, Analytics stat numbers, and Research Desk headers are currently all slightly different sizes that don't appear to follow one scale.

### 2.2 Color tokens
Formalize what Collection already implies into real CSS variables:
```
--bg-base, --bg-elevated, --bg-overlay
--border-subtle, --border-default, --border-strong
--text-primary, --text-secondary, --text-muted
--accent (driven by palette selection: ember/forest/ocean/lavender/rose)
--success, --warning, --danger, --info
--glow (a soft accent-colored box-shadow used sparingly for emphasis, not everywhere)
```
Every screen should pull from this list — no new ad hoc hex values per component.

### 2.3 Iconography
Several screens mix pixel-style icons (Pixel Room, sidebar nav) with what look like default/system icons (Research Desk's upload icon, Practice Exam's upload icon, History's filter icons). Pick one icon language — ideally a custom pixel icon set matching the nav icons — and use it everywhere. Mismatched icon weight/style is one of the fastest ways a judge's eye catches "this wasn't finished with care."

---

## 3. Motion language (highest-leverage addition)

This is the single biggest gap between "functional" and "Awwwards-considered." None of the 15 screens show evidence of orchestrated motion. Pixel art is unusually well-suited to **stepped/quantized motion** (4–8 frame animations, no easing curves) which is cheap to implement and instantly recognizable as intentional craft.

Concrete additions, ordered by impact-to-effort ratio:

1. **Page load stagger** — when any page mounts, cards/sections should reveal in a quick staggered sequence (50–80ms delay between each), not all at once. This alone makes every screen feel considered.
2. **Pikachu's mood state should visibly animate** — bob/idle animation when happy, a slumped/still state when sad (already textually flagged: "Pikachu is sad… complete a session"). A static sprite undercuts the emotional mechanic that's supposed to be the heart of the app.
3. **Quest/progress bars should fill with a stepped animation** on load and on update, not snap to their final value instantly.
4. **Number counters** (XP, coins, streak) should tick up rather than snap, especially right after completing an action — this is the single most "game-like" detail you can add and it's inexpensive.
5. **Hover/press states need pixel-specific feedback** — a 1–2px "press down" displacement + shadow change on buttons (already partially present on the Practice Exam mode buttons, extend it everywhere), not a generic opacity fade.
6. **Toast/reward feedback** — coin/XP gains should have a small particle or pop animation at the point of earning, not just an updated number in the topbar.

Constraint: keep all of this **respectful of the existing "Animations: On/Off" toggle in Collection** — every motion addition must degrade gracefully to a static state when the user disables it. This is also exactly the kind of accessibility-conscious detail Awwwards judges notice.

---

## 4. Page-by-page priority fixes

### Home
- Fill the dead lower half: add a "Recent Activity" or "Continue where you left off" card, or commit to an ambient background detail (a softly lit window scene, parallax stars) rather than flat brown.
- "Your Study Circle" empty state is good copy ("No activity in your circle yet") — keep this tone everywhere else too.

### Review Cards
- Fix the 1–5 confidence color scale (Section 1.5) — use a neutral-to-accent gradient, not red-to-green.
- Keyboard shortcuts callout is good — consider auto-dismissing after first successful use rather than requiring a manual close every session start.

### Study Mix
- Single card floating in a mostly empty page. Either show a queue preview ("Up Next: 3 more flashcards, 1 Feynman prompt") below the fold, or reduce the max-width of the content column so empty space doesn't dominate.

### Feynman Mode
- The "Progress on this topic" sparkline has no axis label and an ambiguous "50 latest" — either add a clear 0–100 scale, or replace with a simpler delta indicator ("+33 vs. last attempt" is already shown — that alone may be enough; the chart may be unnecessary).
- "Attach Source" being optional with an "unverified" label is good, honest UX — keep this pattern.

### Practice Exam
- Layout here is genuinely solid — Exam Mode / Study Material / History reads as a clear 3-step flow. Use this page's hierarchy as the template for Research Desk (see below).

### Research Desk — needs the most structural work
- The **"From Your Papers" mode buries the question composer at the bottom** behind Upload PDF → Import URL → Your Papers (confirmed across 2 separate screenshots). The **"From Web Sources" mode already does this correctly** — composer is immediately visible, single question input, save-destination dropdown, disclaimer below. Use the Web Sources layout as the template and restructure Your Papers mode to match: composer first, source management collapsed into a secondary expandable section.
- "Try asking" suggestion chips (seen in dark-theme capture) are a good feature, currently stranded at the very bottom of a long page where most users won't scroll to see them — move them directly under the composer input.
- "17 chunks" is backend language leaking into user-facing UI — rephrase as "Ready to search" or similar.

### Study Room
- The note editor panel (right side) is empty with no placeholder guidance — add a short prompt ("Notes will appear here as you generate them" or a ghost/skeleton state).
- YouTube's native UI elements bleeding through the embed (subscribe prompts, etc.) is a platform constraint, not fixable directly — but framing the player in a custom pixel-bordered "TV" component (you already have a CRT-monitor icon in the nav) would visually contain the foreign UI rather than let it float loose.

### Study Planner
- Every visible day currently shows an identical "Registration" entry — if this is real scheduling data, the underlying logic needs to differentiate daily content; if it's placeholder, replace with a believable varied week before any public demo.
- Bottom half of the page is empty — same dead-space issue as Home.

### My University
- This is the best-designed flow in the app. No notes other than: apply its confirmation-state pattern (green border + checkmark + reassuring copy) to other multi-step flows (Practice Exam generation, Research Desk indexing).

### Pixel Room
- This should arguably be the **post-login landing screen**, not Home — it's the emotional/game core and currently requires 3 clicks to reach (My Room ▸ Pixel Room). Consider promoting it or merging its top-line stats into Home directly.
- Static sprite for "sad" Pikachu undercuts the warning text above it — animate the mood states (Section 3.2).

### Collection
- Decorations panel says "Coming soon" with 4 empty slots — either ship at least placeholder previews of what's coming, or hide the section until populated; an empty "coming soon" grid reads as unfinished in a portfolio/demo context.

### Analytics
- Mixed populated/empty stats with no visual distinction (Section 1.4) — fix zero-state styling.
- "Sessions per day (30D)" chart area showing only "No sessions yet" as plain centered text while the adjacent "Cards reviewed" chart has actual bars is the most visible inconsistency on this screen — both charts need matching empty/populated treatments.

### History
- Clean, functional, good filter UI (All/Feynman/Video/Research + topic + date range). No major issues — just bring border/spacing tokens in line with the rest of the system once tokens are formalized (Section 2.2).

### Settings
- Best-organized tab structure in the app (Profile/Customization/Pet/Preferences/Subjects/Account). Use this exact tab pattern as the reference for any other screen that currently uses stacked cards instead of tabs (e.g., Research Desk's two modes could arguably follow this exact tab visual style instead of pill buttons, for consistency).

---

## 5. The "no-ship-without" checklist

These are unglamorous but they are precisely what separates 7/10 polish from 9/10 polish, and judges absolutely notice their absence:

- [ ] Every interactive element (button, card, input, nav item) has explicit hover, focus, active/pressed, and disabled states — not just hover.
- [ ] Every async action (upload, AI generation, save) has a loading state with motion, not just a disabled button with no feedback.
- [ ] Every list/grid has a designed empty state with copy in Nora's voice, not a bare "No X yet" in default body text.
- [ ] Every numeric stat that can be zero has a distinct zero-state visual treatment.
- [ ] Keyboard navigation works through every primary flow (the keyboard shortcuts in Review Cards prove this is already a value — extend it).
- [ ] All animations respect the Collection "Animations" toggle and degrade gracefully.
- [ ] Page load order is staggered, not simultaneous, on every screen with multiple cards.
- [ ] Color tokens are used with zero one-off hex values — audit every screen against the token list in Section 2.2.
- [ ] Icon style is unified — no mixing of pixel icons and default/system icons on the same screen.

---

## 6. Suggested sequencing

This is a lot of surface area. Suggested order, roughly highest-impact-first:

1. **Token system formalization** (Section 2.2) — everything else depends on this being done first, otherwise you're styling on a moving target.
2. **Motion language baseline** (Section 3, items 1, 3, 4, 5) — page stagger, progress bar fills, number ticks, press states. These are largely CSS/transition work, not new components, and they touch every single screen at once.
3. **Research Desk restructure** (Section 4) — your most-used / most hackathon-relevant screen, and the one with the clearest, most fixable structural problem.
4. **Dead-space pass** across Home, Study Mix, Study Planner, Analytics.
5. **Pikachu mood animation + Pixel Room promotion** — the emotional core deserves the motion budget.
6. **Zero-state and confirmation-state pass** everywhere, using My University as the template.
7. **Icon and zero-off-hex audit** as a final consistency pass before any award submission or public launch.
