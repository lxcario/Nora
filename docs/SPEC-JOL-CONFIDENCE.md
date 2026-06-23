# Spec: Confidence Rating (Judgment of Learning) — Review Session

## Research Basis

Delayed cue-only Judgments of Learning (JOLs): showing the cue (question) WITHOUT
the answer, having the user estimate their confidence they can recall it, THEN
letting them attempt retrieval. The "cue-only, before reveal" placement is what's
actually backed by the reactivity research — the covert retrieval attempt during
the confidence judgment itself serves as an additional spaced retrieval trial.

Evidence: Small but real reactivity effect (g≈0.08), well-documented in
metacognition literature. The value is in calibration data + the extra retrieval
attempt, not a dramatic learning boost.

---

## 1. Current Review Flow (step-by-step)

```
State: revealed = false
┌─────────────────────────────────────────┐
│  [Topic badge]                          │
│  [Video source badge if applicable]     │
│                                         │
│  QUESTION                               │
│  "What is the capital of France?"       │
│                                         │
│  ─────────────────────────────          │
│  [ Reveal Answer ]  (button, full width)│
└─────────────────────────────────────────┘
         │
         │ user clicks "Reveal Answer" → setRevealed(true)
         ▼
State: revealed = true
┌─────────────────────────────────────────┐
│  QUESTION                               │
│  "What is the capital of France?"       │
│                                         │
│  ─────────────────────────────          │
│  ANSWER                                 │
│  "Paris"                                │
│                                         │
│  ─────────────────────────────          │
│  "How well did you recall this?"        │
│  [Again] [Hard] [Good] [Easy]           │
└─────────────────────────────────────────┘
         │
         │ user clicks a grade → handleGrade(rating)
         │   → submitReview(cardId, rating) server action
         │   → FSRS schedules next due date
         │   → XP toast, advance to next card
         ▼
Next card (or session complete)
```

Key implementation details:
- `revealed` is a boolean state
- `handleReveal()` just sets `revealed = true`
- `handleGrade(rating)` calls `submitReview`, manages XP, advances queue
- Intra-session requeue: if rating === Again, card re-appends to queue

---

## 2. Option A: Research-Faithful Placement (cue-only, BEFORE reveal)

This is what the literature validated. The confidence step goes between seeing
the question and choosing to reveal the answer.

```
State: revealed = false, confidenceGiven = false
┌─────────────────────────────────────────┐
│  QUESTION                               │
│  "What is the capital of France?"       │
│                                         │
│  ─────────────────────────────          │
│  "Before revealing — how confident      │
│   are you that you know the answer?"    │
│                                         │
│  [1] [2] [3] [4] [5]                   │
│  Can't   Unsure  Maybe  Pretty  Certain │
│  recall                  sure           │
└─────────────────────────────────────────┘
         │
         │ user selects confidence → setConfidence(n), setConfidenceGiven(true)
         ▼
State: revealed = false, confidenceGiven = true
┌─────────────────────────────────────────┐
│  QUESTION                               │
│  "What is the capital of France?"       │
│                                         │
│  Confidence: ●●●○○ (Pretty sure)       │
│                                         │
│  ─────────────────────────────          │
│  [ Reveal Answer ]                      │
└─────────────────────────────────────────┘
         │
         │ user clicks Reveal → normal flow continues
         ▼
State: revealed = true
┌─────────────────────────────────────────┐
│  QUESTION + ANSWER + FSRS grading       │
│  (exactly as today)                     │
└─────────────────────────────────────────┘
```

**What this changes in review-session.tsx:**
- Add `confidenceGiven: boolean` and `confidence: number | null` state
- The "Reveal Answer" button is hidden until confidence is given
- New UI section between question display and reveal button
- After grading, `submitReview` additionally stores the confidence value
- Reset `confidence` and `confidenceGiven` on card advance

**Disruption to existing code:** MODERATE
- The `!revealed` branch gains a sub-state (confidence given vs not)
- "Reveal Answer" is no longer the first action after seeing the question
- One additional click per card (confidence → reveal → grade = 3 steps instead of 2)

**Evidence strength for this placement:** This is what was actually validated.
The forced cue-only retrieval attempt BEFORE seeing the answer is the mechanism
that produces the reactivity benefit.

---

## 3. Option B: Lower-Disruption Placement (after reveal, before grading)

This is the easier implementation. Confidence is collected AFTER the answer is
revealed but BEFORE the FSRS grade.

```
State: revealed = true
┌─────────────────────────────────────────┐
│  QUESTION                               │
│  ANSWER                                 │
│                                         │
│  ─────────────────────────────          │
│  "How confident were you BEFORE         │
│   seeing the answer?"                   │
│                                         │
│  [1] [2] [3] [4] [5]                   │
│                                         │
│  ─────────────────────────────          │
│  [Again] [Hard] [Good] [Easy]           │
└─────────────────────────────────────────┘
```

**What this changes:**
- Add a 5-button confidence row above the FSRS grading buttons
- Confidence is optional or required before grade buttons enable
- Stores alongside the grade in the same `submitReview` call

**Disruption:** MINIMAL — just adds UI elements within the already-revealed branch.

**Evidence weakness:** This is NOT what the literature validated. After seeing
the answer, the user's confidence judgment is contaminated by the answer itself
(hindsight bias). The covert retrieval attempt (the actual mechanism) doesn't
happen because the answer is already visible. This becomes purely a data-collection
tool with no learning benefit — useful for calibration analytics but not for the
reactivity effect itself.

---

## 4. Recommendation

**Build Option A for the hackathon.** Here's why:

1. **It's what the research actually supports.** If judges or the submission
   narrative say "evidence-based confidence ratings," it should BE the validated
   mechanic, not a weakened version.

2. **The disruption is manageable.** It's one new state variable and a conditional
   UI branch within `!revealed`. No changes to FSRS logic, no changes to
   `submitReview`'s core scheduling, no changes to `SessionStatsProvider`.

3. **It creates real regressions for the TestSprite loop.** Adding a gate before
   "Reveal Answer" changes the page flow — any TestSprite test that expects to
   click "Reveal Answer" immediately after the question loads will now FAIL
   because the confidence step is in the way. That's a genuine regression the
   loop catches and you fix the test plan for. Perfect hackathon material.

4. **One extra click per card is acceptable.** The confidence judgment takes <2
   seconds (5 buttons, tap one). It doesn't meaningfully slow review sessions.

**THE TRADEOFF, stated explicitly:** Option A adds one extra interaction step
per card (3 taps per card: confidence → reveal → grade, vs 2 today). This
slightly increases session friction. If testing reveals users find it annoying,
we can make it optional (toggle in Settings → Preferences) post-hackathon. For
the hackathon build, it ships as always-on.

---

## 5. Schema Addition (minimal)

One new column on `card_reviews`:

```sql
-- Migration: 018_jol_confidence.sql (additive, no existing columns touched)
ALTER TABLE card_reviews
  ADD COLUMN IF NOT EXISTS jol_confidence SMALLINT
    CHECK (jol_confidence IS NULL OR (jol_confidence >= 1 AND jol_confidence <= 5));

COMMENT ON COLUMN card_reviews.jol_confidence IS
  'Pre-reveal Judgment of Learning confidence (1=cannot recall, 5=certain). NULL for reviews before this feature.';
```

That's it. One nullable column. No new tables. The calibration comparison
(predicted vs actual) can be computed client-side or in a future analytics query
by comparing `jol_confidence` against whether the grade was Again (fail) or
Good/Easy (pass).

---

## 6. Changes to `submitReview` Server Action

Current signature:
```ts
export async function submitReview(cardId: string, rating: Grade): Promise<...>
```

New signature:
```ts
export async function submitReview(cardId: string, rating: Grade, jolConfidence?: number): Promise<...>
```

The `jolConfidence` parameter (1-5 or undefined) is stored in the `card_reviews`
insert alongside the existing grade. FSRS scheduling logic is untouched — it
still receives only the `rating`.

---

## 7. Conflict Check

| System | Conflicts? | Notes |
|---|---|---|
| SessionStatsProvider | No | Stats are updated after `submitReview` returns — unaffected |
| FSRS grading logic (`lib/fsrs.ts`) | No | `scheduleReview` still receives the same `Grade` input |
| XP toast / gamification | No | Rewards are triggered by the grade, not the confidence step |
| Intra-session requeue (Again) | No | Requeue logic runs after grading — confidence is already captured |
| Study Mix study-session.tsx | Separate component | Study Mix has its own FlashcardView — needs the same treatment OR can be left without JOL for now (different session type) |

**Recommendation:** Implement in `review-session.tsx` only for the hackathon.
The Study Mix `study-session.tsx` FlashcardView can get it in a follow-up. This
limits the blast radius and gives one place for TestSprite to test.

---

## 8. UI Spec (pixel-art themed)

The confidence step renders as 5 square buttons in a row, matching the
pixel-panel aesthetic:

```
┌──────────────────────────────────────────┐
│  "How confident are you?"                │
│  (font-pixel text-[10px])                │
│                                          │
│  [1]   [2]    [3]     [4]      [5]      │
│  Can't Unsure Maybe   Pretty   Certain   │
│  recall              sure               │
│                                          │
│  Colors: gradient from error → warning   │
│          → accent → success              │
└──────────────────────────────────────────┘
```

After selection, shows a small badge: "Confidence: ●●●○○" and enables
"Reveal Answer" below it.

---

## Summary

- **What:** 5-point confidence rating before reveal, stored in card_reviews
- **Where:** `review-session.tsx` only (not Study Mix for now)
- **Schema:** One column addition (`jol_confidence SMALLINT`)
- **Server action:** One optional parameter added to `submitReview`
- **FSRS impact:** Zero — scheduling untouched
- **Hackathon value:** Creates a real flow change that TestSprite tests will catch as regression → fix → rerun loop material
- **Evidence alignment:** Option A matches the validated research mechanic
