# Copy Rewrite

Every string below is a verbatim quote from the codebase, paired with a rewrite in Nora's voice (`docs/VOICE.md`): gentle, patient, honest, quiet, handmade. "We" for learning, "you" for actions. No exclamation pile-ups, no marketing, no jargon leaking through.

This is a working rewrite sheet — a developer should be able to find the string, see the replacement, and ship it. Strings are grouped by surface. The `→` is the change.

A note on consistency: VOICE.md already wrote the dictionary. Most of these are just "apply VOICE.md's own table." Where the table is silent, I extend it in the same register.

---

## 1. Landing page — `src/app/_components/landing-content.tsx`

The whole page should be re-registered from "growth-team casual" to "the README's quiet warmth."

| Current | Rewrite |
|---|---|
| `FOR STUDENTS WHO ACTUALLY CARE` | `FOR PEOPLE WHO WANT TO UNDERSTAND` |
| `Your study buddy / that gets it` | `A softer way to study.` |
| `Tired of staring at notes and hoping something sticks? Nora makes you explain things, quizzes you at the right time, and never judges when you skip a day.` | `Nora helps you explain ideas in your own words, brings them back right before you'd forget, and never makes you feel behind. Studying — with company.` |
| `Not another flashcard app` | `Not another flashcard app.` *(keep — it's fine; just lose the swagger around it)* |
| `It's happy when you study, sleepy when you don't. No guilt though — just vibes.` | `It notices when you study and rests quietly when you don't. No guilt — it's just glad you're here.` |
| `Built different on purpose` | `Built slowly, on purpose.` |
| `…never pretends studying should feel like scrolling TikTok.` | `…and never pretends understanding should feel effortless.` |
| `Skip a day? No streak reset drama` | `Miss a day? Nothing resets. Life happens.` |
| `Friends, not rankings` | `Friends, not rankings.` *(keep)* |
| `AI asks questions, doesn't give answers` | `The AI asks questions. You do the thinking.` |
| `Warm, not sterile` | `Warm, not sterile.` *(keep)* |
| `TAKES 30 SECONDS` | *(remove — urgency framing)* |
| `Come on in` | `Come learn with us.` |
| `Free, no credit card, no catch. Pick a pet, set up your subjects, and start your first session.` | `Free to start. Pick a companion, name your subjects, and explain your first idea today.` |
| `Get Started` / `Start studying free` / `Create my account` | `Begin` / `Begin` / `Create my account` *(one verb, "Begin")* |
| `I have an account` | `I already have an account` |
| `Smart Flashcards` | `Memories that return` *(matches "Fading memories" vocabulary)* |
| `Study Circle` card body: `It's studying with company, not a competition.` | `Studying with company — never a competition.` *(keep, light touch)* |

**Reasoning:** The README already proves the team can write the landing page in-voice. This table just drags the front door back to the same register as the living room.

---

## 2. Command palette — `src/components/pixel-ui/command-palette.tsx`

| Current label / description | Rewrite |
|---|---|
| `Dashboard` / `Go to home` | `Today` / `Where you are now` |
| `Review Cards` / `FSRS spaced repetition` | `Today's Memories` / `Revisit what's fading` |
| `Feynman Mode` / `Explain and get feedback` | `Feynman Mode` / `Explain an idea in your words` |
| `Research Desk` / `AI-powered academic search` | `Research Desk` / `Look into a question together` |
| `Study Planner` / `Spacing-aware schedule` | `Study Planner` / `Sessions spread across the week` |
| `Practice Exam` / `Test your knowledge` | `Practice Exam` / `A quiet check on what's stuck` |
| `Analytics` / `Progress and stats` | `Your Journey` / `How far you've come` |
| `Study Circle` / `Friends and quests` | `Study Circle` / `The people studying with you` |
| placeholder `Where do you want to go?` | `Where would you like to go?` |

**Reasoning:** VOICE.md bans "Dashboard," wraps "FSRS," and reframes "Statistics → Journey." Descriptions should name the feeling, not the technology.

---

## 3. Loading states (centralize — see COMPONENT_CONSISTENCY)

| File | Current | Rewrite |
|---|---|---|
| `research/_components/ingestion-progress.tsx` | `Loading status...` | `Thinking…` |
| `research/_components/ingestion-progress.tsx` | `Queued for processing...` | `Waiting its turn…` |
| `research/_components/ingestion-progress.tsx` | `Processing your paper` | `Reading your paper…` |
| `research/_components/research-desk.tsx` | `Searching your papers...` | `Looking through your papers…` |
| `study-room/_components/youtube-player.tsx` | `Loading player...` | `Getting the video ready…` |
| `feynman/_components/feynman-editor.tsx` | `Loading source...` / `Loading papers…` | `Finding your source…` / `Gathering your papers…` |
| `settings/_components/*` | `Saving...` / `Saved!` | `Saving…` / `Saved` *(drop the exclamation)* |
| `research/_components/ingestion-progress.tsx` | `Paper indexed! {n} chunks created` | `Ready. Nora can answer questions about this now.` *(hide "chunks" — implementation detail)* |

**Reasoning:** "Loading…" is the machine's word. "Reading your paper…" is Nora's. The Feynman editor already says "Thinking…" — every other surface should agree.

---

## 4. Errors — `error-state.tsx`, `exam/error.tsx`, inline errors

| File | Current | Rewrite |
|---|---|---|
| `pixel-ui/error-state.tsx` | `Retry` | `Let's try again` |
| `exam/error.tsx` | `SOMETHING WENT WRONG` *(title)* | `That didn't load` |
| `exam/error.tsx` | `Error: {error.digest}` | *(remove from UI; log it. Show:)* `This usually sorts itself out in a moment.` |
| `exam/error.tsx` | `Try Again` / `Go Home` | `Try again` / `Back to Today` |
| `study/page.tsx` | `Couldn't build your study queue. Try refreshing.` | `We couldn't gather your mix just now. A refresh usually does it.` |
| `research/_components/research-desk.tsx` | `Query failed` | `That search didn't come through. Want to try again?` |
| feynman.ts | `AI returned invalid JSON. Please try again.` | `Nora's response got tangled. Let's try that again.` |
| feynman.ts | `No AI API key configured. Please add a GROQ_API_KEY…` | *(developer-facing — keep technical, but never show raw to a student; gate behind an admin/debug path)* |

**Reasoning:** Per [NN/g error guidance](https://www.nngroup.com/articles/error-message-guidelines/), a good message uses plain language and offers a way forward. A raw `digest` hash and "SOMETHING WENT WRONG" do neither. VOICE.md: never "Error 500."

---

## 5. Exam results — `exam/_components/exam-results.tsx`

| Current (score tier) | Rewrite |
|---|---|
| `Excellent!` (≥90) | `This is really solid.` |
| `Good work` (≥70) | `You're most of the way there.` |
| `Getting there` (≥50) | `This is still coming together.` |
| `Needs more study` (<50) | `Still growing — that's okay.` |
| `Cards saved to your review queue!` | `Saved. These will return as memories when it's time.` |
| `Save All as Flashcards` | `Keep these as memories` |
| `Take Another Exam` | `Try another` |
| `Back to Exams` | `Back` |

**Reasoning:** VOICE.md *Avoid* list includes "Excellent!" and excess exclamation; *Prefer* "This is still growing." Results are an anxious moment — the copy should lower the heart rate, not raise it.

---

## 6. Error Spotter — `error-spotter/_components/error-spotter-client.tsx` + `_actions/error-spotter.ts`

| Current | Rewrite |
|---|---|
| `✓ Correct!` | `Found it.` |
| `◐ Partial` | `Close — right area.` |
| `✗ False alarm` | `This part's actually fine.` |
| feedback: `Correct! {explanation}` | `Found it. {explanation}` |
| feedback: `You found the right area but your explanation needs more detail. {explanation}` | `You spotted the right area — say a little more about why. {explanation}` |
| feedback: `This part is actually correct — no error here.` | `This part's actually correct — good eye for checking.` |
| `Results` *(panel title)* | `What you caught` |

**Reasoning:** Error Spotter is built on the *derring effect* — the value is in the brave attempt, including the misses. "✗ False alarm" punishes exactly the behavior the mode rewards. Reframe a wrong guess as careful checking.

---

## 7. Pet & onboarding tour — `room/_components/pixel-room.tsx`, `pixel-ui/onboarding-tour.tsx`, `_components/game-top-bar.tsx`

| Current | Rewrite |
|---|---|
| `{pet} is happy! Keep studying consistently.` | `{pet} is content. It likes studying with you.` |
| `{pet} misses you. Study a bit more to cheer them up!` | `{pet} is waiting quietly. It's here whenever you are.` |
| `{pet} is sad... Complete a session to start improving their mood.` | `{pet} is resting. It'll perk up next time we study.` |
| `{pet} has retreated. Complete a restorative quest!` | `{pet} wandered off to the forest for a bit. A gentle session will bring it home.` |
| tour: `Your pet's mood reflects your study habits. Study regularly and they'll stay happy!` | `This is your companion. It notices when you study, and it's patient when life gets busy.` |
| tour: `Earn XP by studying. Level up to unlock new pets, themes, and room decorations. You got this!` | `You'll grow as you go. New companions, themes, and room pieces arrive along the way — no rush.` |
| top-bar title: `Earn XP by studying. Level up to unlock new pets, themes, and decorations!` | `You grow as you study. New things unlock gently over time.` |

**Reasoning:** WHY_NORA: the pet "gets sad but recovers… framed as nature, not failure." Current copy uses guilt ("misses you," "cheer them up") and imperatives ("Study a bit more," "Complete a session"). Remove guilt, remove commands, remove exclamation. A companion invites; it doesn't issue tasks.

---

## 8. FSRS grade buttons — `study/_components/study-session.tsx`

| Current | Rewrite (option A, gentle) | Keep? |
|---|---|---|
| `Again` / `Forgot` | `Again` / `Slipped` | acceptable to keep "Again" |
| `Hard` / `Struggled` | `Hard` / `Took effort` | |
| `Good` / `Recalled` | `Good` / `Remembered` | "Remembered" matches VOICE.md |
| `Easy` / `Perfect` | `Easy` / `Knew it` | "Perfect" is performative |

**Reasoning:** Minor, but "Perfect" and "Forgot" reintroduce the pass/fail framing VOICE.md works to dissolve. "Remembered/Knew it/Took effort/Slipped" keeps it factual and kind. (Keep the FSRS-standard Again/Hard/Good/Easy primary labels for learners who know the system; soften only the sublabels.)

---

## 9. Smaller surfaces

| File | Current | Rewrite |
|---|---|---|
| `study/page.tsx` | `No study items available! Add topics, create flashcards, or upload papers to build your interleaved study queue.` | `Nothing to mix yet. Add a topic, explain an idea, or bring in a paper — then they'll blend here.` |
| `study/page.tsx` | `Your mix could use more variety` | `A little more variety would help this mix` |
| `party-discovery.tsx` | `No groups available yet. Create one and invite friends!` | `No groups yet. Start one and bring a friend along.` |
| `party-messages.tsx` | `No messages yet. Start a conversation!` | `Quiet in here. Say hello whenever you like.` |
| `study-session-receipt.tsx` | `Study Session Complete` | `Time spent growing` |
| `study-session-receipt.tsx` | `What you did` | `Where the time went` |
| `study-session-receipt.tsx` | `Done` | `Close` |
| `command-palette.tsx` | `No matching pages` | `Nothing here by that name` |
| `login/page.tsx` | `Welcome back` | `Welcome back.` *(keep — it's on-voice)* |

---

## 10. Things to leave alone (already in-voice)

Do **not** "improve" these — they're correct, and over-editing would flatten them:

- Today: `Welcome home.`, `All done for today. You earned this.`, `Fresh start — all quests ready`
- Review: `All memories are safe for now. When something starts to fade, it'll appear here.`
- Feynman: `Explain what you know in your own words. Nora will listen, ask questions, and show you where understanding deepens.`
- Memory Garden: `Each plant represents a topic. Their health shows how well you remember…`
- Companion lines in `companion-dialogue.ts` (all of them)
- Journal empty: `Your story is just beginning.`

---

## Implementation note

Most of section 3 (loading) and 4 (errors) should not be fixed string-by-string forever. Create a small copy module — e.g. `src/lib/copy.ts` — exporting `LOADING`, `ERRORS`, `EMPTY` constants in Nora's voice, and import from there. That way VOICE.md has a single enforceable home in code, and the next contributor can't accidentally reintroduce "Loading…". See COMPONENT_CONSISTENCY for the structural version of this argument.
