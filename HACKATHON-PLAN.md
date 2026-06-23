# TestSprite Hackathon Season 3 — Battle Plan

**Objective:** 1st place.  
**Project:** Nora (Pixel Study OS)  
**Timeline:** June 30 – July 7, 2026 (submissions close 4:59 PM PDT)  
**Team:** Resque (2nd place, TestSprite Hackathon S2 — CinePurr)

---

## Context for AI Agents Reading This Document

This is the hackathon execution plan for entering **Nora** into TestSprite
Hackathon Season 3 ("Build the Loop"). If you're a new session agent picking
this up, here's what you need to know:

**What is Nora?**  
A Next.js 16 + Supabase study operating system with a pixel-art RPG aesthetic.
It implements 6 evidence-based learning strategies (FSRS spaced repetition,
Feynman technique evaluation, spaced practice, interleaving, research desk,
video study room) wrapped in gamification (XP, coins, levels, a Pokémon-style
companion pet). 332 unit tests, TypeScript strict, 17 DB migrations, custom
28-component pixel-UI library.

**Key project files to read for full context:**
- `README.md` — Complete tech stack, features, architecture, setup
- `docs/PRODUCT_DESCRIPTION.md` — Detailed feature specs and user flows
- `package.json` — Dependencies (Next.js 16, React 19, ts-fsrs, Tiptap, Supabase)
- `src/app/(protected)/app/layout.tsx` — Main app shell and auth flow
- `src/app/(protected)/app/_actions/` — All server actions (the "backend")
- `src/lib/` — Pure modules (FSRS, spacing, study-mix, LLM, academic search)
- `src/components/pixel-ui/` — Custom UI component library

**What is the hackathon?**  
TestSprite Hackathon S3 requires using the open-source TestSprite CLI as a
real verification loop: create tests → run against live deployed app → get
failure bundles when tests break → fix code → rerun → bank passes. Must
demonstrate genuine iterative usage, not one-shot. App must be at a public
URL the entire build week.

**What is the CLI?**  
`@testsprite/testsprite-cli` (npm, Apache-2.0). Runs real browser tests
against your live public app in the cloud. Returns structured failure bundles
(screenshots, DOM, root-cause, fix recommendation). See Section 11 for
verified commands.

**Current status:** Pre-build preparation. Deployed at https://nora-mu-six.vercel.app/.
Waiting on TestSprite account + API key before Day 1 execution begins.

---

### Source Verification Status

| Source | Verified? | How |
|---|---|---|
| Hackathon rules (Rules 1-19) | YES | User provided Discord announcement verbatim |
| CLI commands & flags | YES | Fetched raw README.md + DOCUMENTATION.md from GitHub (v0.1.2) |
| Exit code table | YES | From DOCUMENTATION.md § Exit codes |
| Plan file JSON schema | NO | Format not documented in README/DOCS; verify after `testsprite setup` |
| Judging criteria / point system | NO | Not released; opens June 30. Current section is labeled inference. |
| Credit costs / free tier limits | NO | Not found in any source; verify during setup |
| Installed skill file content | NO | Only knowable after running `testsprite agent install`; determines how the agent drives the loop |

---

## 1. What the Judges Want

The hackathon is called "Build the Loop." The CLI must be **genuinely used as the checker in a real development loop** — not installed for show.

> **Source note:** The rules below are from the Discord announcement you shared
> (Kairui | TestSprite, posted in the hackathon channel). Judging criteria and
> point system have NOT been publicly released as of June 23, 2026 — what
> follows under "Evaluation axis" is our INFERENCE based on the stated rules +
> Season 2 precedent. This inference will be updated once the submission template
> opens June 30.

### From the Official Rules (verified — you provided these):

| Rule # | Key requirement |
|---|---|
| 4 | "The open-source TestSprite CLI must be genuinely used as the checker in your project, not just installed. Run a real loop against your live app: create and run a test, pull the failure bundle when it breaks, fix, and rerun. **A single one-shot run is not a loop.**" |
| 5 | "The CLI runs your tests in the cloud, against your live app — it does not test localhost. Your app must be reachable at a public URL throughout the build phase." |
| 7 | "The TestSprite account you submit must match the account that generated the banked tests in your project." |

### Inferred Evaluation Axes (not confirmed — update when template drops):

| Evaluation axis | Evidence we think they're looking for |
|---|---|
| **Loop depth** | Multiple cycles of create → fail → fix → pass. Rule 4 explicitly says one-shot doesn't count. |
| **Loop authenticity** | Real failures caught during real development, not staged breaks |
| **App quality** | A working, interesting, functional product at a public URL |
| **Test suite breadth** | Coverage across multiple features/flows, not one happy path |
| **Narrative clarity** | Clean documentation showing what broke, why, and how the loop resolved it |
| **The test bank** | Tests live on the TestSprite platform under your account (Rule 7 verifies this) |

**Disqualifiers (confirmed from rules):**
- Single one-shot run (Rule 4: explicitly stated)
- Tests generated by a different account than the submitter (Rule 7)
- App not reachable at public URL during build phase (Rule 5)
- Not a Discord member (Rule 1)
- Not following on X (Rule 1)
- Multiple submissions from same person/team (Rule 2)

---

## 2. Why Nora Wins

### Lessons from CinePurr (S2, 2nd place — our previous entry)

CinePurr achieved 2nd place with: 13 frontend + 9 backend scenarios, 67 test
scripts, 3 bugs found/fixed, testing progression from 8/30 → 13/13, demo video,
dashboard proof screenshot, and organized `testsprite_tests/` directory.

**What we need to do BETTER this time to take 1st:**
- More loop iterations (CinePurr showed 3 rounds — aim for 8-12+ visible cycles)
- Genuine regressions caught during ACTIVE development (not just initial failures)
- CLI-native workflow (S3 is about the CLI loop, not MCP)
- Compound suite growth over the full week (not a burst on day 1)
- A narrative of the loop AS a development methodology

### Why Nora is a stronger entry than CinePurr

Most hackathon submissions are weekend prototypes. Nora is a production-grade study operating system with:

- 10+ distinct testable user flows
- 17 database migrations, complex state management
- AI integrations (Groq, OpenRouter, OpenAlex, Crossref, Unpaywall)
- Custom pixel-art UI component library (28 components)
- 332 existing unit tests proving engineering discipline
- Real pedagogical depth (FSRS-6, Cepeda spacing, Brunmair interleaving)

**The pitch:** "We used TestSprite's verification loop to ship a new feature into a production-quality study OS — the CLI caught real regressions in our pixel-art UI, FSRS scheduling, and AI evaluation pipeline, and we fixed them in-loop before they reached users."

That narrative is significantly more compelling than "I made a TODO app and tested the add button."

---

## 3. Pre-Build Preparation (Before June 30)

### 3.1 Deployment

| Task | Status | Notes |
|---|---|---|
| Deploy to Vercel | [x] | Live at https://nora-mu-six.vercel.app/ |
| Verify all env vars are set in Vercel dashboard | [ ] | Supabase URL/key, Groq key minimum |
| Confirm app loads at public URL | [ ] | Test login, onboarding, core flows |
| Set up a test user account | [ ] | Pre-seeded account for TestSprite to interact with |
| Verify DB migrations are applied on prod Supabase | [ ] | All 17 migrations |

**Critical:** The app must be reachable and functional from day 1. No deploy-on-day-7 scramble.

### 3.2 TestSprite Setup

| Task | Status | Notes |
|---|---|---|
| Create TestSprite account | [x] | testsprite.com — resquedzn05@gmail.com |
| Generate API key | [x] | In .env.local as TESTSPRITE_API_KEY |
| Install CLI globally | [x] | v0.1.2 installed |
| Run `testsprite setup` | [x] | Authenticated, all scopes granted, claude skill installed |
| Create project | [x] | Project ID: `4ba5d8f8-310d-41bc-bbf4-b85208bb6d44` |
| Verify with dry-run | [ ] | `testsprite test create --dry-run --output json` |
| Join TestSprite Discord | [ ] | Required for eligibility |
| Follow TestSprite on X | [ ] | Required for eligibility |

### 3.3 Test Plans — What We Know and Don't Know

**What DOCUMENTATION.md confirms:**
- Frontend tests use `--plan-from <path>` to pass a "plan-steps document"
- The format is JSON (README example: `--plan-from ./checkout-flow.plan.json`)
- `test create-batch` accepts `--plans ./plans.jsonl` (JSONL) or `--plan-from-dir ./plans/`
- `test plan put <test-id> --steps ./refined.plan.json` replaces a test's plan

**What we DON'T know yet (verify on Day 1):**
- The internal JSON schema of a plan file (what keys? what step format?)
- Whether the agent auto-generates plans from app exploration, or we write them
- The installed skill file content (which tells the agent exactly what to do)

**The most likely workflow** (based on README's "How it works" section):
> "Every time your agent changes code, it asks one question: is this behavior
> already covered by the suite? Not yet covered → `testsprite test create`.
> Already covered → `testsprite test rerun`."

This implies the AGENT (Kiro) creates and manages tests, not you manually.
The `testsprite setup` + `agent install` flow installs a skill that teaches
the agent to drive the loop autonomously. Our pre-build prep should focus on:

1. Deploy Nora (confirmed prerequisite)
2. Run `testsprite setup` to get authenticated and install the skill
3. Read the installed skill file to understand the exact agent workflow
4. THEN decide whether we hand-author plans or let the agent create them

**Tentative plan file structure** (confirm after reading skill file):
```
.testsprite/
├── plans/         ← may be auto-generated by agent, not hand-authored
├── failure/       ← CLI writes failure bundles here (confirmed: --out flag)
└── runs/          ← per-run artifacts (confirmed: test artifact get)
```

### 3.4 Feature to Build During the Loop

The loop is most impressive when you're **actively developing** while the CLI catches regressions. Choose ONE visible new feature to build during the week:

**Recommended: "Study Streaks Dashboard Widget"**
- Visible, testable UI addition
- Touches gamification, analytics, and the dashboard
- Can break existing tests (regression hunting!)
- Small enough to ship in the build window

**Alternative options:**
- PDF upload UI for RAG pipeline
- Flashcard deck export/import
- Pet evolution animation sequences
- "Focus Timer" Pomodoro widget

The key: something that **will touch existing code** and **could plausibly break other things** — giving the loop real regressions to catch.

---

## 4. Build Week Execution (June 30 – July 7)

### Day 1 (June 30) — Foundation

**Morning:**
1. Verify deployment is live and stable
2. Run `testsprite setup` if not done
3. Create the TestSprite project with production URL
4. Run first 3-5 test plans (landing, login, signup, dashboard, navigation)
5. Expect failures — this is good. Document them.

**Afternoon:**
6. Pull failure bundles: `testsprite test failure get <id> --out ./.testsprite/failure/<id>`
7. Fix the issues the CLI identified
8. Rerun: `testsprite test rerun <id> --wait --output json`
9. Bank the passes into the durable suite

**End of day target:** 5 tests created, at least 2 loop iterations completed, first passes banked.

### Day 2 (July 1) — Expand Coverage

1. Create tests for Feynman Mode, Review, Research, Planner
2. Run all new tests — expect failures on complex flows
3. Fix issues (AI timeout handling, loading states, form validation)
4. Rerun until green
5. Start developing the new feature (streaks widget or chosen alternative)

**End of day target:** 10+ tests in suite, new feature skeleton committed.

### Day 3 (July 2) — The Regression Hunt

This is where the loop proves its value:
1. Continue building the new feature (it will touch shared components)
2. Rerun ALL existing tests: `testsprite test rerun --all --project <id> --wait`
3. The new feature WILL break something. This is the golden moment.
4. Pull the failure bundle → see exactly what broke → fix it
5. Rerun → green. Document this cycle carefully.

**End of day target:** At least one genuine regression caught and fixed. This is your best submission material.

### Day 4 (July 3) — Deepen & Edge Cases

1. Add edge-case tests:
   - Empty states (no subjects, no cards, no sessions)
   - Error states (AI provider down, rate limited)
   - Mobile viewport behavior
   - Theme switching (dark → light → palette changes)
2. Run, fail, fix, pass cycle for each
3. Continue new feature development
4. Rerun full suite to confirm nothing regressed

**End of day target:** 15+ tests, multiple loop iterations logged, new feature nearing completion.

### Day 5 (July 4) — Polish & Complete

1. Finish the new feature
2. Create tests specifically for the new feature
3. Run the new tests — fix any issues
4. Full suite rerun — everything must pass
5. Fix any lingering failures

**End of day target:** 18-20 tests all green, new feature live and tested.

### Day 6 (July 5) — Final Verification & Documentation

1. One final `testsprite test rerun --all --project <id> --wait`
2. Confirm 100% pass rate on the full suite
3. Write LOOP.md / submission documentation (see Section 6)
4. Record a demo video if required by template
5. Take screenshots of the TestSprite dashboard showing banked tests

**End of day target:** Everything green, documentation complete, ready to submit.

### Day 7 (July 6-7 before 4:59 PM PDT) — Submit

1. Final check: app live, tests green, account matches
2. Post submission in the designated Discord channel using the official template
3. Double-check all required fields
4. Done.

---

## 5. Test Plan Strategy — What to Cover

### Tier 1: Critical Path (must pass — build first)

| # | Flow | Why it's critical |
|---|---|---|
| 1 | Landing page renders correctly | First impression, pixel-art assets load |
| 2 | Sign up with email/password | Account creation — gate to everything |
| 3 | Login with existing credentials | Auth flow |
| 4 | Onboarding wizard completes | University selection, academic identity |
| 5 | Dashboard loads with stats | XP, coins, level, navigation working |
| 6 | Sidebar navigation to all pages | Core app structure |

### Tier 2: Feature Depth (demonstrates app quality)

| # | Flow | Tests what |
|---|---|---|
| 7 | Create subject and topic | Data management |
| 8 | Feynman Mode: write explanation, get evaluation | AI integration, complex UI |
| 9 | Review session: grade a card | FSRS scheduling, gamification |
| 10 | Research Desk: enter query, view sources | Academic API integration |
| 11 | Planner: view weekly calendar | Spacing math, data rendering |
| 12 | Study Room: search educational video | YouTube API, filtering UI |
| 13 | Pixel Room: view pet, daily missions | Gamification, sprite rendering |
| 14 | Settings: toggle theme | Preference persistence, CSS variables |
| 15 | Analytics page renders charts | Data visualization |

### Tier 3: Sophistication (separates 1st from 3rd)

| # | Flow | Tests what |
|---|---|---|
| 16 | Create flashcard manually, find it in review queue | End-to-end data flow |
| 17 | Feynman iterative refinement (re-explain after feedback) | Multi-step AI interaction |
| 18 | Party: create party, view invite code | Social system |
| 19 | Mobile responsive: bottom nav appears on small viewport | Responsive design |
| 20 | Theme palette change persists across navigation | Client-side state persistence |

---

## 6. Submission Documentation (LOOP.md)

Structure the submission narrative around **the loop in action**:

```markdown
# Nora × TestSprite — The Verification Loop

## Project
Nora is a study operating system built on cognitive science...
[Brief product description, link to live URL, link to repo]

## The Loop in Action

### Loop Iteration 1: Login Flow
- **Created:** test for login → dashboard redirect
- **Failed:** TestSprite caught that the loading state was blocking interaction
- **Fix:** Added proper Suspense boundary in the auth redirect logic
- **Rerun:** Passed. Banked.

### Loop Iteration 2: Feynman Evaluation (regression caught!)
- **Context:** While building the Streaks Widget, I touched the layout.tsx shared component
- **Rerun:** TestSprite flagged that Feynman Mode's submit button was now unclickable
- **Diagnosis:** The failure bundle showed a z-index conflict with the new widget overlay
- **Fix:** Adjusted stacking context in the panel component
- **Rerun:** Passed. Real regression caught before users ever saw it.

### Loop Iteration 3: ...
[Continue for every significant cycle]

## Final Suite
- **Total tests banked:** 20
- **Total loop iterations:** 12+
- **Regressions caught by the loop:** 3
- **New feature shipped with zero known bugs:** Streaks Widget

## Evidence
- TestSprite Account: [your email]
- Project ID: proj_xxxxxxxx
- Live URL: https://nora-mu-six.vercel.app
- Repo: https://github.com/lxcario/Nora
```

---

## 7. Competitive Edges to Exploit

### Things most competitors WON'T do:

1. **Test AI-powered features** — Most apps are CRUD. Testing "enter a research query → get cited academic sources" or "write an explanation → get segment-by-segment evaluation" is complex and impressive.

2. **Show genuine regressions** — Most people will test a feature once and move on. Catching a REAL regression during active development (test B breaks because you were building feature C) is exactly what the loop is for.

3. **Breadth AND depth** — 20 tests across 10+ features, not 5 tests on login. The judges will see the TestSprite dashboard showing your banked suite.

4. **Professional codebase** — 332 existing unit tests, TypeScript strict, 17 migrations, proper architecture. This isn't a weekend hack — it's a production system being verified by the loop.

5. **The narrative** — Tell the story of the loop AS a development methodology, not just "I ran the CLI." Show how it changed your workflow, caught things you wouldn't have caught, and gave you confidence to ship.

### CLI Improvement PRs ($100+ each — see Section 12)

This is a separate $2,000 cash pool. Open real PRs against `main` at github.com/TestSprite/testsprite-cli. $100+ per merged PR. First-come until the pool is exhausted.

We've already analyzed the full source (index.ts, errors.ts, agent.ts, CONTRIBUTING.md). See **Section 12** below for specific PR opportunities identified from code analysis.

---

## 8. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Vercel deploy breaks mid-week | Pin to a known-good commit. Use Vercel preview URLs as backup. |
| TestSprite has an outage | Work ahead. Don't leave everything for day 7. |
| AI providers rate-limit during testing | Ensure proper error handling returns graceful UI (not crashes) |
| Test plans don't match actual UI | Write plans against the DEPLOYED app, not local dev |
| Credit exhaustion on TestSprite | Understand the credit model. Reruns are cheaper than fresh runs. |
| Supabase free tier limits | Monitor usage. The test account should be lightweight. |

---

## 9. Required Accounts & Access

| Service | Status | Action needed |
|---|---|---|
| TestSprite account | [ ] | Sign up at testsprite.com |
| TestSprite API key | [ ] | Dashboard → Settings → API Keys |
| TestSprite Discord | [ ] | Join: discord.gg/W4JDrZfdB |
| TestSprite X follow | [ ] | Follow @Test_Sprite |
| Vercel account | [ ] | For deployment |
| Supabase project (prod) | [ ] | Migrations applied, env vars set |
| GitHub repo (public or private) | [x] | https://github.com/lxcario/Nora |

---

## 10. Execution Checklist (tick as done)

### Pre-build (before June 30)
- [x] Nora deployed to public Vercel URL
- [ ] All env vars configured in Vercel
- [ ] Test user account seeded in prod DB
- [ ] Core flows verified manually on prod
- [x] TestSprite CLI installed and authenticated
- [x] TestSprite project created with correct target URL
- [ ] Dry-run confirmed working
- [ ] Discord joined, X followed
- [ ] 5+ test plan files drafted
- [ ] New feature decided and scoped

### Build week (June 30 – July 7)
- [ ] Day 1: First 5 tests created and looped
- [ ] Day 2: 10+ tests, new feature started
- [ ] Day 3: Regression caught during active development
- [ ] Day 4: 15+ tests, edge cases covered
- [ ] Day 5: New feature complete, fully tested
- [ ] Day 6: Full suite green, documentation written
- [ ] Day 7: Submitted in Discord channel before 4:59 PM PDT

### Submission
- [ ] App live at public URL
- [ ] All tests passing on TestSprite platform
- [ ] Account matches (submission = test generator)
- [ ] Follows official template exactly
- [ ] All team members listed
- [ ] LOOP.md / narrative complete

---

## 11. Commands Reference (sourced from official CLI docs)

> **Source verification:** All commands below are taken directly from the
> [TestSprite CLI README.md](https://github.com/TestSprite/testsprite-cli/blob/main/README.md)
> and [DOCUMENTATION.md](https://github.com/TestSprite/testsprite-cli/blob/main/DOCUMENTATION.md),
> fetched June 23, 2026. Version at time of read: 0.1.2.

```bash
# Install (README Quickstart)
npm install -g @testsprite/testsprite-cli
testsprite setup          # prompts for API key, installs agent skill

# Non-interactive setup (DOCUMENTATION.md § Manual setup)
TESTSPRITE_API_KEY=sk-... testsprite setup --from-env --yes --agent claude

# Create a project (DOCUMENTATION.md § Write commands)
testsprite project create --name "Nora" --target-url https://nora-mu-six.vercel.app

# The Loop — verbatim from README § Quickstart example:
# 1. Create a test, run it, wait for verdict
testsprite test create --project proj_8f0f6 --type frontend \
  --plan-from ./checkout-flow.plan.json --run --wait --output json
#   → exits 1: the run failed

# 2. Pull ONE self-consistent failure bundle
testsprite test failure get test_3a9f21c7 --out ./.testsprite/failure

# 3. Agent reads the bundle, fixes the code, then replays
testsprite test rerun test_3a9f21c7 --wait --output json
#   → exits 0: passed. The test now lives in your durable suite.

# Full suite rerun (DOCUMENTATION.md § Run commands)
testsprite test rerun --all --project proj_XXX --wait --max-concurrency 4 --output json

# Read commands
testsprite test list --project proj_XXX --output json
testsprite test result test_XXX --output json
testsprite test result test_XXX --include-analysis --output json

# Agent skill install (README § Agent onboarding)
testsprite agent install claude     # .claude/SKILL.md
testsprite agent install codex      # managed section in AGENTS.md
testsprite agent install cursor     # .cursor/rules/testsprite-verify.mdc
```

**Exit codes** (from DOCUMENTATION.md § Exit codes):

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Generic failure / non-passed run status |
| 2 | Not yet implemented |
| 3 | Auth error |
| 4 | Not found |
| 5 | Validation error / payload too large |
| 6 | Conflict / precondition failed |
| 7 | Timeout / unsupported |
| 10 | Service unavailable |
| 11 | Rate limited (retriable) |
| 12 | Insufficient credits (non-retriable) |
| 13 | Feature gated (paid plan required) |

**Important architectural note** (from README):
> `testsprite setup` prompts for your API key, verifies it, and installs the
> verification-loop skill for your coding agent — one command, so your agent
> is wired to verify its own work.

This means `testsprite setup` + `testsprite agent install <target>` installs a
skill file that teaches the coding agent (Kiro/Claude/Cursor) how to drive the
loop autonomously. The agent reads that skill and runs the CLI itself. You don't
hand-author every test plan — the agent creates test plans based on app behavior.

**What we still need to verify on Day 1:**
- The exact format/schema of `.plan.json` files (documented in DOCUMENTATION.md
  as "plan-steps document" but the internal schema isn't shown in the README)
- Whether `testsprite setup` auto-detects Kiro or needs a manual `--agent` flag
- Credit cost per test run on free tier
- The installed skill file's actual content (tells us exactly what the agent
  should do)

**Action:** Run `testsprite setup` on Day 1, then read the installed skill file
to get the ground truth for the agent's autonomous loop behavior.

---

**Last updated:** June 23, 2026  
**Status:** Pre-build preparation phase  
**Target:** 1st place, TestSprite Hackathon Season 3

---

## 12. CLI Improvement PRs — $2,000 Bounty Pool

Separate from judging. Cash for genuine improvements. First-come, first-served.

**Rules:**
- Must be a genuine improvement (their team decides)
- Must pass CI (ESLint, Prettier, TypeScript, Vitest coverage ≥ 80%)
- Must get merged by them
- Trivial/padded PRs don't qualify (whitespace, cosmetic, split one-liners)
- Minimum $100 per merged PR, more for substantial ones
- PRs target the `main` branch via fork
- Conventional Commits format: `feat(cli): ...`, `fix(http): ...`, `docs: ...`

**Stack:** TypeScript, Node ≥ 20, Commander 12, Valibot, Vitest, MSW (mocks)

### Identified Opportunities (from source analysis)

After reading the CLI source (index.ts, errors.ts, agent.ts, CHANGELOG.md, CONTRIBUTING.md, DOCUMENTATION.md), here are genuine improvement vectors:

#### PR Opportunity 1: `agent install kiro` target (SUBSTANTIAL — $200+)

**What:** Add Kiro as a supported agent target alongside claude, codex, cursor, cline, antigravity.  
**Why genuine:** Kiro is a real coding IDE (the one we're using). It uses `.kiro/skills/` for skill files. The CLI already has the architecture — TARGETS map, own-file mode, renderForTarget. Adding a target is well-scoped and useful.  
**Files to touch:**
- `src/lib/agent-targets.ts` — add `kiro` to TARGETS map with path `.kiro/skills/testsprite-verify/SKILL.md` and own-file mode
- `src/commands/agent.ts` — no changes needed (generic over TARGETS)
- Tests
- DOCUMENTATION.md / README.md — add kiro to the list

**Risk:** Medium — they may already have it planned. But the bounty is first-come.

#### PR Opportunity 2: `testsprite test list --status` filter documentation fix

**What:** The `--status <list>` flag on `test list` accepts a comma-separated list but the DOCUMENTATION.md doesn't document what the valid status values are.  
**Why genuine:** Users (and agents) need to know what statuses are filterable. The CHANGELOG mentions `blocked` as a distinct status from `failed`, and the error.ts file references various states.  
**Files:** DOCUMENTATION.md  
**Risk:** Low — docs-only PRs are valid per CONTRIBUTING.md. But it's a smaller PR so may pay the minimum $100.

#### PR Opportunity 3: `--no-color` / `NO_COLOR` support

**What:** Respect the `NO_COLOR` environment variable (https://no-color.org/) and add a `--no-color` flag.  
**Why genuine:** The CLI uses ANSI escape codes (`\x1b[2K\r`) for the progress ticker. In non-TTY environments this mostly works (TTY-gated), but there's no explicit `NO_COLOR` support which is a cross-ecosystem standard.  
**Files:** `src/lib/output.ts` or wherever ANSI codes are emitted  
**Risk:** Low-medium. They might consider the TTY gate sufficient.

#### PR Opportunity 4: Shell completion script generation

**What:** Add `testsprite completion bash|zsh|fish` that outputs a completion script.  
**Why genuine:** Commander supports this natively via `program.opts()`. Every mature CLI has shell completions. This is a quality-of-life improvement for power users.  
**Files:** New command, possibly `src/commands/completion.ts`  
**Risk:** Medium — more substantial, but high value. Could be $200+.

#### PR Opportunity 5: `test failure get --format markdown`

**What:** Add a `--format` option to `test failure get` that outputs the failure bundle as structured markdown (suitable for pasting into an issue or PR body).  
**Why genuine:** The current output is JSON or a directory of files. Agents read JSON, but humans triaging in GitHub Issues want markdown. This bridges the gap.  
**Files:** The failure get command handler, a new formatter  
**Risk:** Medium — they might want this done a specific way.

#### PR Opportunity 6: Better error message for Node < 20

**What:** The `.npmrc` has `engine-strict=true` but the actual runtime check in `src/index.ts` doesn't emit a friendly message if somehow Node < 20 gets through (e.g., via `npx` which doesn't respect engine-strict). Add a runtime version check with a clear message.  
**Files:** `src/index.ts` — add a top-of-file version check  
**Risk:** Low. This is a defensive improvement.

### PR Strategy

1. **Start with the Kiro agent target PR** — it's substantial, clearly useful, and we're uniquely positioned to implement it correctly (we know the `.kiro/skills/` convention).
2. **Follow with one docs/DX improvement** — lower effort, quick to review, high chance of merge.
3. **Open both in the first 2 days of the hackathon** — first-come advantage on the $2,000 pool.

### How to Execute

```bash
# Fork and clone
git clone https://github.com/YOUR-USERNAME/testsprite-cli.git
cd testsprite-cli
npm install
npm run build
npm test              # verify everything passes
npm run typecheck     # must be clean

# Create branch
git checkout -b feat/agent-install-kiro

# Make changes, then verify
npm run lint:fix
npm run format
npm run typecheck
npm test

# Commit (Conventional Commits)
git add .
git commit -m "feat(agent): add kiro as an install target"

# Push and open PR against main
git push -u origin feat/agent-install-kiro
# Open PR on GitHub targeting TestSprite/testsprite-cli main
```

---

## 13. Worst-Case vs Best-Case Outcomes

| Scenario | Outcome |
|---|---|
| **Best case** | 1st place prize + 2-3 merged CLI PRs ($300-$600 bounty) |
| **Likely case** | Top 3 placement + 1-2 merged CLI PRs ($200-$300 bounty) |
| **Floor** | Solid submission, full test suite banked, CLI PRs merged for cash regardless of placement |

The CLI bounty is the safety net. Even if we don't place, merged PRs pay cash. And the hackathon work (deployment, test suite, new feature) improves Nora regardless of the competition outcome.

---

## 14. What Separates 1st from 2nd

Based on analyzing S1-S2 patterns:

1. **The regression story.** 1st place SHOWS a moment where the loop caught something the developer would have shipped. Not a staged break. A real "I changed component X and the CLI told me component Y broke." That's the product-market-fit proof they want to showcase.

2. **Suite compound growth.** The judges see your TestSprite dashboard. They want to see a GROWING suite — not 20 tests created on day 1, then silence. The timeline should show: Day 1 (5), Day 2 (10), Day 3 (14 + 1 regression fixed), Day 4 (18), Day 5 (20+). Compounding.

3. **App memorability.** When judges review 50 submissions, they remember the pixel-art study OS with the animated Pokémon pet, not "Yet Another SaaS Dashboard #37." Nora's visual identity is a competitive weapon.

4. **Technical sophistication of tests.** Testing an AI evaluation pipeline is 10x more impressive than testing a login form. If your suite includes tests like "user writes an explanation, Feynman evaluation returns valid JSON with segments", that demonstrates trust in the platform for complex real-world verification.

5. **The CLI PR crossover.** Submitting a genuine CLI improvement (especially the Kiro target, which THEY benefit from) while ALSO being a top hackathon submission signals serious engagement. Judges are humans — this makes an impression.

---

**Last updated:** June 23, 2026  
**Status:** Pre-build preparation phase  
**Target:** 1st place + CLI Improvement Bounty, TestSprite Hackathon Season 3
