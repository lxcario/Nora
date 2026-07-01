# AI Slop Audit

Where Nora stops sounding like Nora and starts sounding like every other AI product.

This document is brutal on purpose. The good news first, because it matters for context: Nora's *internal* voice infrastructure is genuinely well-built. `docs/VOICE.md` is a real voice spec, `src/lib/nora-voice.ts` is one of the better LLM voice-fragment systems I've read, and `src/lib/companion-dialogue.ts` is hand-written with care. The problem is **drift**: the voice is defined beautifully in some places and abandoned completely in others. The product currently speaks in at least three different voices — the handmade companion voice, a casual Gen-Z marketing voice, and a generic SaaS/shadcn voice — and the seams show.

Severity scale: **P0** breaks the core promise · **P1** noticeable voice drift · **P2** polish.

---

## P0-1 · The landing page is a different product than the app

**Files:** `src/app/_components/landing-content.tsx`

**Current text (verbatim):**
- Hero: "Your study buddy / that gets it"
- "Tired of staring at notes and hoping something sticks?"
- Companion card: "It's happy when you study, sleepy when you don't. No guilt though — just vibes."
- Principles: "never pretends studying should feel like scrolling TikTok"
- Pill: "Skip a day? No streak reset drama"
- CTA: "Come on in" / "Free, no credit card, no catch." / "Start studying free" / "Get Started" / "Create my account"

**Why it feels generic / off-brand:** `docs/CRAFT.md` lists Nora's five voice words: *Gentle, Patient, Honest, Quiet, Handmade.* `docs/VOICE.md` explicitly bans marketing language and says the feeling should be "Someone quietly believes you can learn this." The landing page instead reads like a Series-A growth-team draft: "that gets it," "just vibes," "no catch," "scrolling TikTok." This is the single highest-stakes voice surface — it's the first thing a new student or an open-source contributor sees — and it sounds like it was written to convert, not to welcome. It is also internally contradictory: it brags "No streak reset drama" while the app ships a streak counter (see P0-3 and the UX audit).

The cruel irony: the **README is on-voice and the landing page is not.** The README says "You don't become knowledgeable in a day. You become knowledgeable one remembered idea at a time." The landing page says "just vibes." Same product, two authors.

**Rewritten version (hero):**
> *FOR PEOPLE WHO WANT TO ACTUALLY UNDERSTAND*
> **A softer way to study.**
> Nora helps you explain things in your own words, brings ideas back right before you'd forget them, and never makes you feel behind. Studying, with company.

**Rewritten CTA section:**
> **Come learn with us.**
> Free to start. Pick a companion, name your subjects, explain your first idea today.
> [ Begin ]   [ I already have an account ]

**Reasoning:** Lead with the promise (`understanding`, `company`), not the objection-handling ("no credit card, no catch"). Drop every "drama/vibes/TikTok" reference — they date instantly and undercut the calm. "Begin" beats "Start studying free"; the second verb is a marketing verb. Match the README's register exactly so the front door and the living room feel like the same home.

**Difficulty:** Low (single file, copy-only). **Impact:** High — this is the brand's first impression.

---

## P0-2 · `quotes.ts` is literal inspirational-poster slop

**Files:** `src/app/(protected)/app/_actions/quotes.ts`

**Current text (verbatim):** Pulls a daily quote from the ZenQuotes API, with hardcoded fallbacks including:
- "The only way to do great work is to love what you do." — Steve Jobs
- "The more I read, the more I acquire... I know nothing." — Voltaire
- "Education is not preparation for life; education is life itself." — John Dewey

**Why it feels generic:** This is the most recognizable shape of AI/content slop in existence — the random celebrity motivational quote. It is the opposite of `docs/CRAFT.md`'s "Memory, not Personalization": a Steve Jobs quote knows nothing about *this* learner, *this* Thursday, *this* struggle. A third-party API (`zenquotes.io`) means Nora's voice is literally outsourced to a random server, and you cannot guarantee it stays gentle/quiet/non-corporate. It is also a privacy/availability liability (external fetch on a core screen).

**Rewritten version:** Delete the feature, or replace it with Nora's own remembered observations. The raw material already exists — `companion-dialogue.ts` proves the team can write. If a "thought for today" is wanted, draw from the learner's own journey:
> *"Three weeks ago, recursion gave us trouble. Today you explained it twice."*

If a static line is needed when there's no history yet, write a handful in Nora's voice and keep them local:
> *"Knowledge grows slowly. That's the whole point."*

**Reasoning:** Every word the user reads should plausibly have come from the same companion. A Voltaire quote could appear in any productivity app on earth — which is exactly the test `docs/VOICE.md` says we must fail-safe against.

**Difficulty:** Low (delete) to Medium (replace with journey-aware line). **Impact:** Medium-High.

---

## P0-3 · The app counts streaks, which the philosophy forbids

**Files:** `src/app/(protected)/app/page.tsx` (Streak `AmbientStat`, the commented "Streak at risk" proposal block), `src/lib/companion-dialogue.ts` (streak rules), `src/lib/streak.ts`, `src/lib/format-streak.ts`, `docs/SPEC-STREAKS-WIDGET.md`

**Current state:** The Today screen renders a streak counter ("3 days"), there's a 30-line code comment proposing three ways to add a "streak at risk" warning, and the companion has streak-triggered lines ("`{streak}` days of growing together. Quietly proud.").

**Why this is slop (the philosophical kind):** `docs/WHY_NORA.md` has an entire section titled "Why no guilt-based streaks?" that says the first screen should *not* say "Streak: 12," and `docs/DESIGN_PRINCIPLES.md` #2 is literally "Growth over streaks." External research backs the team's own instinct: streak mechanics are widely documented to produce anxiety and turn learning into number-maintenance ([streak anxiety analysis](https://my-senpai.com/insights/why-people-quit-duolingo.html); [The Decision Lab on "streak creep"](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)). Shipping a streak — and then *designing a "you're about to lose it" nudge* — is adopting the exact engagement trick the product was founded to reject. It's "generic productivity app" thinking wearing a cozy sweater.

**Rewritten version:** Replace the streak stat with a non-punishing "rhythm" framing that VOICE.md already names ("Heatmap → Learning rhythm"). Show *presence*, not a *fragile counter*: "You've shown up 4 of the last 7 days" or simply the existing Memory Garden. Delete the "streak at risk" proposal entirely. Keep the companion's "you've been showing up" warmth but detach it from a breakable integer.

**Reasoning:** A streak you can break is a guilt mechanic by construction. The garden already does the job streaks pretend to do — it shows decay as *nature*, not *failure*.

**Difficulty:** Medium (touches Today layout + companion rules). **Impact:** High — it's the difference between honoring the manifesto and quietly betraying it. See UX_CRAFT_AUDIT P0-A for the full treatment.

---

## P1-4 · The command palette says "Dashboard" (a banned word)

**Files:** `src/components/pixel-ui/command-palette.tsx`

**Current text (verbatim):**
- `{ label: "Dashboard", description: "Go to home" }`
- `{ label: "Research Desk", description: "AI-powered academic search" }`
- `{ label: "Practice Exam", description: "Test your knowledge" }`
- `{ label: "Review Cards", description: "FSRS spaced repetition" }`
- placeholder: "Where do you want to go?"

**Why it feels generic:** `docs/WHY_NORA.md` has a section called "Why 'Today' instead of 'Dashboard'?" — and here the command palette ships the word "Dashboard" anyway. "AI-powered academic search" is pure SaaS feature-sheet language; "Test your knowledge" is a quiz-app cliché; "FSRS spaced repetition" exposes the raw algorithm name in a place VOICE.md says to wrap it. This component is invisible until power users open it, but power users are exactly the people who notice voice cracks.

**Rewritten version:**
| id | label | description |
|---|---|---|
| home | Today | Where you are now |
| review | Today's Memories | Revisit what's fading |
| feynman | Feynman Mode | Explain an idea |
| research | Research Desk | Look into a question together |
| exam | Practice Exam | A quiet check on what's stuck |
| analytics | Your Journey | Progress over time |

placeholder → "Where would you like to go?"

**Reasoning:** Reuse the names that already exist on the nav and in VOICE.md's vocabulary table. Descriptions should describe the *feeling/action*, not the technology.

**Difficulty:** Low. **Impact:** Medium.

---

## P1-5 · Loading text is "Loading…" in five places (should be "Thinking…")

**Files:** `src/app/(protected)/app/research/_components/ingestion-progress.tsx` ("Loading status…", "Queued for processing…"), `src/app/(protected)/app/study-room/_components/youtube-player.tsx` ("Loading player…"), `src/app/(protected)/app/feynman/_components/feynman-editor.tsx` ("Loading source…", "Loading papers…"), `src/app/(protected)/app/research/_components/research-desk.tsx` ("Searching your papers…")

**Why it feels generic:** `docs/VOICE.md` is explicit: Loading → "Thinking…" (Never: "Loading…"). The Feynman editor already gets this right — it shows "Thinking…" during AI suggestion. So the rule exists, is followed in one file, and is ignored in five others. That inconsistency is the tell of generated-then-forgotten code.

**Rewritten version:** A single shared loading vocabulary, applied everywhere:
- generic wait → "Thinking…"
- ingesting a PDF → "Reading your paper…"
- searching papers → "Looking through your papers…"
- video buffering → "Getting the video ready…"

**Reasoning:** "Loading…" describes the machine's state. "Reading your paper…" describes *what Nora is doing for you* — same spinner, completely different relationship. Centralize it so it can't drift again (see COMPONENT_CONSISTENCY).

**Difficulty:** Low. **Impact:** Medium.

---

## P1-6 · Error and result copy is robotic / performative

**Files:** `src/components/pixel-ui/error-state.tsx` ("Retry"), `src/app/(protected)/app/exam/error.tsx` ("SOMETHING WENT WRONG", "Error: {digest}", "Try Again", "Go Home"), `src/app/(protected)/app/exam/_components/exam-results.tsx` (score tiers "Excellent!", "Good work", "Getting there", "Needs more study"; "Cards saved to your review queue!"), `src/app/(protected)/app/error-spotter/_components/error-spotter-client.tsx` ("✓ Correct!", "◐ Partial", "✗ False alarm")

**Why it feels generic:**
- "Retry" and "SOMETHING WENT WRONG" / "Error: {digest}" are exactly what VOICE.md forbids ("Never: 'Error 500: Internal Server Error'"). NN/g's [error-message guidelines](https://www.nngroup.com/articles/error-message-guidelines/) and [hostile error messages](https://www.nngroup.com/articles/hostile-error-messages/) both say to use plain language and offer a path forward — a raw `digest` hash does the opposite.
- "Excellent!" and the exclamation marks are on VOICE.md's explicit *Avoid* list ("Excellent work!" too corporate; "Outstanding!" too loud). "Needs more study" is a report-card verdict, not a companion's encouragement.
- "✗ False alarm" frames a wrong guess like a security buzzer. The whole point of Error Spotter (the "derring effect") is that *trying and missing is good* — the copy should reward the attempt.

**Rewritten version:**
- Retry button → "Let's try again"
- Exam error → "That didn't load. This usually sorts itself out in a moment — want to try again?" (drop the raw digest from the primary message; log it instead)
- Score tiers → "This is really solid." / "You're most of the way there." / "This is still coming together." / "This one's still growing." (no exclamation, no "needs more study")
- Error Spotter verdicts → "Found it." / "Close — you spotted the right area." / "This part's actually correct."

**Reasoning:** VOICE.md's vocabulary table already did this work: Correct→Remembered, Retry→Let's try again, Failed→Not yet. The code just didn't read its own style guide.

**Difficulty:** Low. **Impact:** Medium-High (errors and results are emotionally loaded moments).

---

## P1-7 · Onboarding/tour and pet messages use exclamation-y pep-talk

**Files:** `src/components/pixel-ui/onboarding-tour.tsx` ("Study regularly and they'll stay happy!", "You got this!"), `src/app/(protected)/app/_components/game-top-bar.tsx` ("Earn XP by studying. Level up to unlock new pets, themes, and decorations!"), `src/app/(protected)/app/room/_components/pixel-room.tsx` (PET_MESSAGES: "misses you. Study a bit more to cheer them up!", "is sad… Complete a session to start improving their mood.")

**Why it feels generic:** "You got this!" is the single most generic encouragement string in software. VOICE.md lists "Great job!" as barely-acceptable and prefers subtler. The pet messages are quietly guilt-based ("misses you," "cheer them up") — which is exactly the dynamic WHY_NORA says to avoid ("the pet gets sad but recovers… framed as nature, not failure"). Imperatives ("Study a bit more," "Complete a session") order the user around; the companion is supposed to *invite*, not instruct.

**Rewritten version:**
- Tour pet step → "This is your companion. It notices when you study, and it's patient when life gets busy."
- Tour XP step → "You'll grow as you go. New companions, themes, and room pieces unlock along the way — no rush."
- Pet "sad" → "Resting for now. It'll perk up next time we study together."

**Reasoning:** Remove every exclamation and every imperative. Replace "do this to fix the pet" (transactional) with "the pet reflects our rhythm" (relational). This is the difference between a Tamagotchi guilt-trip and a companion.

**Difficulty:** Low. **Impact:** Medium.

---

## P2-8 · Smaller generic strings worth a pass

**Files & verbatim:**
- `src/app/(protected)/app/study/page.tsx`: "No study items available!" + "build your interleaved study queue" — exclamation + jargon ("queue").
- `src/app/(protected)/app/study/_components/study-session.tsx`: FSRS labels "Forgot / Struggled / Recalled / Perfect" — "Perfect" is performative; consider "Knew it."
- `src/app/(protected)/app/_components/study-session-receipt.tsx`: "Study Session Complete", "What you did", "Done", "📥 Download". The *receipt metaphor* is a lovely handmade idea — but the copy inside is flat. "What you did" → "Time spent growing" (VOICE.md's own phrase).
- Party empty states: "Create one and invite friends!", "Start a conversation!", "No members yet." — exclamations and dead-ends.
- `src/components/pixel-ui/command-palette.tsx` footer: "↑↓ navigate · Enter select · Esc close" — fine, but "Study Circle / Friends and quests" could be warmer.

**Reasoning:** None of these are fatal, but collectively they're the difference between a product that *mostly* sounds handmade and one that *always* does. The bar VOICE.md sets is "every label, tooltip, empty state, and notification" — there is no exempt surface.

**Difficulty:** Low. **Impact:** Low individually, Medium collectively.

---

## What's already good (so it doesn't get broken)

- `src/lib/nora-voice.ts` — the LLM voice fragments are specific, behavioral, and correctly placed *above* structural rules. Keep this as the single source of truth for AI-generated text.
- `src/lib/companion-dialogue.ts` — handwritten, weighted, context-aware, on-voice. This is the model the rest of the copy should aspire to. (Its one flaw — re-randomization per render — is an interaction bug, covered in UX_CRAFT_AUDIT.)
- `docs/VOICE.md` itself — the vocabulary table is excellent. The findings above are almost all "the code didn't follow VOICE.md," not "VOICE.md is wrong."
- The Today screen's core ("Welcome home." + companion line + "Today's Journey") is genuinely on-voice.

**The one-line summary:** Nora has a great voice and an inconsistent memory of it. Fix the landing page, delete the quotes API, resolve the streak contradiction, and centralize loading/error/result copy — and the slop is 80% gone.
