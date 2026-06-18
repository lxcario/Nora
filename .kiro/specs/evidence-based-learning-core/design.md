# Evidence-Based Learning Core — Design

## Overview

This design upgrades the learning core in place, reusing the existing stack: Next.js
(App Router, Server Actions), Supabase (Postgres, pgvector, RLS, Storage), and the shared
`@/lib/llm` Groq→OpenRouter client. It introduces one new permissive dependency
(`ts-fsrs`, MIT) and three real academic APIs (OpenAlex, Crossref, Unpaywall — all
free/commercial-safe). No Python services are required for the core path.

### Evidence basis (from geminiresearch.md)
- FSRS DSR model reduces review load ~20–30% vs SM-2 and removes "Ease Hell".
- Interleaving meta-analysis (Brunmair & Richter 2019, g=0.42 overall) — positive for
  math (0.34) and visual discrimination (0.67), NEGATIVE for verbal word lists (−0.39).
- Spacing ridgeline (Cepeda et al. 2008): optimal interstudy gap shrinks as a ratio of
  the retention interval; under-spacing is far costlier than over-spacing.
- Self-explanation / generative learning (Chi; Fiorella & Mayer) is strongest when the
  learner's output is checked against correct source material.

### Verified-before-build caveats
1. **pg_textsearch (BM25)** may not be available on hosted Supabase. Design uses native
   Postgres FTS (`tsvector` + `ts_rank_cd`), which is always available; BM25 is an optional
   enhancement gated behind an extension-availability check.
2. **Embedding dimensions** must match the model: `text-embedding-3-small` = 1536,
   `text-embedding-3-large` = 3072. The migration is parameterized to the configured model;
   default path uses 1536.
3. **ts-fsrs** requires Node >= 20; `unpdf`'s bundled PDF.js needs `Promise.withResolvers`
   (Node 22) — keep the existing `pdf-parse` path and treat `unpdf` as optional.

---

## Architecture

### Spaced Repetition (Req 1, 2)
- New pure module `src/lib/fsrs.ts` wrapping `ts-fsrs`:
  - `scheduleReview(cardState, rating, now)` → next FSRS state + log.
  - `initFromSM2(history)` → seed FSRS state from `card_reviews` for migration.
- `src/lib/sm2.ts` retained only for migration backfill, then deprecated.
- `review.ts` server action calls `scheduleReview`; writes FSRS columns.
- Timezone: read `profiles.timezone`; "due today" = `due <= endOfUserLocalDay(now, tz)`.
  Add helper `src/lib/due.ts` (pure).
- Intra-session relearning handled client-side in `review-session.tsx`: Again re-queues.

### Grounded Feynman (Req 3)
- Extend `evaluateExplanation(topicId, text, { sourceRef })`.
- When `sourceRef` present, retrieve passages via the RAG retriever (paper chunks) or the
  video transcript slice, inject as the ONLY ground-truth context, and switch the prompt to
  "evaluate strictly against provided source; cite passage ids for red/amber".
- When absent, prepend an "unverified" flag to the result; UI renders a badge.
- Score stays in `feynman-score.ts` (deterministic).

### Study Mix Interleaving (Req 4)
- Add `material_type` to topics (enum). Default `conceptual`; user-editable in Settings.
- New pure `src/lib/study-mix.ts`:
  - `buildQueue({ dueCards, topics, weaknessSignals, materialTypes })`.
  - Rule: group `verbal_vocabulary` blocked; interleave confusable same-subject topics;
    weight by FSRS difficulty + low Feynman score; size to due load.
- `study-session.ts` calls the pure builder.

### Grounded Research Desk (Req 5)
- New `src/lib/academic-search/` clients: `openalex.ts`, `crossref.ts`, `unpaywall.ts`
  (server-only fetch via SSRF guard + rate-limit, `mailto`/`email` params from env).
- `research.ts` flow: query → fetch ranked works (OpenAlex primary) → assemble source
  records with DOI/year/authors/abstract → synthesis constrained to retrieved abstracts,
  citations validated to map to a source index → "insufficient sources" branch.
- "Ingest OA PDF" button: Unpaywall `best_oa_location.url_for_pdf` → existing
  `ingestFromUrl` in `rag.ts`.

### Hybrid RAG (Req 6)
- New migration adds `match_paper_chunks_hybrid` PL/pgSQL function implementing RRF over:
  - lexical CTE: `ts_rank_cd(content_tsv, plainto_tsquery(cfg, q))`,
  - vector CTE: `embedding <=> query_embedding` (when embeddings exist).
- `rag.ts` calls the hybrid RPC; FTS-only mode uses the lexical CTE alone (ranked).
- Citations built from actual returned rows (no chunkIndex=0 fallback).

### Spacing-Aware Planner (Req 7)
- New pure `src/lib/spacing.ts`:
  - `optimalGapDays(daysUntilExam)` from the ridgeline ratio table.
  - `distributeSessions(topics, today, weekWindow)` → spread across week, expanding gaps,
    wider-on-uncertainty.
- `planner.ts` uses it; near-exam subjects pass elevated `request_retention` to FSRS
  scheduling (per-subject override) instead of interval capping.
- Missed-session reschedule: forward-fill to next free day within constraints.

---

## Data Model Changes (additive migrations)

`010_fsrs_scheduling.sql`
- `cards`: add `stability double precision`, `difficulty double precision`,
  `due timestamptz`, `last_review timestamptz`, `reps int default 0`,
  `lapses int default 0`, `state smallint default 0`, `scheduled_days int default 0`.
  Keep `interval/repetition/efactor/next_review_at` until migration completes.
- Backfill job initializes FSRS state from `card_reviews`.

`011_material_type.sql`
- `topics`: add `material_type text default 'conceptual'` with a CHECK constraint.

`012_hybrid_search.sql`
- Ensure `content_tsv` GIN index; create `match_paper_chunks_hybrid` RRF function.
- Optional `pg_textsearch` BM25 branch guarded by `IF EXISTS` extension check.

`013_research_sources.sql` (if needed)
- `papers`: ensure `doi`, `oa_url` columns for academic-search ingestion.

All migrations: additive, RLS preserved, no destructive drops until a later cleanup
migration after backfill verification.

---

## Correctness Properties (for property-based tests, fast-check)

- **FSRS-1:** For any valid state, `scheduleReview` returns `due > now` and monotonic
  stability growth on Good/Easy; lapses reset to relearning.
- **FSRS-2:** Migration init never produces NaN/negative stability; never marks every card
  due on the same day.
- **DUE-1:** `isDueToday` is timezone-consistent: a card due at 23:59 user-local is due that
  day regardless of server TZ.
- **MIX-1:** No two `verbal_vocabulary` items are separated by a different-type item
  (they stay blocked).
- **MIX-2:** Queue length equals min(dueLoad, cap) and weakest topics appear earlier.
- **RAG-1:** Every emitted citation index resolves to a retrieved chunk.
- **RESEARCH-1:** Answer contains no citation marker that lacks a backing source record;
  "insufficient" branch yields zero fabricated sources.
- **SPACING-1:** `optimalGapDays` is non-decreasing in `daysUntilExam` and never returns
  a gap that schedules past the exam.

---

## Dependencies & Licensing (Req 8)
- `ts-fsrs` — MIT — added (core).
- OpenAlex/Crossref/Unpaywall — CC0/free APIs, commercial-safe — env `mailto`/`email`.
- `unpdf` — MIT — optional only (Node 22 caveat); default keeps `pdf-parse`.
- Docling / Ragas — NOT added to runtime; documented as optional external services only.
- BM25 (`pg_textsearch`/ParadeDB) — optional, gated by availability check.

## Rollout
1. Ship FSRS columns + backfill behind a read path that prefers FSRS, falls back to SM-2.
2. Flip review/grading UI to 4-button once backfill verified.
3. Add hybrid RAG (pure DB function — low risk).
4. Add grounded Research Desk (new clients; old path remains as fallback).
5. Grounded Feynman + Study Mix interleaving + Planner spacing.
6. Cleanup migration drops SM-2 columns after a stable period.
