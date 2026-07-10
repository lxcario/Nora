# The Green Test That Was Lying to Me

### What 41 rounds of *write → verify → fix* taught me about shipping AI-written code — and the day a passing test hid a broken feature

---

AI writes code in minutes now. Verifying that the code actually *works* still takes just as long as it always did. That gap is where bugs live.

For [TestSprite's Season 3 hackathon](https://www.testsprite.com/hackathon-s3) — themed **"Build the Loop"** — I decided to stop treating tests as a thing you bolt on at the end and instead make a testing agent the *checker* in every step of the build. The rule I set for myself: the coding agent writes a feature, and before I trust it, the [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) opens the **live app** in a real cloud browser, uses it like a user, and hands back a verdict. Pass → banked. Fail → I get one self-consistent bundle (the failing step, screenshots, DOM, a root-cause guess) and I fix it and rerun.

The app I built under that loop is **Nora** — a pixel-art "study operating system" grounded in cognitive science (spaced repetition with FSRS-6, Feynman-style explanation grading, retrieval practice, a companion pet that grows as your understanding does). Next.js 16, React 19, Supabase, live at [norastudy.vercel.app](https://norastudy.vercel.app).

But this post isn't really about Nora. It's about what the loop caught — including one test that passed while the feature underneath it was quietly broken.

---

## The loop, concretely

The whole thing is four commands:

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

Over five build days this ran **41 iterations**, banked **43 tests** (40 browser flows + 3 backend checks), and caught **9 genuine product bugs**. Here are the ones worth telling.

---

## War story #1: the blank screen every new user would have seen

I test the way most people do: I log in with *my* account, which has data. So I never saw what a brand-new user saw.

TestSprite did. Its signup test created a fresh account every run — and landed on a blank `/app` shell, because the redirect assumed you already had subjects to show. The very first thing every new user would have seen was an empty page.

The fix was one redirect (`new account → /app/onboarding`). But I only knew to write it because the checker didn't share my assumptions. That's the whole value proposition in one bug.

---

## War story #2: the four-iteration arc that taught me the *test name* is code

One analytics test refused to go green across four runs:

1. **404** — the plan navigated to a route that didn't exist.
2. **Blocked** — after I fixed the route, the agent thrashed trying to reach the page through a fragile nested sidebar accordion.
3. **Blocked** — I pointed it straight at the URL, but it asserted a chart that a low-activity test account never renders.
4. **Still blocked** — and this is the one that stuck with me.

The plan was correct by round four. The *test's name* still read *"Analytics page shows stats and charts."* The agent read its own test name as context and kept hunting for a chart that wasn't supposed to be there. Renaming the test — `testsprite test update <id> --name "Analytics page renders its dashboard"` — was the actual fix.

Lesson I did not expect from a testing tool: **the name of a test is part of the prompt.** A stale name silently overrides an updated plan.

---

## War story #3: `blocked` is not `failed` — and telling them apart is a skill

Two features (a concept-map explorer and a cross-topic "Eureka" view) came back **`blocked`** while rendering *perfectly*. The failure bundle even contained the testing agent's own note: *"TEST BLOCKED: PASS — the page renders as required."*

So why blocked? My assertion was a verbose two-branch *"either an interactive graph OR a clear empty state, and definitely not a broken container"*. The agent burned its whole step budget re-checking both branches before it could emit a verdict.

The fix wasn't in the app — it was in how I *wrote assertions*. Every frontend assertion after that became single, decisive, and tied to one concrete element (*"verify the 'Generate' button is visible"*). That's a durable change to how the whole suite is authored, discovered only by reading blocked-run summaries instead of rage-clicking rerun.

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

Then, on a fresh browser, I saw it: a broken image icon where Eevee should be. On the sidebar. On the collection page. Everywhere.

How does a test that literally checks "not broken" pass while the thing is broken? Because the sprites were **hotlinked from a third-party host that rate-limits.** Sometimes it served the image; sometimes it 404'd. My test happened to run during the "sometimes it works" windows. The green checkmark was real — and meaningless, because it was measuring a third party's uptime, not my app.

The fix was to pull the sprites in-house (serve them from my own origin) so the assertion measures *me*. And the lesson is the sharpest one the whole loop gave me:

> **A passing test isn't proof if it leans on infrastructure you don't control.**

I want to be precise about credit here, because it matters: **TestSprite did not catch this one — I did, by hand, on a fresh session.** The existing test's non-deterministic pass had *masked* it. I banked a new regression test afterward so it can't come back, but I logged it honestly as a manual find, not a loop catch. If your write-up isn't honest about what the tool did and didn't do, none of the rest of it is trustworthy either.

---

## I didn't just use the checker — I shipped to it

Dogfooding something for 41 rounds surfaces its rough edges. When a run timed out mid-poll, the CLI printed nothing to stdout, forcing me to scrape a run ID from stderr to resume. So I fixed it — and nine other things — upstream. **Ten pull requests, all merged** into the open-source CLI: an SSRF guard, a credentials-injection fix, Node-version handling, `NO_COLOR` support, and a brand-new command, `testsprite test flaky`, that replays a saved test N times to measure stability.

Then I turned that new command back on my own suite. Fitting, given war story #5: the antidote to a flaky green is a tool that *measures* flakiness.

---

## What I'd tell you before you try this

- **Let the checker not share your assumptions.** The blank-signup bug existed because I only ever tested as a user with data. The agent didn't.
- **`blocked` ≠ `failed`.** Read the run summary before you touch the code. Half my "failures" were assertion-authoring problems, not app bugs.
- **The test name is context.** Rename tests when their scope changes.
- **Test the layer the browser can't see.** If your security is invisible from the UI, a UI test can't defend it.
- **Distrust green tests that depend on third parties.** They measure someone else's uptime.
- **Be honest in the log.** I removed a test I couldn't run, and I credited a bug to manual QA instead of the tool. That honesty is the only thing that makes the other 40 iterations believable.

The point of all this isn't "tests good." It's that a *checker in the loop* — one that uses your live app like a stranger, every time you change something — finds the class of bugs your own habits are built to hide.

---

*Nora is open source and live: [github.com/lxcario/Nora](https://github.com/lxcario/Nora) · [norastudy.vercel.app](https://norastudy.vercel.app). The full per-iteration log is in [`LOOP.md`](https://github.com/lxcario/Nora/blob/master/LOOP.md). The TestSprite CLI is [here](https://github.com/TestSprite/testsprite-cli).*

*Built for TestSprite Hackathon Season 3 — "Build the Loop."*
