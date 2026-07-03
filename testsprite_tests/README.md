# TestSprite Test Artifacts — Nora

This folder holds the durable test artifacts for Nora's TestSprite Hackathon S3
entry. The tests are **created and run through the TestSprite CLI** against the
live app at **https://norastudy.vercel.app** and banked on the TestSprite
platform under the submitting account.

- **Project:** Nora — `4ba5d8f8-310d-41bc-bbf4-b85208bb6d44`
- **Banked suite:** 28 frontend scenarios, **28/28 passing**, every one `createdFrom: cli`
- **Per-iteration loop log:** [`../LOOP.md`](../LOOP.md)
- **Archived failure bundle:** [`failure/analytics-442d4d6e/`](failure/) — a real
  `routing_404` failure the loop caught and fixed
- **Plan files:** [`plans/`](plans/) — the plan-steps documents fed to
  `testsprite test create --plan-from …`

Every scenario followed the loop: `create → run → failure get → fix → rerun → bank`.

## Banked suite (28 scenarios, all passing)

| # | Test ID | Scenario | Pri | Steps | Plan file |
|---|---|---|---|---|---|
| 1 | `f2c43b46` | Landing page loads and displays sign-up CTA | p1 | 5 | `plans/landing-page.plan.json` |
| 2 | `1cbed7af` | Login with valid credentials redirects to dashboard | p0 | 5 | `plans/login-flow.plan.json` |
| 3 | `dcf9de96` | New user signup leads to onboarding wizard | p0 | 5 | `plans/signup-flow.plan.json` |
| 4 | `f10b71eb` | Dashboard displays stats and daily quests after login | p1 | 4 | `plans/dashboard-loads.plan.json` |
| 5 | `63bbf13d` | Sidebar navigation links open pages without errors | p1 | 6 | `plans/sidebar-navigation.plan.json` |
| 6 | `452f36a7` | Review card full flow — confidence, reveal, grade | p0 | 4 | `plans/review-grade-card.plan.json` |
| 7 | `97d3a05f` | Review session shows confidence rating before answer reveal | p1 | 4 | `plans/review-jol-confidence.plan.json` |
| 8 | `99ad33b4` | Feynman Mode evaluates explanation and shows gap analysis | p1 | 6 | `plans/feynman-evaluation.plan.json` |
| 9 | `c51d9326` | Study Mix displays interleaved queue with flashcards | p1 | 3 | `plans/study-mix-session.plan.json` |
| 10 | `a4a9fcb5` | Research Desk returns sources and synthesis from a query | p1 | 5 | `plans/research-desk-query.plan.json` |
| 11 | `3b66402d` | Study Room video search returns educational results | p1 | 5 | `plans/study-room-search.plan.json` |
| 12 | `d2593c2b` | Study Planner shows weekly calendar with navigation | p1 | 5 | `plans/planner-weekly-view.plan.json` |
| 13 | `de9fe793` | Pixel Room displays pet sprite and daily missions | p2 | 3 | `plans/pixel-room-pet.plan.json` |
| 14 | `d9ad2897` | Party page allows creating or joining a study group | p2 | 3 | `plans/party-create.plan.json` |
| 15 | `929c51ef` | Analytics page renders its dashboard for a logged-in user | p2 | 5 | `plans/analytics-page.plan.json` |
| 16 | `e08cda2b` | History page shows past study activity | p2 | 5 | `plans/history-page.plan.json` |
| 17 | `5fe264c6` | Settings theme change persists across navigation | p2 | 7 | `plans/settings-theme-change.plan.json` |
| 18 | `43aa81fa` | User can create a subject and topic in Settings | p1 | 6 | `plans/create-subject-topic.plan.json` |
| 19 | `ea7915bb` | Prediction Mode shows questions, accepts guesses, shows calibration | p1 | 5 | `plans/prediction-mode.plan.json` |
| 20 | `ccf5a39e` | Dashboard companion router renders context-aware CTA and navigates | p1 | 5 | `plans/companion-router.plan.json` |
| 21 | `78969459` | Practice Exam page shows the exam setup for a logged-in user | p2 | 4 | `plans/exam-setup.plan.json` |
| 22 | `6191b308` | Knowledge Web page renders its concept explorer | p2 | 3 | `plans/knowledge-web.plan.json` |
| 23 | `ceb34635` | Eureka page renders the connections explorer | p2 | 3 | `plans/eureka-connections.plan.json` |
| 24 | `cb9114e7` | Listen Mode page renders topic selection or empty state | p2 | 4 | `plans/listen-mode.plan.json` |
| 25 | `80e58c2d` | Card Market shows shared decks or a join-a-party prompt | p2 | 4 | `plans/card-market.plan.json` |
| 26 | `13eb535a` | Journal "Your Story" renders the learning timeline or empty state | p2 | 4 | `plans/journal-story.plan.json` |
| 27 | `8045ec52` | Error Spotter page renders the challenge setup | p2 | 4 | `plans/error-spotter.plan.json` |
| 28 | `da45749b` | Memory Garden shows topic health plants or an empty garden | p2 | 4 | `plans/memory-garden.plan.json` |

Tests 21–28 were added in the July 3 loop to expand coverage across eight
previously-untested features. Six passed on the first run; **Knowledge Web (#22)
and Eureka (#23)** first came back `blocked` — the pages rendered correctly but
a verbose two-branch assertion made the testing agent run out of runway before
emitting a verdict. Tightening each to a single decisive assertion (referencing
the concrete empty-state control) and rerunning turned both green. See
[`../LOOP.md`](../LOOP.md) for the per-iteration detail.

## Retired / experimental plans

Kept for transparency — these plans exist in `plans/` but are **not** in the
final banked suite:

- `mobile-bottom-nav.plan.json` — **deleted from the suite** after two runs
  proved the TestSprite cloud runner uses a fixed desktop viewport and cannot
  simulate a mobile-width resize. The `BottomNav` is correctly wired
  (`md:hidden`, fixed-bottom) and works for real mobile users; this is a runner
  limitation, out of scope per the "state outside the test's control" rule.
  (See `../LOOP.md`, 2026-07-02.)
- `calibration-analytics.plan.json` — exploratory plan drafted during the loop
  that was folded into other banked scenarios.

## Reproduce

```bash
export TESTSPRITE_API_KEY=sk-...            # the account that owns the project
testsprite test list   --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --output json
testsprite test rerun  --all --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --wait --output json
```
