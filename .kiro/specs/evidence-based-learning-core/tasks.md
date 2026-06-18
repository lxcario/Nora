# Evidence-Based Learning Core — Implementation Tasks

Each task is incremental, test-driven, and ends with a working demo. Tasks build on prior
ones and wire into the app — no orphaned code.

## Phase 1 — FSRS Scheduling Foundation

- [ ] **Task 1: Add `ts-fsrs` and the pure FSRS module**
  - Add `ts-fsrs` (MIT) to package.json; confirm Node >= 20 in engines.
  - Create `src/lib/fsrs.ts`: `scheduleReview(state, rating, now)` and types.
  - Unit + property tests (FSRS-1): monotonic stability, due > now, lapse → relearning.
  - _Demo:_ `npm test` shows FSRS scheduling passing for all four ratings.

- [ ] **Task 2: FSRS schema migration + backfill**
  - Write `010_fsrs_scheduling.sql` (additive columns).
  - Create `src/lib/fsrs.ts#initFromSM2(history)`; backfill script reads `card_reviews`.
  - Property test (FSRS-2): no NaN/negative; not all-due-same-day.
  - _Demo:_ Run migration on a seed DB; existing cards show populated FSRS state.

- [ ] **Task 3: Timezone-safe due logic**
  - Create `src/lib/due.ts` (`isDueToday`, `endOfUserLocalDay`) using `profiles.timezone`.
  - Property test (DUE-1).
  - _Demo:_ Card due 23:59 local is due today under multiple server TZ settings in tests.

- [ ] **Task 4: Wire FSRS into review flow**
  - Update `review.ts#submitReview` to call `scheduleReview` and write FSRS columns;
    keep SM-2 write during transition.
  - `getDueCards` uses `due` + timezone helper.
  - _Demo:_ Reviewing a card updates FSRS `due`; due queue respects timezone.

- [ ] **Task 5: 4-button grading + intra-session relearning**
  - Update `review-session.tsx` to Again/Hard/Good/Easy; map to `Rating`.
  - Again re-queues the card within the session.
  - _Demo:_ A lapsed card reappears before session end; four buttons schedule correctly.

## Phase 2 — Hybrid RAG Retrieval

- [ ] **Task 6: Hybrid RRF database function**
  - Write `012_hybrid_search.sql`: ensure `content_tsv` GIN index; create
    `match_paper_chunks_hybrid` (lexical `ts_rank_cd` + vector RRF). Guard optional BM25.
  - SQL test (RAG fusion ordering) on known rows.
  - _Demo:_ Calling the RPC returns fused, correctly-ordered chunks.

- [ ] **Task 7: Route RAG through hybrid retrieval**
  - Update `rag.ts#queryRag` to call the hybrid RPC; FTS-only mode uses ranked lexical CTE.
  - Build citations from real returned rows (remove chunkIndex=0 fallback).
  - Property test (RAG-1): every citation resolves to a chunk.
  - _Demo:_ Ask a question about an indexed paper using an exact term; correct passage cited.

## Phase 3 — Grounded Research Desk

- [ ] **Task 8: Academic-search API clients**
  - Create `src/lib/academic-search/{openalex,crossref,unpaywall}.ts`, server-only,
    via SSRF guard + rate-limit, `mailto`/`email` from env.
  - Unit tests with mocked responses; verify graceful no-key/empty handling.
  - _Demo:_ A query returns real OpenAlex works with DOI/year/authors in a unit test.

- [ ] **Task 9: Grounded synthesis + citation validation**
  - Update `research.ts` to use OpenAlex (primary) + Crossref; constrain synthesis to
    retrieved abstracts; validate every citation maps to a source; add "insufficient
    sources" branch.
  - Property test (RESEARCH-1): no unsupported citation markers; no fabricated sources.
  - _Demo:_ Research a topic → answer with citations that each link to a real source; a
    deliberately obscure query returns "insufficient sources" rather than invented prose.

- [ ] **Task 10: One-click OA PDF ingestion**
  - Add Unpaywall lookup; "Ingest open-access PDF" calls existing `ingestFromUrl`.
  - _Demo:_ From a research result, ingest an OA PDF and then query it in Paper RAG.

## Phase 4 — Grounded Feynman

- [ ] **Task 11: Source attachment for topics**
  - Feynman editor lets the user attach an indexed paper, a video transcript, or notes.
  - _Demo:_ A topic shows its attached source in the editor.

- [ ] **Task 12: Source-grounded evaluation**
  - Extend `evaluateExplanation` to retrieve source passages and grade strictly against
    them, citing passages for red/amber; "unverified" badge when no source.
  - Tests: grounded path cites passages; unverified path is labeled, score deterministic.
  - _Demo:_ Explaining against an attached paper yields feedback that quotes the source for
    each gap; without a source, a clear "unverified" badge appears.

## Phase 5 — Evidence-Aware Study Mix

- [ ] **Task 13: Material-type classification**
  - Migration `011_material_type.sql`; Settings UI to set topic `material_type`.
  - _Demo:_ A topic can be tagged `verbal_vocabulary` / `procedural_math` / etc.

- [ ] **Task 14: Evidence-based queue builder**
  - Create `src/lib/study-mix.ts#buildQueue`: block vocabulary, interleave confusable
    same-subject topics, weight by FSRS difficulty + low Feynman score, size to due load.
  - Property tests (MIX-1, MIX-2).
  - _Demo:_ A mix with vocab + math shows vocab blocked and math interleaved, weakest first.

- [ ] **Task 15: Wire builder into Study Mix**
  - `study-session.ts#generateStudyQueue` delegates to `buildQueue`.
  - _Demo:_ Study Mix session reflects the new ordering end-to-end.

## Phase 6 — Spacing-Aware Planner

- [ ] **Task 16: Spacing math module**
  - Create `src/lib/spacing.ts`: `optimalGapDays` (ridgeline table) + `distributeSessions`.
  - Property test (SPACING-1): non-decreasing gaps; never schedules past the exam.
  - _Demo:_ For exams at 7/30/365 days, the module returns expanding, sane gaps.

- [ ] **Task 17: Apply spacing + near-exam retention to planner**
  - `planner.ts` distributes sessions across the week with expanding gaps; near-exam
    subjects raise FSRS `request_retention` (0.95–0.97) instead of capping intervals.
  - _Demo:_ A subject with an exam in 5 days shows sessions spread across the week and a
    higher-retention review load, not a single crammed day.

- [ ] **Task 18: Missed-session rescheduling**
  - Forward-fill missed planned sessions to the next free day; keep academic-event merge.
  - _Demo:_ Marking a session missed reschedules it forward without compressing the rest.

## Phase 7 — Cleanup

- [ ] **Task 19: Deprecate SM-2 path**
  - After backfill is verified stable, migration drops `interval/repetition/efactor/
    next_review_at`; remove SM-2 write path; update types.
  - Full `npm test` green; build passes.
  - _Demo:_ App runs entirely on FSRS; no SM-2 references remain.

- [ ] **Task 20: Docs + env updates**
  - Update README env table (OpenAlex/Crossref/Unpaywall `mailto`/`email`), document
    optional external services (Docling/Ragas) as non-default.
  - _Demo:_ A fresh setup following the README enables grounded research and FSRS.
