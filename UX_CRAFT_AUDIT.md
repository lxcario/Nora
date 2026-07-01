# UX Craft Audit

Living world · Interaction · Emotional design · Typography · AI experience.

This is the audit of whether Nora feels *handcrafted* or *assembled*. The copy audit lives in `AI_SLOP_AUDIT.md` and `COPY_REWRITE.md`; this one is about behavior, pacing, atmosphere, and the moments between clicks.

The headline: Nora's *design system* understands craft (the stepped animations in `globals.css` are evidence of someone who has actually thought about pixel-art motion). But that understanding is applied unevenly, and a few structural decisions actively work against the philosophy in `docs/CRAFT.md`. The most important finding is not a missing feature — it's that **the companion forgets between page loads.**

Severity: **P0** contradicts the philosophy · **P1** a missed craft opportunity with real impact · **P2** polish.

---

## 1. Living World Audit

### P0-A · The companion has no memory between renders

**Files:** `src/app/(protected)/app/page.tsx` (the `getCompanionLine` call), `src/lib/companion-dialogue.ts` (`getCompanionLine` uses `Math.random()`)

**What happens now:** Every time the Today page renders, `getCompanionLine` filters eligible lines, takes the top 3 by weight, and picks one **at random**. Refresh the page three times and the companion says three different things about the same day.

**Why this breaks the philosophy:** `docs/CRAFT.md`'s first and defining principle is "Memory, not Personalization" — "The application should remember before it asks." A companion that says something different on every refresh isn't remembering; it's *rolling dice*. The illusion of a present, consistent friend collapses the moment a user reloads. This is the difference between Animal Crossing villagers (who hold a thought across a day) and a fortune-cookie generator.

**Concrete improvement:** Seed the selection deterministically per user per day. Hash `userId + localDate` into the pick, so the companion holds one thought for the whole day and only changes when the *context* changes (you reviewed those cards, you mastered that topic). When the underlying facts change, the line should change *in response to the change* — not randomly.

```
// instead of: Math.floor(Math.random() * topCandidates.length)
const seed = hashToInt(`${userId}:${localDateISO}`);
const picked = topCandidates[seed % topCandidates.length];
```

**Difficulty:** Low (a few lines). **Impact:** High — it's the single change that most makes the companion feel alive rather than generated.

---

### P0-B · "Atmosphere changes with time" is promised but not delivered

**Files:** `src/app/globals.css` (`.pixel-grid-bg` is a single static gradient), `src/app/(protected)/app/page.tsx` (`serverHour = new Date().getUTCHours()` — UTC, not the user's timezone, despite `profile.timezone` being fetched two lines earlier)

**What happens now:** `docs/CRAFT.md` principle #4 is "Atmosphere changes with time… Morning feels different from evening." In practice the background grid is identical at 7am and 11pm, and the only time-awareness is the companion greeting — which is computed from **server UTC hour**, so a user in Istanbul gets "Good morning" at the wrong time. The profile timezone is right there in the query and isn't used for the greeting.

**Why it matters:** This is the most evocative unfulfilled promise in the whole product. The infrastructure already exists — `globals.css` drives the entire palette from CSS variables and supports `[data-palette]` / `[data-theme]` swaps. A time-of-day atmosphere is a 5-variable change, not a rebuild.

**Concrete improvement:**
1. Compute time-of-day from `profile.timezone`, not UTC (correctness bug + craft).
2. Add a `[data-daypart="dawn|day|dusk|night"]` attribute on `<html>` (set from the user's local hour) and shift `--grid-glow` / `--grid-bg-base` subtly per daypart — warmer amber at dusk, cooler and dimmer at night. *Nothing mechanical changes* (per CRAFT.md: "Only emotionally"), just the warmth of the light.
3. Respect `prefers-reduced-motion` by making it a static per-load tint, not an animated transition.

**Difficulty:** Medium. **Impact:** High — this is the kind of detail that makes people say "it feels alive" without being able to say why.

---

### P1-C · Success is loud where the philosophy asks for restraint

**Files:** `src/components/pixel-ui/toast.tsx` (level-up toast: `animate-pixel-wiggle` + `playLevelUp()` SFX + larger font), `src/app/(protected)/app/_components/xp-toast.tsx`, `globals.css` (`float-up-fade`, `pop-in`)

**What happens now:** XP/coins float up, level-ups wiggle and play a sound. Individually fine. But `docs/CRAFT.md` principle #5 is "Silence is part of the experience… Not every success needs confetti. Sometimes a single flower blooming is enough." Right now *every* reward fires a toast. There's no gradient between "you graded one card" and "you mastered a topic you've struggled with for weeks" — they get the same celebratory vocabulary.

**Concrete improvement:** Tier the feedback. Small actions (a single card) → silent, ambient (the garden updates, the pet bobs once). Medium (finishing a session) → the existing toast. Rare/meaningful (mastering a long-struggled topic, a topic going from "wilting" to "blooming") → the loud moment. Reserve the wiggle+sound for the moments that earned it. Let most moments be quiet.

**Difficulty:** Medium. **Impact:** Medium-High — restraint is what makes the rare celebration land.

---

### P1-D · The world doesn't acknowledge return or absence at the world level

**Files:** `src/lib/companion-dialogue.ts` (has a `returningAfterBreak` line — good), `src/app/(protected)/app/room/_components/pixel-room.tsx` (pet states)

**What's good:** The companion *does* say "Welcome back. I missed studying with you." after a break — this is exactly right.

**What's missing:** The acknowledgment is text-only. The *room itself* doesn't reflect absence or return — no dust settling, no plant that visibly missed water and perks up, no light coming back on. WHY_NORA describes the garden wilting "as nature." The pet has a `forest_rescue` state in the data model (`PRODUCT_DESCRIPTION.md`) — a genuinely lovely idea — but the world transition into and out of it should be a small environmental story, not a sprite swap with a guilt message (see AI_SLOP_AUDIT P1-7).

**Concrete improvement:** Make one environmental detail respond to return: e.g., on first visit after 2+ days away, the room is slightly dim and the pet is curled up, then *brightens and stretches* over the first few seconds — a wordless "oh, you're back." No counter, no penalty.

**Difficulty:** Medium-High. **Impact:** Medium — high emotional payoff, but lower frequency.

---

## 2. Interaction Audit

### P1-E · Loading is a smooth corporate spinner, not a pixel heartbeat

**Files:** every `Loader2 ... animate-spin` from lucide-react — `research-desk.tsx`, `ingestion-progress.tsx`, `feynman-editor.tsx`, `study-room/*`, `party-admin.tsx`. Meanwhile `globals.css` defines `.animate-pixel-blink` (stepped on/off) and `pixel-pulse` — built for exactly this and **unused in these spots.**

**Why it's a craft miss:** `docs/CRAFT.md` principle #6 ("Slow interactions feel intentional") and the entire `globals.css` philosophy is *stepped, discrete, frame-by-frame* motion — "no smooth easing." A continuously-rotating Material-style spinner is the most generic loading affordance in software and it visually announces "this is a React app," breaking the pixel illusion every time the user waits. How would Nintendo do it? A blinking cursor, a bobbing sprite, three stepped dots — never a smooth 360° spin.

**Concrete improvement:** One `<PixelSpinner>` primitive (stepped rotation via `steps()`, or a 3-dot stepped blink) used everywhere a spinner is used now. Pair it with the centralized loading copy from AI_SLOP_AUDIT P1-5. See COMPONENT_CONSISTENCY for the consolidation.

**Difficulty:** Low-Medium. **Impact:** Medium — small per instance, but loading is *frequent*, so the aggregate immersion cost is high.

---

### P1-F · The session receipt falls back to a browser `alert()`

**Files:** `src/app/(protected)/app/_components/study-session-receipt.tsx`

**What happens now:** The end-of-session "receipt" is a charming, handmade idea (a printed-receipt metaphor for a study session — this is *exactly* the kind of texture the philosophy wants). But the download handler, if `html2canvas` isn't present, calls `alert("Download requires the html2canvas library. The receipt is displayed for you to screenshot.")`.

**Why it's jarring:** A native OS `alert()` is the single most immersion-breaking element possible — system font, system chrome, the word "library" leaking implementation detail to a student. It's the seam of the machine showing through the handmade paper.

**Concrete improvement:** Never surface a dependency name to a user. If download isn't available, either hide the Download button, or show an in-world toast: "Saved as an image isn't ready yet — for now, a screenshot works perfectly." Better: ensure `html2canvas` is bundled so the feature simply works.

**Difficulty:** Low. **Impact:** Medium.

---

### P1-G · Scroll-reveal on the landing uses smooth easing in a stepped world

**Files:** `src/app/_components/landing-content.tsx` (`transition: opacity 0.7s ease-out, transform 0.7s ease-out`)

**Why it's a miss:** The landing page uses long, smooth `ease-out` reveals — the visual language of a generic startup site — while the *app* uses crisp `steps()` motion. The front door animates in a different physics than the rooms behind it. A 0.7s ease is also slow enough to feel like a "scrollytelling" template.

**Concrete improvement:** Either make landing reveals quick and stepped to match the app's motion identity, or (more honest to "Quiet") simply fade content in fast (150ms) with minimal translate. Don't perform.

**Difficulty:** Low. **Impact:** Low-Medium.

---

### P1-H · No focus return / trap on overlays

**Files:** `src/components/pixel-ui/command-palette.tsx`, `study-session-receipt.tsx` (full-screen modal), `confirm-dialog.tsx`

**What happens now:** The command palette opens and focuses its input (good) but doesn't trap Tab within the dialog or restore focus to the trigger on close. The receipt modal and confirm dialog are similar. Keyboard users can Tab "behind" the overlay.

**Why it matters for craft, not just a11y:** A modal that lets focus escape feels unfinished — it's the interaction equivalent of a panel whose border doesn't quite meet. Covered in detail in ACCESSIBILITY_AUDIT; flagged here because polish and accessibility are the same thing at this level.

**Difficulty:** Medium. **Impact:** Medium.

---

## 3. Emotional Design Audit

For each surface: *what should the learner feel → what they likely feel now → the gap → the fix.*

| Surface | Desired emotion | Current emotion | Gap | Concrete fix |
|---|---|---|---|---|
| **Today** (`page.tsx`) | "Someone's glad I'm here; today is manageable." | Mostly right, but the streak stat injects a faint "don't break it" anxiety, and a UTC-wrong greeting can feel slightly off. | Streak + random companion line undercut warmth. | Remove streak (P0-A in slop audit), make companion line stable (P0-A here), fix timezone. |
| **Review / Today's Memories** | "I'm strengthening something, gently." | Good — "Revisit what's fading… grows stronger" is on-voice. | Grade buttons "Forgot/Perfect" reintroduce pass/fail framing. | Soften grade labels (COPY_REWRITE). |
| **Feynman** | "I'm being *understood*, then challenged kindly." | Strong. The grounded evaluator + "Thinking…" is the best surface in the app. | Almost none. Watch over-questioning (see AI section). | Keep. Cap follow-up questions at 2–3 (already specified). |
| **Error Spotter** | "Trying and missing is *good* here." | A buzzer: "✗ False alarm." | Copy punishes the brave guess the mode exists to reward. | Reframe verdicts (COPY_REWRITE). |
| **Exam Results** | "An honest, calm read on what's stuck." | Report card: "Excellent!" / "Needs more study." | Score-tier language is performative and slightly anxious. | Growth-framed tiers, no exclamation. |
| **Memory Garden** | "My knowledge is a living thing I tend." | Genuinely good — wilting=nature, not failure. | "Forgotten" (skull icon) for `dead` is a touch harsh. | Consider "Resting" / "Gone quiet" over "Forgotten." |
| **Empty states** (first run) | "A calm, inviting beginning." | Functional but uneven; some say "!", some dead-end. | Inconsistent warmth; the most important first-impression screens. | Unify via `<EmptyState>` with on-voice copy (see below). |

**Cross-cutting note:** Per NN/g and SAP Fiori guidance, [empty states are the first real interaction a new user has](https://www.sap.com/design-system/fiori-design-web/v1-136/foundations/best-practices/global-patterns/designing-for-empty-states) and should frame value + offer one clear next step. Nora's empty copy is *mostly* there but should always (a) name what will live here, (b) reassure, (c) offer exactly one gentle action. The Memory Garden and Journal empty states are good models; Party and Study Mix should match them.

---

## 4. Typography Audit

### P1-I · Pixel font used at sizes too small to read comfortably

**Files:** pervasive — `command-palette.tsx` footer `text-[8px]`, stat labels `text-[9px]`, quest labels, `study-session-receipt.tsx` (`text-[9px]`, `text-[10px]`), many `font-pixel text-[10px]`

**Why it matters:** `docs/PRODUCT_DESCRIPTION.md` correctly assigns the pixel font (SproutLands) to "headings, labels, navigation" and Geist to body — that's the right call. But the pixel font is then used for *information* at 8–10px. Pixel/bitmap fonts lose legibility fast below ~11–12px because the glyphs are built on a coarse grid; at 8px, letterforms collapse. The product's own thesis ("Assume users spend hours reading") demands this be tightened.

**Concrete improvement:**
- Set a floor: pixel font never below 11px. For anything that must be smaller (dense metadata, timestamps), use Geist, not the pixel font.
- Audit every `text-[8px]` / `text-[9px]` `font-pixel` occurrence and either bump the size or switch the family.
- Keep the `letter-spacing: 1px` (it helps pixel legibility) — but spacing can't rescue 8px glyphs.

**Difficulty:** Medium (many occurrences, but mechanical). **Impact:** Medium — comfort over long sessions is core to the product's claim.

### P2-J · Hierarchy & rhythm are good; reading width needs a guard on long-form

**What's good:** The 8px spacing grid, `--pixel-panel-compact/standard/spacious` density tokens, and consistent `font-pixel` headers create a clear rhythm. Today/Review use `max-w-6xl` sensibly.

**Watch:** Long-form reading surfaces — Research answers, Journal entries, RAG citations — should cap line length around 60–75ch for comfortable reading. Verify `research-desk` and `journal` constrain prose width (not just the page). If they inherit the wide page container, paragraphs will run too long on desktop.

**Difficulty:** Low. **Impact:** Medium for the reading-heavy surfaces.

---

## 5. AI Experience Audit

*Does the AI help understanding, or is it just talking?*

### What's genuinely good (and rare)
- **Grounding is real.** `feynman.ts` and `error-spotter.ts` ground evaluation in attached sources, label unverified output, and reject questions-as-explanations. `nora-voice.ts` forbids generic filler ("output that would be identical regardless of what the student wrote"). This is the anti-slop discipline most AI products lack. **Keep it.**
- The Feynman evaluator *teaches* (explains why a segment is wrong), which satisfies DESIGN_PRINCIPLES #1 and #3.

### P1-K · The note editor's ghost-text autocomplete is in philosophical tension
**Files:** `src/app/(protected)/app/study-room/_components/note-editor.tsx` (AI inline completions, Tab to accept)

**The tension:** DESIGN_PRINCIPLES #1 is "AI should teach. Not replace thinking… It never writes your explanation." In Feynman mode this is honored — no autocomplete. But the video-notes editor offers AI ghost-text continuations. Note-taking isn't recall, so it's *defensible* — but it's the one place the AI writes words the student can accept without thinking. Left unbounded, it drifts toward "AI does the work."

**Concrete improvement:** Keep it, but bound it: complete *phrases*, never whole conclusions; never autocomplete inside a Feynman explanation or a flashcard answer; consider a setting to disable it for students who want pure notes. Make sure it never operates on the surfaces where thinking *is* the product.

**Difficulty:** Low-Medium. **Impact:** Medium (protects the core principle from erosion).

### P2-L · Confidence calibration should model the humility it measures
**Files:** `analytics/_components/calibration-tab.tsx`, AI feedback surfaces

Nora has a calibration dashboard (excellent — WHY_NORA "Why does the AI sometimes admit uncertainty?"). Make sure the AI *itself* visibly says "I'm not certain — let's check a source" when grounding is thin (the unverified label exists; surface it warmly, not just as a tag). An AI that models calibrated uncertainty teaches the metacognition the dashboard measures.

**Difficulty:** Low. **Impact:** Medium.

---

## Summary — the five that matter most

1. **P0-A** Make the companion line stable per day (stop the per-render randomness). *Memory, not dice.*
2. **P0-B** Deliver time-of-day atmosphere (and fix the UTC-vs-timezone greeting bug).
3. **P0 (slop) / P0-A here** Resolve the streak contradiction — replace with "rhythm."
4. **P1-E** Replace smooth spinners with a stepped pixel loader.
5. **P1-C** Tier celebration so silence becomes meaningful again.

None of these are new features. Every one is the product keeping a promise it already made to itself in `docs/CRAFT.md`.
