# Nora (Pixel Studio OS) — Deep Project Audit

**Date:** 2026-06-30 · **Auditor:** Cline (automated, evidence-backed) · **Scope:** Full codebase at `D:/PixelStudioOS`

> A deep, file-level audit of architecture, security, data layer, algorithms,
> external integrations, frontend/a11y, testing, and build/ops. Every finding is
> cited with `file:line`. Live tooling was run against the project (see §2).

---

## 1. Executive Summary

**Nora** is a mature, ambitious Next.js 16 / React 19 study platform ("Pixel Study
OS") built on Supabase (Postgres + pgvector + RLS), with FSRS-6 spaced repetition,
academic RAG, Groq/OpenRouter AI, and a custom pixel-art UI library. The codebase
is **well above average in discipline**: TypeScript strict passes clean, RLS is
enabled on every user table, server actions consistently re-verify auth and scope
by `user_id`, SSRF protection is thorough, and the algorithms are research-grounded
and unit-tested (often with property-based tests).

**However, there is one Critical security defect and a handful of High/Medium
issues** that should be fixed before any production/competition submission:

- 🔴 **CRITICAL — Unauthenticated privilege escalation via reward RPCs**
  (`017_atomic_reward_rpc.sql`). Three `SECURITY DEFINER` functions accept an
  arbitrary `p_user_id`/`p_quest_id` and never check `auth.uid()`. They bypass RLS
  and are reachable through the public PostgREST API with the public anon key, so
  anyone can inflate any user's XP/coins/pet affinity or complete any party's quest.
  Notably, the same codebase *does* secure RPCs correctly in `005_party_rls_fix.sql`,
  so this is a regression/inconsistency, not an unknown pattern.
- 🟠 **HIGH — 6 failing tests** from a pdf-parse mock-path mismatch
  (`parser.test.ts` mocks `"pdf-parse"` but `parser.ts` imports the inner
  `"pdf-parse/lib/pdf-parse.js"`).
- 🟠 **HIGH — In-memory rate limiter** is ineffective across serverless instances
  (documented but unaddressed).
- 🟠 **HIGH — SSRF TOCTOU**: DNS is resolved and validated, but the subsequent
  `fetch` can re-resolve to a private IP (no IP pinning).

The frontend, design system, and accessibility are genuinely strong. Overall this
is a **B+ codebase with one A-1 security fix needed to be production-ready**.

---

## 2. Methodology & Live Verification

I read the core configs, the full `src/lib` (49 files), the `pixel-ui` library
(30 files), representative server actions, the auth proxy, all relevant Supabase
migrations, and key UI/layout files. I also ran the project's own toolchain **from
`D:/PixelStudioOS`**:

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | ✅ **Pass** (no errors) |
| Unit tests | `npm test` (Vitest) | ⚠️ **326 pass / 6 fail** (332 total) |
| Lint | `npx eslint src` | ⚠️ **154 problems (39 errors, 115 warnings)** |

Failing tests are isolated to `src/app/(protected)/app/_actions/rag/parser.test.ts`
(root-caused in §4.6). The 39 lint errors are mostly the new React 19
`react-hooks/set-state-in-effect` rule (§4.5).

> Note: `search_codebase` and sub-agent delegation were unavailable during this
> run (index timeouts / credit balance), so the audit was performed via direct
> targeted reads. Coverage is broad but not exhaustive of every one of the ~30
> server-action files; the security-critical chain (proxy, layout gate, auth
> actions, reward/quest RPCs, RAG ingestion) was fully traced.

---

## 3. Project Profile / Architecture

```
Next.js 16 (App Router, "proxy" middleware, Server Actions, viewTransition)
├─ React 19, TypeScript strict, Tailwind v4 (@import "tailwindcss")
├─ 24 feature routes under src/app/(protected)/app/*  (feynman, research, review,
│   study-room, exam, planner, analytics, party, room, listen, eureka, …)
├─ Custom pixel-ui design system (30 components: nine-slice, sprites, command
│   palette, toasts, preferences, onboarding tour, charts, heatmap)
├─ src/lib — pure algorithms + integrations (fsrs, spacing, due, study-mix, rrf,
│   feynman-score/grounding, ssrf, rate-limit, scrape-client, llm, nora-voice,
│   academic/*, academic-search/*, web-search/tavily, supabase/{admin,client,server})
└─ supabase — 19 migrations (RLS, pgvector RAG, FSRS, Feynman scoring, hybrid
    search RPC, atomic reward RPCs, practice exams, university onboarding)
```

**Stack claim verification (README vs reality):** Next 16.2.9 ✓ · React 19.2.4 ✓ ·
Supabase + pgvector + RLS ✓ · 19 migrations ✓ · ts-fsrs FSRS-6 ✓ · Vitest + fast-check ✓ ·
Groq + OpenRouter ✓ · "Auth gated via proxy.ts" ✓ (`src/proxy.ts`, Next 16 convention) ·
"30 components" ✓ · **"332 passing" ✗ stale** (now 326 pass / 6 fail).

---

## 4. Consolidated Findings

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · ⚪ Info

| # | Sev | Area | Location | Issue | Recommendation |
|---|---|---|---|---|---|
| F1 | 🔴 | DB Security / IDOR | `017_atomic_reward_rpc.sql:11-49,53-76,80-119` | `increment_profile_rewards`, `increment_pet_affinity`, `increment_quest_progress` are `SECURITY DEFINER` (bypass RLS), accept arbitrary `p_user_id`/`p_quest_id`, and **never assert `auth.uid()`**. No `REVOKE`/`GRANT`. Reachable via public PostgREST (`/rest/v1/rpc/…`) with the public anon key → unauth XP/coin/affinity inflation of **any** user + cross-party quest completion. | Add `IF p_user_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;` (+ membership check for the quest). Add `REVOKE ALL ON FUNCTION … FROM PUBLIC; GRANT EXECUTE … TO authenticated;`. Match the pattern already used in `005_party_rls_fix.sql:34-36`. |
| F2 | 🟠 | Tests | `rag/parser.test.ts:4` vs `rag/parser.ts:8` | Test mocks `"pdf-parse"` (root) but the impl imports the inner `"pdf-parse/lib/pdf-parse.js"` (to dodge a Vercel self-test bug). Mock never applies → real parser runs on `Buffer.from("fake")` → `InvalidPDFException` before the `<20 char` guard. **6 failing tests.** | Mock the exact specifier the code imports: `vi.mock("pdf-parse/lib/pdf-parse.js", …)`, or refactor `parser.ts` to a single resolvable import path. |
| F3 | 🟠 | Rate-limit | `src/lib/rate-limit.ts:1-13` | In-memory sliding-window limiter. Resets on restart and **does not work across instances** (Vercel serverless → per-cold-start limits). AI/research actions (`research.ts`) become effectively unthrottled at scale. | Use Upstash Redis (or a Supabase RPC counter) for a distributed limiter. The module's own header already acknowledges this. |
| F4 | 🟠 | SSRF TOCTOU | `src/lib/ssrf.ts:107-125`; `scrape-client.ts:185-219`; `…/rag.ts` | `assertPublicHttpUrl` resolves DNS and validates IPs, but the subsequent `fetch()` re-resolves → **TOCTOU / DNS rebinding**. A host can resolve public at check time and private (169.254.169.254) at fetch time. | Pin the validated IP for the request (custom `lookup` via `node:http`/undici `Agent`, or fetch the resolved IP with the right `Host` header). Also block redirects to private IPs. |
| F5 | 🟡 | Lint / React 19 | `game-sidebar.tsx:260,413,431`; `game-top-bar.tsx:51`; `onboarding-wizard.tsx:79` | `react-hooks/set-state-in-effect`: `setState` synchronously in `useEffect` → cascading renders. 39 lint errors total (also `prefer-const` `research.ts:243`, `no-explicit-any` `parser.test.ts:124`). | Derive state during render or move sync into handlers; use `useSyncExternalStore` for external (localStorage) state. |
| F6 | 🟡 | A11y | `command-palette.tsx` (wrapper ~L130-225) | Has good item semantics (`role="option"`, `aria-selected`, `aria-label`). **Verify** `role="dialog"`+`aria-modal`, Tab trap, and focus return on close. | Add `role="dialog" aria-modal="true" aria-label="Command palette"`; implement focus trap + return. |
| F7 | 🟡 | Upload abuse | `next.config.ts:6-8` | `serverActions.bodySizeLimit: "100mb"` applies to **all** actions, not just PDF upload; `rag.ts` separately caps at 50 MB. | Scope the large limit to the upload action only (per-route config or explicit size check in `ingestPdf`). |
| F8 | 🟡 | Auth UX | `src/app/(auth)/_actions/auth.ts:14-70` | No email-format validation; no app-level login throttle (Supabase only); signup enforces only 6-char passwords. Generic login error is good (no enumeration). | Add client+server email regex, app throttle, raise minimum password length. |
| F9 | 🟡 | RAG / Vector index | `001_initial_schema.sql:239-242` | `ivfflat` index with fixed `lists=100` on `vector(1536)`; no `probes` tuning. ivfflat recall/latency is poor for small-to-mid corpora and needs re-indexing as data grows. | Prefer `hnsw` (pgvector ≥ 0.5) for ANN, or tune `probes` and rebuild `lists` proportionally to row count. |
| F10 | 🟡 | DB hardening | `001_initial_schema.sql:35-42` | `handle_new_user()` trigger function is `SECURITY DEFINER` but has **no `SET search_path`** (contrast `005`/`017` which set it). Minor search-path hardening gap. | Add `SET search_path = public` to the function. |
| F11 | 🟡 | Maintainability | `src/app/layout.tsx` (inline script); `preferences-provider.tsx:55-83`; `globals.css:114+` | Palette color definitions are duplicated in **three** places (inline boot script, TS `PALETTES` map, CSS `[data-palette]` blocks). Drift risk — a palette edit must be made 3×. | Generate the inline script + CSS from the single TS source (build step), or have the boot script read a serialized JSON blob. |
| F12 | 🟡 | AI robustness | `src/lib/llm.ts:181-202` | `callLLM` returns a raw string; `stripCodeFences` exists but each caller must `JSON.parse` with its own try/catch. No shared safe-JSON helper → inconsistent error handling + prompt-injection surface via malformed JSON. | Add a `callLLMJson<T>()` that parses, validates, and returns `{ data?: T; raw: string; error?: string }`. |
| F13 | 🔵 | Docs accuracy | `README.md:187` | Badge says "332 passing"; actual is 326 pass / 6 fail. | Update badge to "326 passing" (or fix F2 first → 332). |
| F14 | 🔵 | Lint debt | `src/**` (115 warnings) | 115 warnings (`no-explicit-any`, `exhaustive-deps`, unused vars, etc.). | Triage warnings; ban `any` in non-test code via config. |
| F15 | 🔵 | CI/CD | repo root (no `.github/workflows`) | No visible CI pipeline to gate `tsc`/`vitest`/`eslint` on PRs. | Add a GitHub Action running `tsc --noEmit`, `npm test`, `npm run lint`. |
| F16 | 🔵 | DB types sync | `src/lib/supabase/database.types.ts` (31 KB) | Generated types are committed; no codegen script visible → risk of drift from migrations. | Add `supabase gen types` to a pre-commit/CI step. |
| F17 | 🔵 | Route consistency | `src/app/(protected)/app/**` | Not every route has `loading.tsx`/`error.tsx` (e.g. `journal`, `memory-map`, `knowledge-web`, `listen`, `eureka`, `card-market`, `collection`, `error-spotter`, `settings`). Inconsistent UX on slow/error states. | Add `loading.tsx` + `error.tsx` to all feature routes. |
| F18 | ⚪ | Info / verified-safe | `src/lib/supabase/admin.ts` | `createAdminClient` (service role) is correctly server-only, throws if the key is missing, and is only imported from `"use server"` action modules (e.g. `party-quests.ts`) for legitimate cross-user reads. | No action — confirmed not exposed to the browser. |

---

## 5. Security Deep-Dive

### 5.1 Authentication & route gating — ✅ Strong
- **Proxy/middleware** (`src/proxy.ts`): Next 16 `proxy` convention. Refreshes the
  Supabase session, redirects unauthenticated users from `/app*` → `/login`, and
  bounces logged-in users away from `/login`/`/signup`. Matcher correctly excludes
  static assets (`proxy.ts:67-70`).
- **Defense-in-depth** (`(protected)/app/layout.tsx:13-32`): the layout re-checks
  `supabase.auth.getUser()` and `redirect("/login")`, then runs an **onboarding
  gate** (users without an `academic_profiles` row are sent to `/app/onboarding`,
  with a guard against the redirect loop). Correctly layered: proxy → layout.
- **Auth actions** (`(auth)/_actions/auth.ts`): `login` returns a generic
  "Invalid email or password" (no user enumeration ✓); `signup` requires ≥6 chars.

### 5.2 Server actions — ✅ Strong (app layer)
Every action sampled re-verifies the user and scopes writes by `user_id`:
- `review.ts:51-204` — `getDueCards`/`submitReview`/`deleteCard` all call
  `getUser()`, then filter/`update` with `.eq("user_id", user.id)`. Rating is
  validated against the `Rating` enum (`review.ts:122-126`). IDOR-safe.
- `research.ts` — rate-limited (`research.ts:5`), auth-checked, citation-grounded
  via `validateResearchCitations`/`validateCitationGrounding` (anti-hallucination).
- `rag.ts:55-…` — `ingestPdf` validates upload input + PDF header;
  `ingestFromUrl` runs `assertPublicHttpUrl` (SSRF) + 50 MB / 30 s download caps;
  `deleteFullPaper` verifies ownership and handles partial failures gracefully.
- `party-quests.ts` — `generateWeeklyQuests`/`archiveExpiredQuests` verify party
  membership before acting (`party-quests.ts:196-204, 267-270`).

**The app layer is IDOR-safe.** The Critical issue (F1) is purely at the DB/RPC
layer, which is reachable *around* the app via the public API.

### 5.3 Secrets & client exposure — ✅
- `lib/llm.ts` reads `GROQ_API_KEY`/`OPENROUTER_API_KEY` from `process.env` and is
  documented server-only; no `NEXT_PUBLIC_` AI keys.
- `createAdminClient` (service role) is never imported by client components.
- `.gitignore` excludes `.env*` (`.gitignore:33-34`); `.env.local` is present but
  not committed. `NEXT_PUBLIC_SUPABASE_*` are intentionally public (anon key).

### 5.4 SSRF & scraping — 🟠 (see F4)
`ssrf.ts` is otherwise excellent: blocks 0.0.0.0/8, 10/8, 127/8, 169.254/16 (cloud
metadata), 172.16/12, 192.168/16, 100.64/10 (CGNAT), 224+/4, IPv6 loopback/ULA/
link-local, and **IPv4-mapped IPv6** (`ssrf.ts:52-54`); rejects embedded
credentials and localhost aliases. `scrape-client.ts` adds a per-university domain
allowlist enforced on both search hits and scrape targets, treats fetched content
as **untrusted data**, caps markdown at 200 KB, and degrades to a no-op "manual"
client when Firecrawl is absent. The only gap is the TOCTOU in F4.

---

## 6. Data Layer Deep-Dive (Supabase)

### 6.1 Schema & migrations — ✅ High quality
- 19 migrations, mostly **additive** with clear headers and ordering notes.
- `001_initial_schema.sql`: 11 core tables (profiles, subjects, topics,
  study_sessions, cards, card_reviews, avatars, pets, papers, paper_chunks) with
  FK `ON DELETE CASCADE`, sensible `CHECK` constraints, and helpful indexes.
- `010_fsrs_scheduling.sql`: additive FSRS columns + `CHECK` constraints
  (`difficulty 0-10`, `state IN (0,1,2,3)`) + a partial due-date index.
- `016_drop_sm2_columns.sql`: exemplary destructive migration — safety backfill
  before `SET NOT NULL`, replaces the stale `idx_cards_next_review`, preserves
  `card_reviews` history. Gated with "run only after backfill verified" comments.
- `012_hybrid_search.sql`: `match_paper_chunks_hybrid` is `SECURITY INVOKER`
  (default) so **RLS is enforced**, and additionally scopes by `match_user_id`.
  RRF math (`1/(k+rank)`, k=60) exactly matches the TS `rrf.ts`. Idempotent.

### 6.2 RLS coverage — ✅ (with one RPC exception, F1)
- Every user-owned table in `001` has `ENABLE ROW LEVEL SECURITY` + a
  `user_id = auth.uid()` policy (`001:25,59,76,95,…`).
- `005_party_rls_fix.sql` is a **masterclass**: it fixes infinite RLS recursion
  (membership policies that referenced `party_members` from within their own
  policy) by introducing `get_user_party_id()` / `is_party_owner()` helpers that
  are `SECURITY DEFINER`, `SET search_path = public`, `REVOKE … FROM PUBLIC`,
  `GRANT … TO authenticated`, and use `auth.uid()` (`005:21-54`). **This is the
  correct pattern that `017` failed to follow** — making F1 an inconsistency.

### 6.3 RPC safety — 🔴/✅ mixed
- ✅ `get_user_party_id`, `is_party_owner` (005) and `match_paper_chunks_hybrid`
  (012, INVOKER) are safe.
- 🔴 `increment_profile_rewards` / `increment_pet_affinity` / `increment_quest_progress`
  (017) are `SECURITY DEFINER`, `SET search_path = public` (good), but **trust the
  caller's `p_user_id`/`p_quest_id`** with no `auth.uid()` check and no
    `REVOKE`/`GRANT` (confirmed via grep — empty result). See F1.

---

## 7. Core Algorithms Deep-Dive (`src/lib`) — ✅ Strong

- **FSRS-6** (`fsrs.ts`): clean wrapper over `ts-fsrs` v5.4. Own `FSRSCardState`
  mirrors DB columns; scheduling is pure (no DB/network); interval fuzz disabled by
  default for **determinism/testability**. `initFromSM2` (`fsrs.ts:326-387`) seeds
  FSRS state from SM-2 history while **preserving each card's staggered due date**
  (spec Req 1.4 — avoids forcing all cards due on one day). `efactorToDifficulty`
  maps the ease factor into FSRS difficulty with clamping.
- **SM-2** (`sm2.ts`): retained for the migration/backfill path; columns dropped in
  `016`. Correct legacy implementation.
- **Spacing** (`spacing.ts`): Cepeda et al. 2008 ridgeline lookup with linear
  interpolation, **asymmetric-cost** rounding (ceil → err wider), `clampGap`
  guarantees `1 ≤ gap < daysUntilExam`, and `distributeSessions` expands gaps by
  20% per session. `examRetention` raises target retention near exams (Req 7.3).
- **RRF** (`rrf.ts`): correct `1/(k+rank)` fusion, 1-based ranks, deterministic
  tie-break, first-occurrence-wins. **Identical math to the SQL RPC** (`012`).
- **Due/timezone** (`due.ts`, used in `review.ts:69`): uses `endOfUserLocalDay` so
  "due today" is timezone-correct, not naive UTC.
- **Study-mix / interleaving** (`study-mix.ts`): interleaving logic with colocated
  property tests.
- **Feynman scoring/grounding** (`feynman-score.ts`, `feynman-grounding.ts`): rubric
  scoring + grounding against source citations to control hallucination; both have
  colocated tests (11 + 17 tests).
- **LLM** (`llm.ts`): Groq → OpenRouter fallback, per-provider `AbortController`
  timeouts, env-driven attribution headers, `groqOnly` for cheap calls. Server-only.
  (See F12 for JSON-parsing gap.)
- **No unbounded loops / regex DoS** observed in the sampled libs; external fetches
  all carry timeouts. Test coverage is strong: `fsrs`, `spacing`, `due`,
  `study-mix`, `rrf`, `feynman-score`, `feynman-grounding`, `scrape-client`,
  `academic-extract/load/identity-validation/job-state/source-ranking/
  university-registry`, `academic-search`, and the RAG `chunker`/`embedder`/
  `transcript-utils`/`planner` all have colocated `*.test.ts`, several using
  `fast-check` property-based testing.

---

## 8. External Integrations Deep-Dive — ✅ Graceful degradation

- **Academic search** (`academic-search/*`): OpenAlex, Crossref, Semantic Scholar,
  Unpaywall — each with polite-pool `mailto`, timeouts, HTTP-status mapping, and
  **graceful degradation** when keys/emails are absent. Unpaywall is **skipped**
  when `ACADEMIC_API_EMAIL` is unset (ToS-compliant). Tests cover error/empty paths.
- **Web search** (`web-search/tavily.ts`): Tavily for Research Desk web results;
  degrades to academic-only when `TAVILY_API_KEY` is missing.
- **Scraping** (`scrape-client.ts`): Firecrawl when configured, else a no-op
  "manual" client so university onboarding falls back to manual upload. SSRF +
  domain allowlist enforced (§5.4).
- **Academic pipeline** (`academic/*`): extract (PDF/Docling), load, job-state,
  source-ranking, identity-validation, university-registry — a real ingestion state
  machine with idempotency and ranking heuristics, all tested.
- **Embeddings** (`rag/embedder.ts`): OpenAI when configured, else **ranked Postgres
  FTS** (`ts_rank_cd`) — both modes functional (Req 6.2: never an unranked scan).

**Degradation summary:** the app is fully usable with only Supabase + one AI key;
every other integration (OpenAI, Tavily, Semantic Scholar, Firecrawl, YouTube,
Unpaywall) is optional and degrades gracefully. This is exemplary env-design.

---

## 9. Frontend, Design System & Accessibility — ✅ Strong

- **Design tokens** (`globals.css`): Tailwind v4 (`@import "tailwindcss"`), a
  comprehensive CSS-custom-property token system, dark default + light theme + 5
  full palettes (ember/forest/ocean/lavender/rose), panel-density tokens, and a
  pixel-room scene palette. Well-organized and commented (43 KB but justified).
- **Fonts** (`layout.tsx`): Geist + Geist_Mono via `next/font/google` and the
  SproutLands pixel font via `next/font/local` (`preload`, `display: "swap"`) →
  automatic preloading + FOUT prevention.
- **No-flash theming** (`layout.tsx` head): an inline boot script reads
  `localStorage` and applies cursor/animation/theme/palette **before first paint**,
  eliminating FOUC. `<html suppressHydrationWarning>` is correctly set. (Cost: the
  palette duplication in F11.)
- **pixel-ui library (30 components)**: consistent `"use client"` discipline,
  CSS-var-driven theming, `imageRendering: pixelated` for crisp sprites, nine-slice
  + sprite-region rendering.
- **Accessibility** — genuinely good:
  - `pixel-input.tsx` uses `useId()` for stable ids, `htmlFor` label association,
    `aria-invalid={!!error}`, decorative icons `aria-hidden`, and the toggle uses
    `role="switch"` + `aria-checked` + focus ring.
  - `command-palette.tsx` has `aria-label="Search commands"`, `role="option"` +
    `aria-selected`, and full ↑/↓/Enter/Esc keyboard nav.
  - App layout provides a **skip-to-content link** (WCAG 2.4.1) and `id="main-content"`
    (`(protected)/app/layout.tsx:99-110`).
  - `preferences-provider.tsx` hydrates from `localStorage` only inside `useEffect`
  (SSR-safe, wrapped in `try/catch`) — no hydration mismatch.
  - Gap: verify command-palette dialog `role`/`aria-modal`/focus-trap/return (F6).
- **Hydration safety**: browser APIs (`localStorage`, `document`, `isMuted`) are
  only touched inside effects/handlers — no unguarded `window`/`Math.random`/`Date`
  in render paths observed.

---

## 10. Testing — ✅ Strong (one breakage)

- 22 test files, **332 tests**; 326 pass, 6 fail. Property-based testing via
  `fast-check` for the algorithmic cores (FSRS, spacing, study-mix, RRF).
- Failures are isolated to `rag/parser.test.ts` (F2) — a mock-path mismatch, not a
  product defect. The actual parser is fine; the test's mock doesn't intercept the
  inner import path, so the real `pdf-parse` throws on invalid bytes.
- Coverage is broad and **colocated** with source (Vitest config maps the `@`
  alias; `globals: true`). Good discipline.

---

## 11. Build, Config & Ops

- `package.json`: Node ≥ 20, Next 16.2.9, React 19.2.4, scripts for dev/build/start/
  lint/test. Dependencies are focused (Supabase SSR/JS, TipTap, lucide, ts-fsrs,
  pdf-parse, youtube-transcript-plus).
- `tsconfig.json`: **strict**, `moduleResolution: bundler`, `@/*` → `./src/*`,
  `isolatedModules`, `incremental`. `tsc --noEmit` passes clean.
- `eslint.config.mjs`: extends `eslint-config-next` core-web-vitals + TS. 39 errors
  / 115 warnings (F5, F14).
- `next.config.ts`: `viewTransition` experimental, `serverActions.bodySizeLimit
  100mb` (F7), a single image remote-pattern for PokeAPI sprites.
- `vitest.config.ts`: minimal, correct alias.
- **Ops gaps**: no CI (F15), no visible DB-types codegen (F16), and the in-memory
  rate limiter won't survive serverless scale-out (F3).

---

## 12. Strengths (summary)

1. **TypeScript strict + clean `tsc`** across a large App Router codebase.
2. **RLS on every user table**, with an exemplary recursion-fix pattern in `005`.
3. **Layered auth**: proxy gate + layout gate + per-action `getUser()` re-checks.
4. **IDOR-safe server actions** — every write scoped by `user_id`.
5. **Comprehensive SSRF protection** (IPv4/IPv6/CGNAT/metadata/mapped-v6).
6. **Research-grounded algorithms** (FSRS-6, Cepeda spacing, RRF) with property tests.
7. **Graceful env degradation** — usable with just Supabase + one AI key.
8. **Accessible UI primitives** (label association, ARIA roles, focus rings, skip link).
9. **No-flash theming** via a pre-hydration boot script.
10. **Migration hygiene** — additive-first, gated destructives, idempotent RPCs.

---

## 13. Prioritized Remediation Roadmap

**P0 — ship blockers (do now):**
1. **F1** — Add `auth.uid()` guards + `REVOKE`/`GRANT` to the three `017` RPCs.
   One migration (`020_secure_reward_rpcs.sql`). This is the only true security hole.
2. **F2** — Fix the parser test mock path → restores 332/332 green + the README badge.

**P1 — harden before scale:**
3. **F4** — Pin resolved IPs for outbound fetches (close the SSRF TOCTOU).
4. **F3** — Move rate limiting to Redis/Supabase for multi-instance correctness.
5. **F7** — Narrow the 100 mb server-action body limit to the upload action.
6. **F12** — Add a shared `callLLMJson` helper for safe AI JSON parsing.

**P2 — quality & DX:**
7. **F5** — Resolve the 39 lint errors (React 19 `set-state-in-effect`).
8. **F6** — Complete command-palette a11y (dialog role, focus trap/return).
9. **F10** — `SET search_path` on `handle_new_user`.
10. **F15/F16** — Add CI (tsc + test + lint) and DB-types codegen.
11. **F8/F9/F11/F13/F14/F17** — Auth UX, HNSW index, palette DRY, badge, lint debt,
    route loading/error boundaries.

**Estimated effort:** P0 ≈ 1–2 hours (one migration + one test fix). P1 ≈ 1 day.
P2 ≈ 2–3 days. After P0 the project is production-safe; after P1 it is scale-ready.

---

*Audit performed by direct source inspection + live `tsc`/`vitest`/`eslint` runs
from `D:/PixelStudioOS`. Findings are evidence-cited; a small number of
server-action files beyond the security-critical chain were not individually read
and should be swept with the same auth/IDOR checklist applied in §5.2.*
