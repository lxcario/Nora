# I Built a Study App That Teaches Without Guilt — Then I Had to Prove It Actually Worked

### How 41 rounds of write → verify → fix with the TestSprite CLI caught bugs I never would have found, including one hiding behind a green checkmark

---

I built a study app that's supposed to help people learn without guilt. No streaks that punish you for taking a day off. No leaderboards that shame you. An AI that asks questions but never writes your answers for you.

Then I realized I'd been shipping it the same way I tell students not to study — by assuming it worked instead of proving it.

For [TestSprite's Season 3 hackathon](https://www.testsprite.com/hackathon-s3) — themed **"Build the Loop"** — I decided to stop guessing. Every feature my coding agent shipped had to survive a real test against the live app before I'd trust it. The [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) became the checker: it opens the app in a real cloud browser, uses it like a stranger would, and hands back a verdict. Pass → banked. Fail → I get one self-consistent bundle (the failing step, screenshots, DOM snapshot, a root-cause guess) and I fix it and rerun.

The app is **Nora** — a pixel-art study operating system grounded in cognitive science. Spaced repetition with FSRS-6, Feynman-style explanation grading, a research desk that cites real academic papers, a companion pet that notices when you're struggling. Next.js 16, React 19, Supabase, live at [norastudy.vercel.app](https://norastudy.vercel.app).

But this post isn't really about Nora. It's about what the loop taught me — including the day a passing test lied to my face.

---

## Why Nora exists, in one paragraph

Most study apps try to make you study *longer*. Nora tries to help you understand *better*. Every feature is backed by published cognitive science — spaced repetition (Ye et al., 2022), self-explanation (Chi, 2000), productive failure (Springer, 2023). The AI retrieves real sources, labels uncertainty honestly, and never does the thinking for you. I built it because I got tired of tools that optimize for engagement metrics instead of actual learning. Nora optimizes for the moment you close your laptop knowing a little more than yesterday.

That vision means nothing if the app is broken. So I tested it like I meant it.

---

## The loop, concretely

Four commands. That's the whole thing:

```bash
# 1 — describe a behavior, run it against the live app, wait for a verdict
testsprite test create --plan-from ./landing.plan.json --type frontend \
  --run --wait --target-url https://norastudy.vercel.app

#   → exits 1: it failed. Pull ONE self-consistent bundle:
testsprite test failure get <test-id> --out ./.testsprite/failure

# 2 — read the bundle, fix the code, redeploy, then replay:
testsprite test rerun <test-id> --wait
#   → exits 0: passed. The test now lives in a durable suite.
```

Over five build days this ran **41 iterations**, banked **43 tests** (40 browser flows + 3 backend security checks), and caught **9 genuine product bugs**. Here are the ones worth telling.

---

## War story #1: the blank screen every new user would have seen

I test the way most people do: I log in with *my* account, which has data. So I never saw what a brand-new user saw.

TestSprite did. Its signup test created a fresh account every run — and landed on a blank `/app` shell, because the redirect assumed you already had subjects to show. The very first thing every new user would have seen was an empty page.

The fix was one redirect (`new account → /app/onboarding`). But I only knew to write it because the checker didn't share my assumptions. That's the whole value of the loop in one bug: **the agent doesn't have your habits, so it finds the bugs your habits hide.**

---

## War story #2: the four-iteration arc that taught me the test name is code

One analytics test refused to go green across four runs:

1. **404** — the plan navigated to a route that didn't exist.
2. **Blocked** — after I fixed the route, the agent thrashed trying to reach the page through a fragile nested sidebar accordion.
3. **Blocked** — I pointed it straight at the URL, but it asserted a chart that a low-activity test account never renders.
4. **Still blocked** — and this is the one that stuck with me.

The plan was correct by round four. The *test's name* still read *"Analytics page shows stats and charts."* The agent read its own test name as context and kept hunting for a chart that wasn't supposed to be there. Renaming the test — `testsprite test update <id> --name "Analytics page renders its dashboard"` — was the actual fix.

I did not expect to learn this from a testing tool: **the name of a test is part of the prompt.** A stale name silently overrides an updated plan. Every test I wrote after that got a name scoped to exactly one observable thing.

---

## War story #3: `blocked` is not `failed` — and telling them apart is a skill

Two features (a concept-map explorer and a cross-topic "Eureka" view) came back **`blocked`** while rendering *perfectly*. The failure bundle even contained the testing agent's own note: *"TEST BLOCKED: PASS — the page renders as required."*

So why blocked? My assertion was a verbose two-branch *"either an interactive graph OR a clear empty state, and definitely not a broken container"*. The agent burned its whole step budget re-checking both branches before it could emit a verdict.

The fix wasn't in the app — it was in how I *wrote assertions*. Every frontend assertion after that became single, decisive, and tied to one concrete element: *"verify the 'Generate' button is visible."* That's a durable change to how the whole suite is authored, and I only discovered it by reading blocked-run summaries instead of rage-clicking rerun.

---

## War story #4: testing the layer the browser can't reach

Here's a limit people hit and then quietly ignore: a browser test **can't verify Row-Level Security.** A page looks identical whether your database authorization is airtight or wide open. The only way to *prove* the DB rejects an unauthorized read is to hit it as an unauthorized caller.

TestSprite's CLI has a backend test type that runs a Python file server-side instead of in the browser. So I banked three:

```bash
testsprite test create --type backend \
  --name "RLS rejects unauthorized reward manipulation" \
  --code-file ./test_rls_security.py --run --wait
```

They confirm an anonymous client **cannot** call the reward RPC, read other users' profiles, or insert forged flashcards. That's the difference between testing that a feature *renders* and testing that it's *safe* — and it's the kind of coverage a browser-only suite structurally can't have.

I was also honest about the *other* direction: a mobile-nav test kept failing because the cloud runner uses a fixed desktop viewport and ignores resize steps. The component was correct; the runner just couldn't see it. So I **deleted the test and documented why**, rather than faking it green. A suite you don't trust is worse than a smaller one you do.

---

## War story #5: the green test that was lying

This is the one that made me write this post.

Nora's companion pet is an animated sprite. I had a test — banked, green — that asserts *"the pet sprite renders, not a broken-image placeholder."* It passed every time I looked.

Then, on a fresh browser, I saw it: a broken image icon where the companion should be. On the sidebar. On the collection page. Everywhere.

How does a test that literally checks "not broken" pass while the thing is broken? Because the sprites were **hotlinked from a third-party host that rate-limits.** Sometimes it served the image; sometimes it 404'd. My test happened to run during the "sometimes it works" windows. The green checkmark was real — and meaningless, because it was measuring a third party's uptime, not my app.

The fix was to pull the sprites in-house (serve them from my own origin) so the assertion measures *me*. And the lesson is the sharpest one the whole loop gave me:

> **A passing test isn't proof if it leans on infrastructure you don't control.**

I want to be precise about credit here, because it matters: **TestSprite did not catch this one — I did, by hand, on a fresh session.** The existing test's non-deterministic pass had *masked* it. I banked a new regression test afterward so it can't come back, but I logged it honestly as a manual find, not a loop catch. If your write-up isn't honest about what the tool did and didn't do, none of the rest of it is trustworthy either.

---

## I didn't just use the checker — I shipped fixes to it

Dogfooding something for 41 rounds surfaces its rough edges. When a run timed out mid-poll, the CLI printed nothing to stdout, forcing me to scrape a run ID from stderr to resume. So I fixed it — and nine other things — upstream. **Ten pull requests, all merged** into the open-source CLI:

- A brand-new command, `testsprite test flaky`, that replays a saved test N times to measure stability
- An SSRF guard for trailing-dot hostnames
- A credentials-injection fix (CR/LF stripping)
- Node-version guards and `NO_COLOR` support
- Auth error envelope preservation
- CI test/build against Node 20 and 22

Then I turned that new `flaky` command back on my own suite. Fitting, given war story #5: the antidote to a flaky green is a tool that *measures* flakiness.

```bash
testsprite test flaky <test-id> --runs 3 --output json
# → { "verdict": "stable", "passed": 3, "failed": 0 }
```

---

## What I'd tell you before you try this

After 41 rounds, six things I didn't know on day one:

1. **Let the checker not share your assumptions.** The blank-signup bug existed because I only ever tested as a user with data. The agent didn't.
2. **`blocked` ≠ `failed`.** Read the run summary before you touch the code. Half my "failures" were assertion-authoring problems, not app bugs.
3. **The test name is context.** Rename tests when their scope changes. The agent reads it.
4. **Test the layer the browser can't see.** If your security is invisible from the UI, a UI test can't defend it. Use the backend runner.
5. **Distrust green tests that depend on third parties.** They measure someone else's uptime, not your code.
6. **Be honest in the log.** I removed a test I couldn't run, and I credited a bug to manual QA instead of the tool. That honesty is the only thing that makes the other 40 iterations believable.

---

## What Nora became because of the loop

The loop didn't just catch bugs. It changed how I think about building.

Before TestSprite, I wrote features and hoped they worked. After 41 iterations, I write features *knowing* they'll be checked — by something that doesn't share my blind spots, my assumptions, or my browser history. The companion pet, the spaced-repetition scheduler, the Feynman grading, the knowledge web — every one of them shipped green because the loop demanded it, not because I hoped it would.

Nora is a place where knowledge grows slowly, and that's okay. The loop taught me the same thing about code: **you don't ship it because you built it. You ship it because you proved it works.**

---

*Nora is open source and live: [github.com/lxcario/Nora](https://github.com/lxcario/Nora) · [norastudy.vercel.app](https://norastudy.vercel.app). The full per-iteration log is in [LOOP.md](https://github.com/lxcario/Nora/blob/master/LOOP.md). The TestSprite CLI is [here](https://github.com/TestSprite/testsprite-cli).*

*Built for TestSprite Hackathon Season 3 — "Build the Loop."*

---

**Tags:** `TestSprite` · `AI` · `Testing` · `Hackathon` · `LearnEngineering` · `NextJS` · `Supabase` · `OpenSource` · `SoftwareEngineering` · `QualityAssurance`

**Suggested subtitle (for Medium's algorithm):** *How 41 rounds of write → verify → fix caught 9 bugs — including one hiding behind a green checkmark*
