# TestSprite CLI — PR Recommendations (Bounty $2,000 Pool)

> **Last updated:** June 24, 2026
> **Source:** Deep analysis of `testsprite-cli` v0.1.2 (commit `18f6e6e`)
> **Pool rules:** $100+ per merged PR, first-come. Must pass CI, be a genuine improvement, get merged by the TestSprite team. Trivial/padded PRs don't qualify.

---

## Already Submitted (Your PRs)

| # | Branch | Title | Status |
|---|--------|-------|--------|
| 10 | `feat/add-kiro-target` | feat(agent): add kiro as an install target | Open, review required |
| 11 | `feat/node-version-guard` | feat(cli): add runtime Node.js version check with clear error message | Open, review required |
| 12 | `feat/no-color-support` | feat(cli): respect NO_COLOR environment variable per no-color.org | Open, review required |

**Action:** Monitor for review comments and respond within hours. These are solid — don't touch them.

---

## Competitors Already Submitted

| Author | PRs | Pattern |
|--------|-----|---------|
| crypticsaiyan | #7, #9, #22, #23, #26, #27 | `fix(test)` / `fix(bundle)` / `fix(cli)` — edge-case fixes, test improvements |
| Davidson3556 | #14, #17, #19, #21 | `fix(cli)` — validation fixes for flags (looks template-driven: "12 of 13 tasks") |
| SahilRakhaiya05 | #4, #8, #26 | Windows test suite, config/bundle fixes |

**Key insight:** Everyone else is doing small `fix()` patches. The team values **features** more ($200+ for substantial). Your `feat()` PRs stand out.

---

## New PR Opportunities (Ranked by Merge Probability)

### PR #1: `feat(cli): add shell completion generation`

**Estimated bounty:** $150–250 (substantial feature)
**Risk of rejection:** Low — every mature CLI has this, Commander supports it natively
**Effort:** ~2 hours

**What:** Add `testsprite completion bash|zsh|fish|powershell` that outputs a completion script to stdout. Users pipe it to their shell profile.

**Why it's genuine:**
- The CLI has 20+ commands with complex flag combinations
- No shell completion currently exists
- Commander 12 has built-in completion support via `program.enablePositionalOptions()` or via manual generation
- Direct user DX improvement — agents and humans both benefit from discoverable flags

**Implementation approach:**
```
src/commands/completion.ts          — new command
src/commands/completion.test.ts     — test that each shell variant emits non-empty output
```

The simplest approach: use Commander's built-in `.createHelp()` to enumerate all commands/options and generate the completion script string. For bash/zsh, output a `complete -F` or `compdef` wrapper. For fish, output `complete -c testsprite -a "..."` lines.

**Files to touch:**
- `src/commands/completion.ts` — new file
- `src/commands/completion.test.ts` — new file
- `src/index.ts` — register the command
- `DOCUMENTATION.md` — add to command table
- `README.md` — mention in Commands table

**CI gates to pass:** ESLint, Prettier, TypeScript, Vitest (new tests), coverage ≥ 80%

---

### PR #2: `feat(cli): add --color/--no-color flag alongside NO_COLOR env var`

**Estimated bounty:** $100–150
**Risk of rejection:** Low — natural companion to your NO_COLOR PR (#12)
**Effort:** ~1 hour

**What:** Add a `--color` / `--no-color` global flag that overrides the `NO_COLOR` environment variable. Precedence: `--no-color` flag > `NO_COLOR` env > auto-detect TTY.

**Why it's genuine:**
- Your PR #12 adds `NO_COLOR` env support, but there's no CLI flag equivalent
- Every production CLI (npm, git, cargo, gh) has a `--no-color` flag
- Agents running the CLI programmatically may want to suppress color without setting env vars
- The flag is the standard pattern alongside env var support

**Implementation:**
- Add `--color` / `--no-color` as a global option in `src/index.ts` (Commander boolean negation)
- Pass the resolved value through to `createTicker` and any other ANSI-emitting code
- Precedence: flag > env > TTY detection

**Dependency:** Wait for your PR #12 to merge first, then open this as a follow-up.

---

### PR #3: `feat(ci): add Node 20 to CI test matrix`

**Estimated bounty:** $100
**Risk of rejection:** Very low — this is clearly correct
**Effort:** ~30 minutes

**What:** The CI currently only tests on Node 22. The CLI's minimum supported version is Node 20 (declared in `package.json` engines and `.npmrc` engine-strict). Add Node 20 to the CI matrix so regressions on the minimum version are caught.

**Why it's genuine:**
- `engines: ">=20"` promises Node 20 support, but CI never actually tests it
- A future PR could easily break Node 20 compat (e.g., using a Node 22-only API)
- This is standard CI practice — test your minimum supported version
- The CONTRIBUTING.md says "development happens on Node 22" — all the more reason to CI-test 20

**Implementation:**
```yaml
# .github/workflows/ci.yml — add strategy.matrix
strategy:
  matrix:
    node-version: [20, 22]
steps:
  - uses: actions/setup-node@v5
    with:
      node-version: ${{ matrix.node-version }}
```

Apply to the `test` and `build` jobs (lint/typecheck can stay on 22 only since they don't test runtime behavior).

---

### PR #4: `docs(cli): document valid --status filter values for test list`

**Estimated bounty:** $100 (minimum)
**Risk of rejection:** Very low — documentation gaps are always welcome
**Effort:** ~30 minutes

**What:** `DOCUMENTATION.md` mentions `--status <list>` as a filter for `test list` but never documents what values are valid. The CHANGELOG mentions `blocked` as distinct from `failed`, and the code references `passed`, `failed`, `blocked`, `cancelled`, `queued`, `running`, `inconclusive`. Document these explicitly.

**Why it's genuine:**
- An agent parsing `test list --output json` needs to know what statuses to filter by
- The current docs say "filter by status" with no values listed — agents and humans both guess
- The CHANGELOG explicitly widened the status enum (added `blocked`) — the docs never caught up

**Implementation:**
- Add a "Valid status values" table to `DOCUMENTATION.md` under `test list`
- Cross-reference with `runs.types.ts` to get the canonical list

---

### PR #5: `feat(cli): add --since flag to test list for time-bounded queries`

**Estimated bounty:** $100–150
**Risk of rejection:** Medium — they may have this planned differently
**Effort:** ~1.5 hours

**What:** `test result --history` already supports `--since 24h|7d|ISO`, but `test list` doesn't. Add `--since` to `test list` so agents can query "tests created in the last 24h" or "tests modified since my last deploy."

**Why it's genuine:**
- Asymmetry: `test result --history` has `--since`, but `test list` doesn't
- In a CI/CD loop, an agent needs "what tests were added today?" without paginating everything
- Reduces API calls when the suite is large (only fetch recent tests)

**Implementation:**
- Add `--since` option to `test list` command in `src/commands/test.ts`
- Parse the same format as `test result --history` (relative: `24h`, `7d`; absolute: ISO)
- Pass as a query parameter to the API

---

### PR #6: `fix(cli): add Windows CI runner to test matrix`

**Estimated bounty:** $100–150
**Risk of rejection:** Low — the existing PR #4 from SahilRakhaiya05 ("restore full test suite on Windows") already shows this is a known gap, and it has "Changes requested"
**Effort:** ~1 hour

**What:** Add `windows-latest` to the CI matrix. The CLI uses `path.join`, `path.sep`, `os.homedir()` — all platform-dependent. CI currently only runs on `ubuntu-latest`.

**Why it's genuine:**
- PR #4 already tried this and got "Changes requested" — there's demand but the first attempt failed
- A correct implementation that actually passes would be valued
- The CLI uses `path.join` and `path.resolve` extensively — Windows path separators matter
- `~/.testsprite/credentials` path resolution differs on Windows

**Risk note:** SahilRakhaiya05's PR #4 has "Changes requested" — if you can see WHY it was rejected (maybe test failures on Windows paths), you can do it correctly.

---

## PRs to AVOID (too risky or too trivial)

| Idea | Why to skip |
|------|-------------|
| Whitespace/formatting | Explicitly called out as non-qualifying |
| Rename variables | Cosmetic, no functional change |
| "Add more tests" without fixing a bug | Padding |
| Splitting one fix into multiple PRs | They call this out in the rules |
| Anything touching the API contract | Too risky — they control the backend |
| Architecture refactors | Too opinionated, high rejection risk |

---

## Execution Strategy

1. **Wait for #10, #11, #12 to get reviewed.** Respond to comments immediately.
2. **Open PR #3 (Node 20 CI matrix) next** — it's 30 minutes, nearly zero rejection risk, and $100.
3. **Then PR #1 (shell completion)** — substantial, unique, high-value.
4. **PR #4 (docs)** as a quick win between larger PRs.
5. **PR #2 (--no-color flag)** only AFTER #12 merges.

**Total potential from this session:** 3 existing + 4 new = 7 PRs = $700–1,050 from the $2,000 pool.

---

## How to Execute Each PR

```bash
cd d:\testsprite-cli

# Create a new branch from main
git checkout main
git pull origin main
git checkout -b <branch-name>

# Make changes, then verify ALL CI gates
npm run lint:fix
npm run format
npm run typecheck
npm test

# Commit with Conventional Commits
git add <specific-files>
git commit -m "feat(cli): <description>"

# Push to your fork
git push -u fork <branch-name>

# Open PR on GitHub targeting TestSprite/testsprite-cli main
```

**CI gates (all must pass):**
- ESLint clean
- Prettier clean
- TypeScript `--noEmit` clean
- Vitest all passing
- Coverage ≥ 80% on lines/statements/functions/branches
- Build + smoke test (`node dist/index.js --version` + `--help`)
