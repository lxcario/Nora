# Identity Audit

Not UI. Not copy. **Identity.**

The other seven audits ask "is this well-made?" This one asks a harder question: **"Is this Nora, or could it belong to any AI startup?"** A screen can be perfectly accessible, perfectly consistent, perfectly worded — and still be forgettable. This document is the compass for Nora 2.0.

The test for every surface is the line from `docs/CRAFT.md` that is Nora's actual moat:

> **"The application should remember before it asks."**

Every study app can add an LLM. Almost none make you feel like the software has been quietly learning alongside you. That feeling — not FSRS, not RAG, not Groq — is the thing worth protecting. So each screen below is scored on whether it *moves toward that feeling* or *away from it*.

---

## Scoring

- **Identity (1–5):** Could this screen belong to any AI study app (1) or only to Nora (5)?
- **Register:** Unforgettable / Warm / Functional / Flat / Off-brand
- **Bond:** does it build **Attachment** (I care), **Trust** (I believe it), both, or neither?

---

## The map

| Screen | Identity | Register | Bond | Verdict |
|---|---|---|---|---|
| **Feynman Mode** | 5 | Unforgettable | Attachment + Trust | The soul of Nora. AI that asks, grounds, and admits uncertainty. *This is the screen to clone the feeling of.* |
| **Memory Garden** | 5 | Unforgettable | Attachment | Decay-as-nature, not failure. A metaphor no spreadsheet app would dare. Signature. |
| **Today (home)** | 4 | Warm | Attachment | "Welcome home" + companion is unmistakably Nora — but the streak/XP/coins stat row drags it toward a generic gamified dashboard. Identity bleeding out at the edges. |
| **Today's Memories (review)** | 4 | Warm | Trust | "Revisit what's fading… grows stronger" reframes the most clichéd surface in studying (the review queue) into something tender. |
| **Journal** | 5 (potential) | Unforgettable (potential) | Attachment | "Who you're becoming," chronological, no graphs. Conceptually the most distinctive screen in the app. Verify the execution matches the idea — if it does, this is a flagship. |
| **Session Receipt** | 4 | Warm | Attachment | The printed-receipt metaphor is *genuinely handmade* — nobody else does this. Undercut by an `alt()` and flat interior copy. A signature waiting to be finished. |
| **Pixel Room + Pet** | 3→5 | Warm → Off | Attachment (at risk) | Highest attachment *potential* in the product, currently spent on guilt copy ("misses you," "cheer them up"). The Tamagotchi line: companion vs. nag. One copy pass from a 5. |
| **Error Spotter** | 3 | Functional | Trust (at risk) | Brilliant, distinctive concept (productive failure). The "✗ False alarm" buzzer betrays it. Concept = Nora; execution = quiz app. |
| **Research Desk** | 2 | Functional/Flat | Trust | Technically the most impressive screen — real citations, honest "fewer than 2 sources." But emotionally it reads like any RAG demo: smooth spinners, "AI-powered academic search," step indicators. *Impressive, not felt.* |
| **Study Room (video)** | 2 | Off-brand | neither | Off-theme violet colors, generic loading, ghost-text AI. Could be any "AI notes" product. |
| **Practice Exam** | 2 | Flat | neither | "Excellent!" / "Needs more study" is a report card. The most anxiety-shaped screen, in the least Nora-shaped voice. |
| **Party / Friends (admin)** | 1 | Off-brand | neither | Indigo/zinc Tailwind defaults. Reads as a different product entirely. The clearest "any AI startup" screen in the repo. |
| **Onboarding** | 3 | Functional | Trust (huge potential) | This is where "remember before it asks" should *begin* — it collects academic identity. But the tour copy ("You got this!") is generic pep-talk. The data is gathered; the *relationship* isn't started. |
| **Landing page** | 2 | Off-brand | neither | Marketing voice ("just vibes"). The front door doesn't match the house. |
| **Command palette** | 2 | Functional | neither | "Dashboard," "AI-powered academic search." Power-user surface speaking SaaS. |
| **Settings** | 3 | Functional | Trust | Utilitarian, fine. The palette/cursor/animation controls quietly say "we respect your comfort" — a small trust signal. |

---

## 1. Which screens feel like Nora?
**Feynman, Memory Garden, Journal, Review, the Session Receipt.** These five share a property: they take a *generic study primitive* (explain, review, history, a study log) and re-see it as something a person experiences emotionally. The Garden isn't "topic mastery %," it's a living thing you tend. The Journal isn't "activity history," it's "who you're becoming." **That re-seeing is Nora's whole craft.** When the team is unsure whether something is on-identity, the question is: *did we re-see the primitive, or just style it?*

## 2. Which screens could belong to any AI startup?
**Party admin, Study Room, Landing, Command palette, Research Desk, Practice Exam.** The tell is always the same: a *generic primitive left generic*, then skinned. Research Desk is the painful one — it's the most *engineered* screen and the least *Nora* screen, because impressive retrieval was the goal and the relationship was an afterthought. The Party admin screen doesn't even get the skin right (off-theme colors).

## 3. Which pages are emotionally unforgettable?
Today (the "Welcome home" beat), Feynman (being understood then challenged), the Garden (watching something bloom), and — if executed — the Journal (reading your own growth months later). These are the moments a user would *describe to a friend.* Everything else is, at best, pleasant.

## 4. Which pages are technically impressive but emotionally flat?
**Research Desk and the RAG pipeline.** Genuinely hard engineering — hybrid retrieval, RRF, grounded citations, SSRF guards. Zero of that effort is *felt* by the learner, who sees a spinner and a wall of text. The gap between engineering investment and emotional payoff is largest here. (This is not "make it flashy" — it's "let the honesty and the care *show*": surface the "I checked 6 sources and only 2 really answer this — here's what I'm unsure about" as a human moment, not a tag.)

## 5. Which moments create attachment?
- The companion noticing yesterday's struggle ("I remember `recursion` gave us trouble").
- The pet bobbing in the sidebar, present without demanding.
- A flower blooming in the Garden.
- The session receipt you could screenshot and keep.
**Common thread:** attachment comes from *being remembered and noticed*, never from points. Every attachment moment in Nora is a memory moment. That is not a coincidence — it's the thesis.

## 6. Which moments create trust?
- Feynman grounding feedback in your actual source, and labeling "unverified" when there's none.
- Research Desk saying "fewer than 2 sources found" instead of bluffing.
- The calibration dashboard.
- No streak punishment (the *promise*) — currently broken by the *implementation*.
**Common thread:** trust comes from *honest uncertainty*. Nora earns belief by admitting what it doesn't know. The single biggest trust leak right now is the philosophy↔product contradictions (streaks), because a user who catches one broken promise discounts all the others.

---

## The identity gradient

Lay the screens on one axis — "skinned a generic thing" → "re-saw the thing":

```
ANY AI STARTUP                                                     ONLY NORA
│                                                                          │
Party admin ─ Study Room ─ Research Desk ─ Exam ─ Onboarding ─ Today ─ Review ─ Feynman ─ Garden ─ Journal
   (1)            (2)          (2)        (2)       (3)        (4)     (4)       (5)       (5)       (5)
```

**Nora 2.0's job is to push everything left of "Today" rightward** — not by adding features, but by *re-seeing each generic primitive the way Feynman and the Garden were re-seen.* Research Desk shouldn't be "search" — it should be "looking into a question *together*." The exam shouldn't be a report card — it should be "a quiet check on what's stuck." Onboarding shouldn't collect a form — it should be *the moment the companion starts remembering you.*

---

## Three identity commitments for Nora 2.0

1. **Every memory beat is sacred; protect them ruthlessly.** The companion remembering, the Garden, the Journal, the receipt. These are the moat. Never let a sprint "optimize" them into something more efficient and less alive. (CRAFT.md already says this: "Would this still belong here five years from now?")

2. **Re-see the flat screens instead of restyling them.** Research Desk, Exam, Study Room, Party. The fix isn't new colors — it's a new *frame*. Ask of each: "what is the human verb here?" (looking into / checking / learning-from / studying-with) and build the screen around that verb.

3. **Start the relationship at onboarding, not after it.** Right now onboarding *collects* (university, faculty, year) and the relationship starts on the Today screen. Flip it: the moment a learner names their first subject, the companion should already say something that proves it was listening. "Remember before it asks" should be literally true from minute one — the app should remember the first thing you told it and reflect it back before asking for the second.

---

## The one sentence

Most of Nora's identity lives in five screens. The work of 2.0 is making the *other fifteen* feel like they were made by the same hands — and never, ever letting an engineering win (RAG, streaks, "another model") quietly overwrite a memory beat. **Nora's competitors will all have the LLM. None of them will remember you. Spend the next year making that true everywhere, not just in Feynman.**
