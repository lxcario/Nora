# Nora — S3 Loop Hardening & Quality Push (Design)

## Overview

Six new Loop_Arcs plus baseline protection and submission polish, sequenced so
the highest-leverage, lowest-risk work lands first and the entry is stronger even
if execution stops early. Nothing here is a rewrite; core libraries (`fsrs`,
`spacing`, `study-mix`, `due`, `rrf`, `feynman-*`, `ssrf`) were audited and are
sound. The work is targeted fixes, one feature wire-up, test depth, and a
verifiable narrative.

## Guiding constraints

- **Do not break the app.** Branch-only work, local build+test gate, Preview_Deploy
  verification, production stays green. (Req 10)
- **Schema:** default schema-free. Exactly one Additive_Migration is permitted,
  and only for the optional Burnout Detector (Req 9). No destructive DDL ever.
- **Modified Next.js:** read `node_modules/next/dist/docs/` before routing /
  server-action edits. `proxy.ts` is the middleware equivalent.
- **Loop authenticity:** the CLI is the checker; every arc is a real
  create/rerun → verify → fix → verify → bank cycle recorded in `LOOP.md`.

## Credit budget (TestSprite)

Verified against the CLI changelog (`test rerun` / `test flaky` notes). Most of
this plan verifies with **zero paid runs**; guard the one deliberate spend.

- **Free (no credits):** `npm run build`, `npm test` (Vitest), lint; SQL tests in
  `supabase/tests/` (run via Supabase, not the runner); and
  `testsprite test rerun <ids> --no-auto-heal` — a verbatim replay of *unchanged*
  frontend tests. `--no-auto-heal` sends no auto-heal flag, so the replay is free.
- **The ~0.2-credit trap:** a plain FE `rerun` leaves auto-heal **on by default**,
  which bills ~0.2 credits per test (the CLI prints a `0.2 credit` advisory
  naming `--no-auto-heal`). Always pass `--no-auto-heal` for regression — over ~40
  FE tests that's the difference between free and ~8 credits.
- **Interim vs. full regression:** after each change, rerun only the *affected* FE
  test IDs — `testsprite test rerun <id…> --no-auto-heal` (free). You **cannot**
  combine explicit IDs with `--all` (the CLI exits 5; `--all` overwrites the IDs
  and reruns the whole project). The full `rerun --all --no-auto-heal --project
  <id>` (`--all` requires `--project`) is the **final-green shot only** — ~40 FE
  free, the 3 BE closure reruns may cost a little.
- **Costs credits (spend deliberately):** `test create` (new test); `test run`
  (fresh AI-driven run); a plain FE `rerun` **without** `--no-auto-heal` (~0.2
  credits/test); and `rerun`/`run` of a test whose plan or code you just changed
  (`test plan put` / `test code put`) — the script is regenerated, so it runs
  fresh.
- **The one protected spend:** `test create` the Calibration test (Task 8) — the
  feature banked under the loop, which is the narrative that wins.

| Task | Verify with | Credits |
|---|---|---|
| T4/T5 timezone | Vitest + free `rerun --no-auto-heal` of dashboard/streak tests | ~0 |
| T6 router | Vitest table tests + free rerun of the companion-router test | ~0 |
| T8 calibration | `test create` the ONE new test | small — protect this |
| T9 reward integrity | SQL test in `supabase/tests/` | 0 |
| T10 prompt fencing | Vitest | 0 |
| T11 deepen FE | changing assertions ⇒ paid fresh runs | defer/cut first if tight |
| Final green | `rerun --all --no-auto-heal` (40 FE free, 3 BE ~0) | ~0 |

If credits get tight, **cut Task 11 first**. TestSprite offers hackathon credit
boosts — request one rather than gutting the loop.

## The loop methodology (per arc)
edit on branch → npm run build && npm test (local gate) → deploy Preview → testsprite test create/plan put --target-url --run --wait → pass → promote to prod → testsprite test rerun <affected ids> --no-auto-heal (regression, free verbatim replay) → bank + LOOP.md row → fail/blocked → testsprite test failure get → diagnose → fix → rerun



TestSprite tests the **live deployed app**, not local code. Therefore code edits
parallelize, but each *verify* requires a deploy. Preview deploys protect the
production URL the runner depends on.

## Workstreams & parallelization

- **Stream 1 — pure logic + Vitest (no deploy to verify):** timezone helper +
  streak/dashboard fix (Req 2), router mastery (Req 3), prompt fencing (Req 6).
  Verified locally first; deployed together to minimize prod churn.
- **Stream 2 — feature UI:** Calibration Dashboard (Req 4).
- **Stream 3 — data/security:** reward integrity SQL test + rate limit (Req 5).
- **Serialization points:** any deploy; after each behavior change rerun the
  *affected* FE test IDs (`--no-auto-heal`, free) — the full `rerun --all
  --no-auto-heal --project <id>` is the final-green shot only; each `test create →
  fix → rerun` is serial per test.

## Detailed design

### 1. Timezone-correct daily loop (Req 2)
- **Add** `startOfUserLocalDay(now: Date, timezone: string): Date` to
  `src/lib/due.ts`, mirroring the proven `endOfUserLocalDay` implementation
  (Intl `formatToParts` + offset correction). Return the UTC instant of local
  00:00:00.000.
- **`src/lib/streak.ts`:** change `computeStreak` to accept a timezone (or accept
  pre-localized date keys) so day-keys use the user's local date instead of
  `toISOString()` (UTC). Keep the algorithm (count back from today) intact.
- **`src/app/(protected)/app/page.tsx`:** replace `today =
  now.toISOString().split("T")[0]` bounds for `reviewsToday` / `feynmanToday` /
  `sessionsToday` with `startOfUserLocalDay(now, timezone).toISOString()`. Build
  `activityDates` keyed by the user's local date. Pass `timezone` into
  `computeStreak`.
- **Greeting:** optionally compute time-of-day from user-local hour; low priority,
  acknowledged-minor if deferred.
- **Proof:** property-based Vitest (mirror `due.test.ts`): for any tz/instant,
  local-day boundaries are stable; streak is continuous across a local day change;
  quests reset at local midnight. TestSprite verifies the dashboard still renders
  (regression), since the cloud runner can't simulate arbitrary user timezones —
  this is stated explicitly in `LOOP.md`.

### 2. Companion Router mastery (Req 3)
- **`src/lib/study-router.ts`:** insert a rule after the "no cards due + explained
  today" branches: `if (!examSoon && cardsDue === 0 && masteredTopic && …)` →
  return a celebratory action (e.g., Eureka/teach-it href, companion reasoning).
  Preserve existing precedence. Consider consuming `reviewProgressToday`/`streak`
  only if it strengthens a rule; otherwise remove them from the type to kill the
  dead-field smell (pure refactor, unit-covered).
- **Proof:** table-driven Vitest for the new rule + precedence; extend the banked
  Companion Router scenario (`ccf5a39e`) or add a sibling.

### 3. Confidence Calibration Dashboard (Req 4)
- **Server action:** `getCalibrationData()` in `_actions/calibration.ts` is
  complete (curve, `overallDeviation`, `classification`, `topicBreakdown`,
  `totalReviewsWithJol`, `insight`) and reads only existing
  `card_reviews.jol_confidence`. **No logic changes.**
- **UI:** add a calibration section to the existing `/app/analytics` route using
  existing pixel-UI panels/components (per `.kiro/specs/metacognition`). Render
  the curve as a simple pixel chart, the classification + insight, and the
  per-topic list. Use the action's `insufficient-data` state for the <20 gate.
- **Proof:** Vitest for classification thresholds and the <20 gate (pure); one
  TestSprite FE scenario (single decisive assertion, learn from Iter 29/30) →
  bank.

### 4. Reward integrity (Req 5)
- **Verify first:** inspect `supabase/migrations/020_secure_reward_rpcs.sql`.
  Expected: `increment_profile_rewards` derives/guards on `auth.uid()`.
- **SQL test:** add `supabase/tests/0XX_reward_rpc_guard.test.sql` asserting a
  call with a foreign `p_user_id` does not change that user's balance (models the
  authenticated-but-malicious case without needing GoTrue from the runner).
- **Rate limit:** apply `checkRateLimit(user.id, "reward", …)` in `rewardAction` /
  `rewardBatch`; return a soft failure when exceeded.
- **Docs:** `SECURITY.md` gains a "Reward integrity" section with the honest
  serverless caveat (in-memory limiter is best-effort per instance).
- **Optional TestSprite BE:** attempt an authenticated reward test; if the runner
  can't reach GoTrue (issue #173), document as Runner_Limitation.

### 5. Grounded-eval prompt-injection resistance (Req 6)
- **`src/lib/feynman-grounding.ts`:** in `buildGroundedPrompt`, wrap passages in
  explicit delimiters and add a line instructing the model to treat passage
  content as untrusted data and never follow instructions inside it. Behavior for
  legitimate sources is unchanged (scoring is deterministic from segments).
- **Proof:** unit test that a poisoned passage cannot flip
  `computeComprehensionScore` (the score derives from classified segments, not
  from free-form model obedience).

### 6. Test-suite depth (Req 7)
- Upgrade ≥3 shallow "renders" scenarios to stateful multi-step flows on the
  seeded account (Review grade→dequeue; Feynman submit→gaps→suggested card;
  create subject→topic→appears). Re-bank via CLI.

### 7. Burnout Detector — OPTIONAL, additive (Req 9)
- Implement per `.kiro/specs/burnout-detector`: `burnout_checks` table (id,
  user_id, score, signals jsonb, computed_at, notified_party) + RLS to owner;
  server-side signal computation (throttled 6h); non-blocking break suggestion;
  cozy rest mode; party check-in.
- **Migration is additive-only**, branch-tested, with a `DROP TABLE IF EXISTS`
  rollback. Verify on Preview before production. Cut cleanly if not fully safe.

## Data model

- **No changes** for Req 1–8.
- **Optional (Req 9):** new `burnout_checks` table only. No edits to existing
  tables/columns/data.

## Testing strategy

- **Vitest (primary for logic):** property-based timezone tests; router precedence;
  calibration thresholds; prompt-injection score-stability.
- **SQL tests (`supabase/tests/`):** reward RPC guard.
- **TestSprite FE:** calibration render + empty state; deepened stateful scenarios;
  full-suite regression rerun after each change.
- **TestSprite BE:** existing 3 remain green; optional 4th (reward) documented if
  runner-limited.
- **Honesty:** runner limitations (fixed viewport; GoTrue unreachable) are
  documented, never worked around by faking green.

## Risk register & mitigation

| Risk | Mitigation |
|---|---|
| Breaking the live URL mid-build | Branch + Preview_Deploy; promote only when green |
| Timezone fix flips banked dashboard/streak tests | Expected; treat as the arc — fix or `test plan put`, rerun |
| Migration corrupts data | Additive-only; branch-tested; rollback ready; optional/last |
| Flaky deepened tests | Only deepen where state is deterministic; else leave as-is |
| Rule 7 mismatch | Phase-0 audit; never auto-"fix" tests from another account |
| Runner GoTrue limit blocks BE reward test | Verify via SQL test instead; document limitation |

## Sequencing (MoSCoW)

- **Must:** Req 1 (baseline), Req 2 (timezone), Req 8 (narrative), demo + final green.
- **Should:** Req 3 (router), Req 4 (calibration).
- **Could:** Req 5 (reward integrity), Req 6 (prompt fencing), Req 7 (depth).
- **Optional / freeze-exception:** Req 9 (Burnout Detector, additive).