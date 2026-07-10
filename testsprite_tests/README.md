# TestSprite Test Artifacts — Nora

This folder holds the durable test artifacts for Nora's TestSprite Hackathon S3
entry. Every test was **created and run through the TestSprite CLI** against the
live app at **https://norastudy.vercel.app** and banked on the TestSprite
platform under the submitting account.

- **Project:** Nora — `4ba5d8f8-310d-41bc-bbf4-b85208bb6d44`
- **Banked suite:** **60 scenarios — all passing** (53 frontend + 7 backend security/schema)
- **Every test is `createdFrom: cli`** — not the portal, genuine CLI loop
- **Per-iteration loop log:** [`../LOOP.md`](../LOOP.md)
- **Archived failure bundle:** [`failure/analytics-442d4d6e/`](failure/) — a real
  `routing_404` failure the loop caught and fixed
- **Plan files:** [`plans/`](plans/) — the plan-steps documents fed to
  `testsprite test create --plan-from …`
- **Machine-readable manifest:** [`manifest-all.json`](manifest-all.json) — all tests with IDs, types, and `createdFrom` verification

The loop: `create → run → failure get → fix → rerun → bank`. Repeat.

---

## Frontend suite (50 scenarios, all passing)

### Core flow (tests 1–20, banked Jun 30 – Jul 3)

| # | Test ID | Scenario | Steps |
|---|---|---|---|
| 1 | `f2c43b46` | Landing page loads and displays sign-up CTA | 5 |
| 2 | `1cbed7af` | Login with valid credentials redirects to dashboard | 5 |
| 3 | `dcf9de96` | New user signup leads to onboarding wizard | 5 |
| 4 | `f10b71eb` | Dashboard displays stats and daily quests after login | 4 |
| 5 | `63bbf13d` | Sidebar navigation links open pages without errors | 6 |
| 6 | `452f36a7` | Review card full flow — confidence, reveal, grade | 4 |
| 7 | `97d3a05f` | Review session shows confidence rating before answer reveal | 4 |
| 8 | `99ad33b4` | Feynman Mode evaluates explanation and shows gap analysis | 6 |
| 9 | `c51d9326` | Study Mix displays interleaved queue with flashcards | 3 |
| 10 | `a4a9fcb5` | Research Desk returns sources and synthesis from a query | 5 |
| 11 | `3b66402d` | Study Room video search returns educational results | 5 |
| 12 | `d2593c2b` | Study Planner shows weekly calendar with navigation | 5 |
| 13 | `de9fe793` | Pixel Room displays pet sprite and daily missions | 3 |
| 14 | `d9ad2897` | Party page allows creating or joining a study group | 3 |
| 15 | `929c51ef` | Analytics page renders its dashboard for a logged-in user | 5 |
| 16 | `e08cda2b` | History page shows past study activity | 5 |
| 17 | `5fe264c6` | Settings theme change persists across navigation | 7 |
| 18 | `43aa81fa` | User can create a subject and topic in Settings | 6 |
| 19 | `ea7915bb` | Prediction Mode shows questions, accepts guesses, shows calibration | 5 |
| 20 | `ccf5a39e` | Dashboard companion router renders context-aware CTA and navigates | 5 |

### Coverage expansion (tests 21–28, banked Jul 3)

| # | Test ID | Scenario | Steps |
|---|---|---|---|
| 21 | `78969459` | Practice Exam page shows the exam setup | 4 |
| 22 | `6191b308` | Knowledge Web page renders its concept explorer | 3 |
| 23 | `ceb34635` | Eureka page renders the connections explorer | 3 |
| 24 | `cb9114e7` | Listen Mode page renders topic selection or empty state | 4 |
| 25 | `80e58c2d` | Card Market shows shared decks or a join-a-party prompt | 4 |
| 26 | `13eb535a` | Journal "Your Story" renders the learning timeline or empty state | 4 |
| 27 | `8045ec52` | Error Spotter page renders the challenge setup | 4 |
| 28 | `da45749b` | Memory Garden shows topic health plants or an empty garden | 4 |

Tests 22 and 23 first came back `blocked` — the pages rendered correctly but a
verbose assertion exhausted the agent's runway. Tightened to single decisive
assertions via `test plan put`, reran green. (LOOP.md Iter 29–30.)

### Adversarial + deep-backend (tests 29–34, banked Jul 4)

| # | Test ID | Scenario | Steps |
|---|---|---|---|
| 29 | — | Feynman validation with adversarial input | 5 |
| 30 | — | Feynman creates flashcards (deep backend round-trip) | 9 |
| 31 | — | Gamification XP round-trip | 7 |
| 32 | — | Research Desk empty query (adversarial) | 5 |
| 33 | — | Dashboard duplicate "memories" card regression | 3 |
| 34 | — | Pet mood mismatch (sidebar vs room) | 4 |

### UI overhaul verification + empty states (tests 35–50, banked Jul 8–9)

| # | Test ID | Scenario | Steps |
|---|---|---|---|
| 35 | — | Feynman sparkline styled correctly | 4 |
| 36 | — | Sidebar nav cleanup (feature overlap removed) | — |
| 37 | — | Dashboard + sidebar hardening (onboarding tour gated) | 42 |
| 38 | `f4663fb7` | Companion sprites self-hosted (Collection pet selection) | — |
| 39 | `3261aea6` | Confidence Calibration chart renders with seeded data | — |
| 40–46 | — | Planner/Listen/Exam empty states + auth gate + regression reruns | varies |
| 47–50 | — | Post-UI-overhaul verification (sidebar icons, pet widget, pixel-panel planner, video sprites) | varies |

### Full regression rerun (Iter 51)

After the 8-task pixel-art UI overhaul, the entire 59-test suite was replayed
via `testsprite test rerun --all`. One genuine regression surfaced: the pet mood
showed "sad" in the room but "Neutral" in the sidebar (different root cause from
a similar bug fixed earlier). Fixed in `layout.tsx` — compute mood from activity
instead of a stale DB read.

---

## Backend suite (7 scenarios, all passing)

These tests use `testsprite test create --type backend --code-file` and run
Python scripts that hit the Supabase REST/RLS layer directly. They prove
security boundaries that a browser test can never see.

| # | Test ID | Scenario | What it proves |
|---|---|---|---|
| B1 | `43943ea6` | Schema + FSRS/gamification column validation | DB shape is correct |
| B2 | `36c43c1e` | RLS data isolation (cards, topics, feynman reject anon) | Unauthorized reads blocked |
| B3 | `23d76c46` | RLS reward-manipulation rejection | Anon can't call reward RPC |
| B4 | — | Reward RPC boundary enforcement (IDOR) | Authenticated user can't inflate a foreign balance |
| B5 | — | Party quest IDOR + membership RLS | Can't access other parties |
| B6 | — | Feynman & LLM action auth boundary | LLM actions require auth |
| B7 | — | Academic data + study content RLS | Content isolation per user |

B1–B3 are the **drift-immune** tests wired into GitLab CI — they rerun on every
`master` push.

---

## Advisory duplicates (4 tests)

Four tests were flagged as advisory duplicates during batch creation (overlapping
coverage with existing tests). They exist on the platform but are counted
separately from the core 57.

---

## Retired / experimental plans

Kept for transparency — not in the final banked suite:

- `mobile-bottom-nav.plan.json` — **deleted** after two runs proved the
  TestSprite cloud runner can't simulate mobile viewports. The component works
  for real users; documented as a runner limitation, not faked green.
  (LOOP.md Iter 18.)
- `calibration-analytics.plan.json` — exploratory draft folded into other
  banked scenarios.

---

## Reproduce

```bash
export TESTSPRITE_API_KEY=sk-...
testsprite test list   --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --output json
testsprite test rerun  --all --project 4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --wait --output json
```
