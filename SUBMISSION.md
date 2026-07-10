# Nora × TestSprite Hackathon S3 — "Build the Loop"

> Fill-in-ready draft. Every number here is verified against the TestSprite
> platform and `LOOP.md`. Map these sections onto the official template in
> `#hackathon-submissions`.

## One-liner

**Nora** is a pixel-art study operating system built on cognitive science — and
we used the TestSprite CLI as the checker in a real write → verify → fix → verify
loop that caught genuine regressions in a production-grade Next.js app.

## Links

- **Demo video (3 min):** https://www.youtube.com/watch?v=u9lo9GYdCf8
- **Live app:** https://norastudy.vercel.app
- **Repo:** https://github.com/lxcario/Nora
- **Blog post (Medium):** https://medium.com/@resquedzn05/i-built-a-study-app-that-teaches-without-guilt-then-i-had-to-prove-it-actually-worked-89ee85e8c392
- **Loop log (per-iteration, agent-written):** [`LOOP.md`](LOOP.md)
- **Test artifacts + index:** [`testsprite_tests/`](testsprite_tests/)
- **Machine-readable manifest (all 57 tests, `createdFrom: cli`):** [`testsprite_tests/manifest-all.json`](testsprite_tests/manifest-all.json)
- **Archived failure bundle:** [`testsprite_tests/failure/analytics-442d4d6e/`](testsprite_tests/failure/)

## Team

- **Résque** — Discord `resquwue` · GitHub [`lxcario`](https://github.com/lxcario) · X [`@resquedzn05`](https://x.com/resquedzn05)
- Prior: 2nd place, TestSprite Hackathon S2 (CinePurr)

## TestSprite account & project (account match)

- **Account:** `resquedzn05@gmail.com` (Résque) — the account that generated **all** banked tests
- **Project:** Nora — `4ba5d8f8-310d-41bc-bbf4-b85208bb6d44`
- **Target URL:** https://norastudy.vercel.app
- Every banked test is `createdFrom: cli` — created and run through the CLI, not the portal.

## The loop, by the numbers

| Metric | Value |
|---|---|
| Tests banked | **57 — all passing (50 frontend + 7 backend)** |
| Loop iterations | **55** across 7 active build days (Jun 30, Jul 2–4, Jul 6, Jul 8–9) |
| Total test runs | **100+** |
| Real product bugs caught & fixed | **10** |
| Distinct root causes diagnosed | **14** |
| New features shipped *under* the loop | **2** (Prediction Mode, Companion Router) |
| Major UI overhaul verified under the loop | **1** (8-task pixel-art UX pass — pet liveliness, icon migration, mobile nav, pixel-panel, contrast, scoped CSS, sidebar de-dup, rewards module) |
| Coverage expansion | **20 → 57** live — including 7 backend RLS/security tests |
| Platform limitation found & documented | 1 (desktop-only runner can't simulate mobile resize) |
| Full regression rerun (post-UI-overhaul) | **57 tests** → caught 1 genuine mood regression → fixed → green |
| CI/CD | **GitLab CI** reruns the unit suite (394 tests) + the TestSprite checker (57 tests) on every `master` push (`gitlab.com/lxcario-group/Nora/-/pipelines`). Backend tests (7) run strict with no auto-heal — selector-free REST/RLS testing. Frontend tests (50) use TestSprite auto-heal to absorb UI changes from active development; auto-heal is documented to patch selectors without weakening assertions, though per-test heal diffs weren't available to independently confirm this for passed runs. A GitHub Actions workflow holds the same command but is gated by a GitHub account Actions billing lock. |

## What "genuinely used as the checker" looks like here

This was not a one-shot run. The suite grew and self-corrected over days. Highlights:

### Real bug #1 — Signup redirect (product fix)
A brand-new account landed on a blank `/app`. The loop caught it; fix redirects
straight to `/app/onboarding`. (`LOOP.md` 2026-06-30)

### Real bug #2 — Analytics routing (a 4-iteration arc)
The banked test navigated to a dead `/app/room/analytics` (404). The failure
bundle (archived under `testsprite_tests/failure/`) pinned the route mismatch.
Resolving it took four honest iterations — 404 → nav thrash on a nested
accordion → data-dependent heatmap assertion → an assertion driven by a *stale
test name* ("…stats and charts") that made the agent expect a chart a new
account never renders. Renamed the test via `test update`, finalized
deterministic assertions, **passed** (run `03d2cb32`). (`LOOP.md` 2026-07-02)

### Real bug #3 — Dashboard streak assertion (product/spec drift)
A test asserted a "streak" indicator that had been intentionally removed (Nora
uses growth-first XP + coins language). Updated to match the real dashboard.

### Real bug #4 — History route 404
`/history` (bare) instead of `/app/history` — same class of route bug as
analytics; plan corrected and re-banked.

### Regression hunting during active development
New features (**Prediction Mode**, **Companion Router**) touched shared
components (`game-sidebar.tsx`, dashboard CTA). After each, a full-suite rerun
confirmed nothing regressed — the exact "build the loop" workflow the hackathon
is about.

### Honesty about the tool's edge
The mobile-bottom-nav test was **removed** after two runs proved the cloud
runner uses a fixed desktop viewport and ignores resize steps. The `BottomNav`
is correctly wired and works for real users — documented as a runner limitation,
not faked green.

### Coverage expansion — 8 new scenarios (Jul 3), one more real loop
To deepen the suite I added tests for eight previously-untested features:
Practice Exam, Listen Mode, Card Market, Journal ("Your Story"), Error Spotter,
Memory Garden, Knowledge Web, and Eureka. Six passed first run. **Knowledge Web
and Eureka** came back `blocked` — the pages rendered perfectly, but a verbose
two-branch assertion made the testing agent run out of runway before emitting a
verdict. Reading the run summary revealed the exact empty-state controls, so I
tightened each plan to a single decisive assertion (`Generate Knowledge Web` /
`Discover connections` buttons), pushed the new steps with `test plan put`, and
reran — both green. A clean create → blocked → diagnose → fix → rerun → pass cycle.

### S3 loop hardening + the Calibration data-seed arc (Jul 8)
A late hardening pass added five quality arcs — a timezone-correct daily loop, a
companion-router mastery rule, grounded-eval prompt-injection fencing, and
reward-RPC integrity (a per-user rate limit + a SQL guard test proving an
authenticated caller can't inflate a *foreign* user's balance). That logic is
proven by the expanded unit suite (**332 → 394 tests**) plus the new SQL test.
The **Confidence Calibration** dashboard was then banked under a real loop:
`test create` came back **blocked** four times — the agent confirmed the section
rendered ("RESULT: PASS") but wouldn't certify a verdict because the test
account's data produced the *"Not enough data yet"* empty state (20 JOL reviews
concentrated in fewer than 3 confidence levels). Tightening the assertion didn't
move it — the block tracked the **data, not the plan**. Fix: seeded real
`card_reviews` with confidence ratings via a Supabase **user token**
(password-grant, no service-role) so the confidence-vs-recall curve renders,
updated the plan to assert the populated chart, and reran → **PASS** (test
`3261aea6`, run `7b7ae0ee`). Lesson banked: a `blocked` verdict on an empty state
is a data signal, not a plan bug.

## Suite breadth (57 scenarios across 22+ features)

Entry & auth (landing, login, signup→onboarding) · core loop (dashboard,
sidebar, review full flow, JOL confidence) · learning features (Feynman
evaluation, Study Mix, Research Desk, Study Room video, Planner, Practice Exam,
Listen Mode, Error Spotter) · knowledge tools (Knowledge Web, Eureka, Memory
Garden, Journal) · world & social (Pixel Room, Party, Card Market, Analytics,
History, Settings theme, create subject/topic) · in-loop features (Prediction
Mode, Companion Router) · backend security (RLS data isolation, schema
validation, auth flow, cards/topics RLS).

Full ID-level table: [`testsprite_tests/README.md`](testsprite_tests/README.md).

## Why Nora stands out

- **Production-grade, not a weekend prototype:** Next.js 16 + React 19 +
  Supabase, 22 DB migrations, 394 unit tests, a 29-component custom pixel-UI
  library, real pedagogy (FSRS-6 spaced repetition, Feynman evaluation, spaced
  practice, interleaving).
- **AI-powered flows tested end-to-end** (Feynman evaluation, Research Desk
  synthesis) — not just CRUD happy paths.
- **Backend security tested via CLI** — Python RLS tests prove row-level
  security rejects unauthorized access (anon can't read cards, can't increment
  XP, can't insert into other users' topics).
- **The loop as methodology:** real regressions caught during active feature
  work, a documented multi-iteration debugging arc, and CI wiring.

## How the loop shaped this project

The loop wasn't bolted on at the end. It changed how Nora was built — and along
the way we stumbled into patterns we think are genuinely new.

**The data-seed pattern.** Iteration 42 taught us that `blocked` doesn't always
mean the plan is wrong. The Confidence Calibration chart rendered a clean empty
state ("Not enough data yet"), and no amount of tightening the assertion could
move it — because the problem was *what the test account had experienced*, not
what the page showed. The fix was to seed real study data through a user-scoped
Supabase token (never service-role) so the chart actually populates. That's a
reusable pattern for any data-dependent feature: when a `blocked` verdict tracks
the data and not the plan, seed rather than rewrite.

**Test names are context.** The 4-iteration analytics arc (Iter 15) revealed
something subtle: the testing agent reads the test *name* as intent, not just
the plan steps. A leftover name ("Analytics page shows stats and charts") kept
pulling the agent toward chart assertions that a low-data account can never
satisfy — even after the plan no longer mentioned charts. Once we renamed via
`test update --name`, it passed immediately. Tiny detail, big lesson.

**Security you can't see from a browser.** Row-Level Security is invisible from
the UI — the page just works. But *does* the database reject a forged request?
We wrote `--type backend` Python tests that authenticate as an anonymous client
and confirm the rejection. Anon can't read another user's cards. Anon can't call
the reward RPC. It's not enough to test that a page renders; we wanted proof the
boundary holds.

**Extending the checker itself.** PR #132 added `test flaky` to the TestSprite
CLI — a new command that repeats a run N times and flags non-deterministic
verdicts. We built it because our own suite needed it, then dogfooded it against
Nora before it merged. The loop didn't just *use* the tool; it made the tool
better.

**CI that runs the full loop.** The GitLab pipeline reruns the entire 57-test
banked suite on every `master` push — not just a subset. Backend tests hit the
REST/RLS layer and are drift-immune. Frontend tests replay saved scripts for
free; auto-heal engages only when the UI has genuinely drifted. The build
knows if anything breaks, anywhere.

## Bonus: CLI Improvement Bounty contributions

Separate from judging — genuine improvements to the open-source CLI, opened
from `lxcario`:

- **Merged (all 10):** **#132 (the new `test flaky` command, issue #115)**,
  #37 (SSRF trailing-dot guard), #131 (CR/LF INI-injection fix),
  #38 (typed auth error envelope), #36 (empty/whitespace `--name` validation),
  #133 (Node 20/22 CI matrix), #10 (kiro agent target, issue #170),
  #11 (Node version guard), #12 (`NO_COLOR` support),
  #39 (whitespace `--name` parity in `test update`)
- Verify: https://github.com/TestSprite/testsprite-cli/pulls?q=is%3Apr+author%3Alxcario+is%3Amerged
- We didn't just use the checker — we **extended** it (`test flaky`) and dogfooded the new command against our own suite.

## Eligibility checklist

- [x] Following TestSprite on X (`@resquedzn05`)
- [x] Discord member (`resquwue`)
- [x] App live at a public URL throughout the build phase
- [x] Tests generated by the submitting account
- [x] Genuine multi-iteration loop, not one-shot
- [x] Demo video (optional) — https://www.youtube.com/watch?v=u9lo9GYdCf8
- [ ] Posted in `#hackathon-submissions` using the official template
