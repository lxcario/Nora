# Nora — S3 Loop Hardening & Quality Push (Tasks)

Each task is test-driven, incremental, and demoable. Every task that changes app
behavior runs the full loop (build+test → Preview deploy → CLI verify → prod →
rerun the *affected* test IDs with `--no-auto-heal`, free verbatim) and appends a
`LOOP.md` row. The full `rerun --all --no-auto-heal --project <id>` is the
final-green shot (Task 13), not a per-task step. Read
`node_modules/next/dist/docs/` before routing/server-action edits (modified
Next.js; `proxy.ts` = middleware).

## Credit budget (read before running any CLI command)

Verified against the CLI changelog. Keep TestSprite spend to one deliberate
create; everything else is free.

- **Free:** `npm run build`, `npm test` (Vitest), lint, `supabase/tests/` SQL
  tests, and `testsprite test rerun <ids> --no-auto-heal` — a verbatim FE replay
  of *unchanged* tests (no auto-heal flag sent ⇒ no charge).
- **The ~0.2-credit trap:** a plain FE `rerun` leaves auto-heal **on by default**
  (~0.2 credits/test; the CLI prints a `0.2 credit` advisory naming
  `--no-auto-heal`). Always pass `--no-auto-heal` for regression — over ~40 FE
  tests that's free vs. ~8 credits.
- **Interim vs. full:** after each change, rerun only the *affected* FE test IDs
  (`testsprite test rerun <id…> --no-auto-heal`) — free, and the logic is already
  Vitest-covered. You **cannot** combine explicit IDs with `--all` (CLI exits 5;
  `--all` reruns the whole project and needs `--project`). Run the full
  `rerun --all --no-auto-heal --project <id>` once, as the final-green shot (Task 13).
- **Costs credits:** `test create` (new test); `test run` (fresh AI-driven run); a
  plain FE `rerun` without `--no-auto-heal` (~0.2/test); and any `rerun`/`run`
  after `test plan put` / `test code put` (script regenerated ⇒ runs fresh).
- **The one protected spend:** `test create` the Calibration test (Task 8).
- If credits get tight, **cut Task 11 first**. Prefer requesting a hackathon
  credit boost over skipping the loop.

## Phase 0 — Protect the win (do first, no code changes)

- [ ] **Task 1: Confirm the green baseline.**
  - Verify live URL returns 200; run `testsprite test rerun --all --no-auto-heal --project
    4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --wait` (free FE verbatim replay); confirm
    `npm test` + `npm run build` pass locally. Create a working branch.
  - _Demo:_ 43/43 green run + clean local build, timestamped.
  - _Requirements: 1, 10_

- [ ] **Task 2: Audit Rule 7 account match.**
  - `testsprite test list --project <id> --output json`; confirm every test is
    `createdFrom: cli` under the submitting account. Report any anomaly; do not
    auto-modify.
  - _Demo:_ a checked list proving account/source integrity.
  - _Requirements: 1_

- [ ] **Task 3: Submission-template gap check.**
  - Compare the official `#hackathon-s3-submissions` template to `SUBMISSION.md`;
    list any missing/edits-needed field.
  - _Demo:_ a short gap list (or "complete").
  - _Requirements: 1, 8_

## Phase B — Real-bug loop arcs (highest narrative leverage)

- [ ] **Task 4: Add `startOfUserLocalDay` + property tests (logic only).**
  - Implement in `src/lib/due.ts` mirroring `endOfUserLocalDay`. Add
    property-based Vitest for local-day boundaries across timezones.
  - _Demo:_ new unit tests green; no app behavior changed yet.
  - _Requirements: 2_

- [ ] **Task 5: Timezone-correct streak + daily quests (loop arc).**
  - Update `src/lib/streak.ts` to key by user-local date; update
    `page.tsx` quest counters to use `startOfUserLocalDay`. Build+test → Preview
    → rerun just the affected FE tests (dashboard + streak) with `--no-auto-heal`
    (free; fix or `test plan put` any that flip) → prod → bank. Add `LOOP.md` arc.
  - _Demo:_ quests reset at user-local midnight; suite green; documented arc
    "advertised timezone-safe → loop caught UTC-bound reset → fixed."
  - _Requirements: 2, 8, 10_

- [ ] **Task 6: Companion Router mastery action (loop arc).**
  - Add the mastery rule to `getNextStudyAction`; table-driven Vitest for
    precedence. Extend/add the Companion Router TestSprite scenario; verify CTA +
    navigation. Bank + `LOOP.md` row.
  - _Demo:_ mastery-celebration CTA appears in the right state; tests green.
  - _Requirements: 3, 8, 10_

## Phase C — Flagship feature under the loop

- [ ] **Task 7: Confidence Calibration Dashboard UI.**
  - Wire `getCalibrationData()` into `/app/analytics` with existing pixel-UI
    components; curve + classification + per-topic + insight + <20 empty state.
    Vitest for thresholds/gate.
  - _Demo:_ students see over/under-confidence per topic (MIT-cited); empty state
    for new accounts.
  - _Requirements: 4, 10_

- [ ] **Task 8: Bank the Calibration scenario (loop arc).**
  - `testsprite test create --plan-from …calibration.plan.json` with a single
    decisive assertion. If blocked, `test failure get` → tighten → `test plan
    put` → rerun. Bank + `LOOP.md` row.
  - _Demo:_ a new green frontend test; documented as a feature shipped under the
    loop.
  - _Requirements: 4, 8_

## Phase D — Depth, integrity, and narrative (Could-tier; time-permitting)

- [ ] **Task 9: Reward integrity (loop arc).**
  - Verify `020_secure_reward_rpcs.sql` guard; add `supabase/tests/` SQL test for
    the foreign-`p_user_id` case; apply `checkRateLimit` in
    `rewardAction`/`rewardBatch`; document the honest serverless caveat in
    `SECURITY.md`. Optional BE test; document if GoTrue-blocked.
  - _Demo:_ SQL guard test green; rate limit unit test green; `SECURITY.md`
    section added.
  - _Requirements: 5, 8, 10_

- [ ] **Task 10: Prompt-injection fencing (loop arc).**
  - Add untrusted-data delimiting to `buildGroundedPrompt`; unit test that a
    poisoned passage can't flip `computeComprehensionScore`.
  - _Demo:_ hardening test green; grounded eval unchanged for real sources.
  - _Requirements: 6_

- [ ] **Task 11: Deepen 3+ shallow FE scenarios (loop arc).**
  - Upgrade Review/Feynman/create-subject scenarios to stateful multi-step
    assertions where deterministic; re-bank via CLI. Document arcs.
  - _Demo:_ upgraded scenarios green; suite reads as behavioral depth.
  - _Requirements: 7, 8_

## Phase E — Ship

- [ ] **Task 12: Loop narrative + submission artifacts.**
  - Append all new `LOOP.md` rows; update `SUBMISSION.md`,
    `testsprite_tests/manifest-all.json`, `testsprite_tests/README.md`, README
    badges to verified totals; commit new failure bundles; re-verify GitLab CI.
  - _Demo:_ a judge can open `LOOP.md` and click through to commits + banked tests.
  - _Requirements: 8_

- [ ] **Task 13: Demo refresh + final green + submit.**
  - Final `testsprite test rerun --all --no-auto-heal --project
    4ba5d8f8-310d-41bc-bbf4-b85208bb6d44 --wait` (prod) green; `npm test` +
    `npm run build` clean; refresh the 3-min demo to include the new arcs +
    Calibration Dashboard; complete the submission template.
  - _Demo:_ consistent, current submission package (live app, video, repo,
    LOOP.md, green suite).
  - _Requirements: 1, 8_

## Optional — freeze exception

- [ ] **Task 14 (Optional): Burnout Detector (additive migration).**
  - Only if Tasks 1–13 are done with time to spare. Implement per
    `.kiro/specs/burnout-detector` with one additive `burnout_checks` migration +
    RLS, branch/Preview-tested, rollback ready. Cut cleanly if not fully safe.
  - _Demo:_ burnout signal → gentle break suggestion + cozy rest mode; new banked
    scenario green; production unaffected.
  - _Requirements: 9, 10_
