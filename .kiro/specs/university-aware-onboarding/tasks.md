# Implementation Plan: University-Aware Onboarding & Personalization

## Overview

This plan delivers the feature in three phases that each end in a working, demoable increment. Phase 1 establishes the schema, onboarding identity capture, and manual document ingestion that surfaces real academic dates in the planner — fully usable without any scraping. Phase 2 adds the durable job queue, the SSRF-guarded scrape client, and automated official-source discovery. Phase 3 adds cognitive-load-aware planning, academic RAG, and resilience (sweeper, term refresh, fallbacks).

It reuses the existing ingestion pipeline (`rag/parser.ts`, `rag/chunker.ts`, `rag/embedder.ts`, `paper_chunks`), `match_paper_chunks`, dual-mode `queryRag()`, `lib/ssrf.ts`, and the exam-date-aware `planner.ts`. New user-owned tables get RLS matching migrations 001/003.

> Implementation constraint (AGENTS.md): this is a modified Next.js 16 build. Before writing any code, read the relevant guides in `node_modules/next/dist/docs/01-app/` (`02-guides/forms.md`, `authentication.md`, `data-security.md`, `caching-without-cache-components.md`, `how-revalidation-works.md`) and heed deprecation notices. This version uses Cache Components.

## Tasks

### Phase 1 — Identity, manual ingestion, planner surfacing

- [x] 1. Database schema and types
  - [x] 1.1 Create migration `007_university_onboarding.sql`
    - Create `universities`, `faculties`, `programs` (registry, authenticated-read / admin-write).
    - Create `academic_profiles`, `academic_sources`, `academic_events` (nullable dates), `curriculum_courses` — all user-owned with RLS `user_id = auth.uid()`.
    - Add `academic_kind` and `academic_profile_id` columns to `papers`.
    - Add CHECK constraints for enums (event_type, source_type, status, term_kind) and confidence range 0.0–1.0.
    - _Requirements: 1.4, 1.6, 2.1, 4.3, 7.4, 8.2, 9.1, 17.1, 17.3_
  - [x] 1.2 Update Supabase TypeScript types and shared interfaces
    - Add types for AcademicProfile, AcademicEvent, CurriculumCourse, AcademicSource, ConfidenceStatus.
    - _Requirements: 1.4, 9.3_
  - [x] 1.3 Checkpoint — verify migration applies and RLS isolates users
    - Insert sample rows under two users; confirm cross-user reads are blocked.

- [x] 2. Onboarding wizard, identity persistence, and registry
  - [x] 2.1 Seed the University_Registry and implement the fuzzy-match helper
    - Create `lib/university-registry.ts` (pure) with diacritic-insensitive, alias-aware matching.
    - Seed METU/ODTÜ + Electrical & Electronics Engineering with verified domain + calendar/curriculum URLs.
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 2.2 Implement onboarding validation helpers (pure)
    - `validateIdentity()` (required university/year/term, year range, term kind), `normalizeName()`.
    - _Requirements: 1.5, 2.3_
  - [x]* 2.3 Property tests for registry match and identity validation
    - **Property: Registry alias match** — "Orta Doğu", "ODTÜ", "METU" resolve to one university id.
    - **Property: Identity validation** — accepted iff required fields present and year within bounds.
    - **Validates: Requirements 2.3, 1.5**
  - [x] 2.4 Implement `saveAcademicIdentity()` server action + onboarding gate
    - Persist Academic_Profile (registry ids + raw text), set `onboarding_status='discovering'`, enqueue discovery (no-op queue acceptable until Task 7).
    - Add gate in app layout/dashboard routing profile-less users to `/app/onboarding`.
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 3.1, 17.4_
  - [x] 2.5 Build the onboarding wizard UI (`/app/onboarding`)
    - Pixel-UI multi-step form: Institution (autocomplete) → Faculty/Dept → Year/Term → optional courses → optional upload.
    - _Requirements: 1.2, 1.3, 2.4, 2.5_

- [x] 3. Manual academic-document ingestion (reuse pipeline)
  - [x] 3.1 Extend ingestion to tag academic documents
    - Add an `academic_kind` + `academic_profile_id` to the existing upload/URL ingest path; reuse parse→chunk→embed unchanged.
    - Detect <20-char (scanned) PDFs and mark for manual handling.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 3.2 "My academic documents" UI panel
    - List ingested academic docs with kind + parse status (reusing the existing status pattern).
    - _Requirements: 6.3, 11.1_

- [x] 4. Grounded academic date extraction
  - [x] 4.1 Implement `lib/academic-extract.ts` (pure)
    - TR/EN month + term normalization to canonical event types; date parsing; grounding check (verbatim line must exist); term-window validation.
    - _Requirements: 7.1, 7.2, 7.3, 7.6_
  - [x]* 4.2 Property tests for extraction
    - **Property: No ungrounded date** — a date not present verbatim in source is never emitted.
    - **Property: Locale normalization** — Turkish/English month/term tokens map to canonical types.
    - **Property: Term-window guard** — out-of-window dates require Tier-1 corroboration.
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.6**
  - [x] 4.3 Implement `extractAcademicEvents()` server action
    - Strict Groq prompt ("extract only dates present; return verbatim line"); validate via `academic-extract`; write Academic_Events; missing finals → NULL + `unreleased`.
    - _Requirements: 7.1, 7.4, 7.5_

- [x] 5. Source ranking, confidence, and review screen
  - [x] 5.1 Implement `lib/source-ranking.ts` (pure)
    - Domain audit (official iff on/under university primary domain); tier→confidence; confidence→status; conflict resolution rules.
    - _Requirements: 5.2, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_
  - [x]* 5.2 Property tests for source ranking
    - **Property: Tier classification** — registrar/faculty/dept/syllabus map to tiers 1–4.
    - **Property: Status thresholds** — ≥0.95→verified, 0.60–0.95→inferred, else unreleased.
    - **Property: Conflict resolution** — highest tier wins; syllabus wins for its own course; ties keep alternative.
    - **Validates: Requirements 9.1, 9.3, 10.1, 10.2, 10.3**
  - [x] 5.3 Review & Confirm screen + `confirmAcademicData()`
    - Group events/courses by status; edit/accept/remove; show conflict alternatives; set `onboarding_status='complete'`.
    - _Requirements: 9.4, 10.4, 11.1, 11.2, 11.3, 11.4_

- [x] 6. Planner and dashboard surfacing
  - [x] 6.1 Extend `getWeeklyPlan()` to merge confirmed Academic_Events
    - Add academic deadline chips/warnings with status badges; never surface `unreleased` as concrete.
    - _Requirements: 13.1, 13.2, 13.4_
  - [x] 6.2 Dashboard academic-timeline widget
    - Next confirmed events chronologically with badges + explicit unreleased state.
    - _Requirements: 15.1, 15.2, 15.3_
  - [x] 6.3 Auto-create subject/topic + exam_date on confirm
    - From confirmed final period, create/update topic via existing `subjects.ts`.
    - _Requirements: 13.3_
  - [x] 6.4 Checkpoint — Phase 1 usable end-to-end via manual upload
    - Upload METU calendar → events extracted/labelled → planner & dashboard show real dates. Ensure tests pass.

### Phase 2 — Autonomous discovery

- [x] 7. Background job queue and processor
  - [x] 7.1 Create migration `008_ingestion_jobs.sql`
    - `ingestion_jobs` (job_type, status, payload, result, attempts, max_attempts, next_run_at, locked_at) + RLS + index `(user_id, status, next_run_at)`.
    - _Requirements: 12.1, 17.1_
  - [x] 7.2 Implement job state-machine helpers (pure)
    - Transition rules, retry/backoff, terminal-state detection.
    - _Requirements: 12.2, 12.4, 12.6_
  - [x]* 7.3 Property tests for job state machine
    - **Property: Eventual termination** — any job sequence reaches succeeded/skipped/failed.
    - **Property: Retry bound** — attempts never exceed max_attempts.
    - **Validates: Requirements 12.4, 12.6**
  - [x] 7.4 Implement `processNextJob()` + client polling hook
    - Claim one pending job, do one bounded unit, enqueue follow-ups; reuse the existing parse-status polling pattern.
    - _Requirements: 12.2, 12.3, 12.5_

- [x] 8. SSRF-guarded scrape/search client
  - [x] 8.1 Implement `lib/scrape-client.ts`
    - Provider-agnostic (Firecrawl/Tavily via fetch) with timeouts; all URLs via `ssrf.ts`; per-university domain allowlist; no-op "manual" provider when no key.
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  - [x]* 8.2 Tests for domain audit and SSRF behavior
    - **Property: Domain audit** — only on/under primary domain is "official".
    - Unit: private IP and off-domain URLs are rejected; untrusted content is never executed.
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 9. Automated discovery pipeline
  - [x] 9.1 Implement the `discover_sources` job
    - Registry hit → use known URLs; else locale-aware searches (TR "akademik takvim" / EN "academic calendar") scoped to official domain; classify + persist `academic_sources`.
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [x] 9.2 Wire the discovery → fetch → parse → extract job chain
    - Each step enqueues the next; gap in calendar triggers manual-upload fallback.
    - _Requirements: 4.4, 6.1, 7.4, 8.2_
  - [x] 9.3 Checkpoint — new ODTÜ/EEE user auto-populates review screen
    - No manual upload required; events/courses appear labelled. Ensure tests pass.

### Phase 3 — Smart planning, academic RAG, resilience

- [x] 10. Cognitive-load-aware planner
  - [x] 10.1 Implement `lib/academic-load.ts` (pure)
    - Load curve over weighted events + proximity; phase thresholds (baseline / escalation / mitigation).
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [x]* 10.2 Property tests for the load model
    - **Property: Proximity monotonicity** — load is non-decreasing as a deadline nears (fixed weights).
    - **Property: Bounded + phase mapping** — load stays finite; phase boundaries at the defined thresholds.
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**
  - [x] 10.3 Apply load to planner suggestions + messaging
    - Reweight suggestions and emit priority-shift warnings near midterms/finals.
    - _Requirements: 14.2, 14.3, 14.4_

- [x] 11. Academic RAG scope
  - [x] 11.1 Add the "academic" scope to `queryRag()` + date-question router
    - Filter `paper_chunks` by `academic_profile_id`/`academic_kind`; route date questions to Academic_Events; curriculum questions to cited chunks; explicit "unreleased/not found" answers.
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [x] 11.2 "Ask about my semester" entry point
    - Surface academic Q&A from dashboard/research with citations + status.
    - _Requirements: 16.2, 16.3_

- [x] 12. Resilience, term refresh, and hardening
  - [x] 12.1 Optional `pg_cron` + `pg_net` sweeper and term refresh (migration `009`)
    - Advance stalled jobs; re-attempt discovery at term boundaries.
    - _Requirements: 12.5, 18.4_
  - [x] 12.2 Edge-case fallbacks
    - CAPTCHA/401/403 → manual upload prompt; scanned PDF → request text PDF; quota exhausted → friendly manual fallback; stale-year detection; non-standard term kinds.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  - [x] 12.3 Final checkpoint — full integration verification
    - Closing a tab mid-discovery still completes via sweeper; quota exhaustion degrades gracefully. Ensure all tests pass.

## Notes

- Tasks marked `*` are optional property-test tasks (Vitest + fast-check) and can be deferred for a faster MVP.
- Each task references requirements for traceability; formal property definitions belong in `design.md` (recommended companion doc).
- The existing ingestion pipeline, `queryRag()`, `ssrf.ts`, and web research mode are reused, not modified in their core behavior.
- Never invent dates: ungrounded extractions are dropped; missing finals are `unreleased` with NULL dates.
- All new user-owned tables enforce RLS; registry tables are read-only to users.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.2", "5.2"] },
    { "id": 3, "tasks": ["2.5", "3.1", "4.3", "5.3"] },
    { "id": 4, "tasks": ["3.2", "6.1", "6.2", "6.3"] },
    { "id": 5, "tasks": ["7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3", "7.4", "8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["10.3", "11.1"] },
    { "id": 11, "tasks": ["11.2", "12.1", "12.2"] }
  ]
}