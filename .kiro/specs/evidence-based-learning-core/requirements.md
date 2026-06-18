# Evidence-Based Learning Core — Requirements

## Introduction

This spec upgrades Nora's seven core learning features from "correct but dated/shallow"
to evidence-backed and trustworthy, based on the Nora Technical & Pedagogical Audit
(`geminiresearch.md`) and the code audit of the existing implementation.

Guiding principles (unchanged from `docs/MAIN.md`):
- Learning first; AI as tutor, never author.
- Grounded data only — the system never presents ungrounded claims as authoritative.
- Reuse over rebuild — ride the existing Supabase + Next.js Server Actions architecture.

Scope: spaced repetition (SM-2 → FSRS), Feynman grounding, Study Mix interleaving,
Research Desk source grounding, Paper RAG retrieval quality, and Planner spacing.
Out of scope: gamification redesign, social parties, pixel-art UI (tracked separately).

---

## Requirement 1 — FSRS Spaced-Repetition Scheduling

**User story:** As a student, I want my reviews scheduled by a modern memory model so I
retain more while reviewing less.

### Acceptance Criteria
1.1 WHEN a card is reviewed THEN the system SHALL compute the next review using the FSRS
    algorithm (DSR model: difficulty, stability, retrievability) via the `ts-fsrs` library.
1.2 The system SHALL persist per-card FSRS state: `stability`, `difficulty`, `due`,
    `last_review`, `reps`, `lapses`, `state` (new/learning/review/relearning),
    `scheduled_days`, `elapsed_days`.
1.3 The system SHALL use a configurable target retention (`request_retention`) defaulting
    to 0.90.
1.4 WHEN existing SM-2 cards are migrated THEN the system SHALL initialize FSRS state from
    their review history without data loss and without forcing all cards due at once.
1.5 The FSRS scheduling computation SHALL be a pure function covered by unit tests,
    independent of the database.
1.6 WHEN the AI/library is unavailable THEN scheduling SHALL still succeed (FSRS runs
    locally; no network dependency).

## Requirement 2 — Friction-Reduced Grading & Timezone-Safe Due Dates

**User story:** As a student, I want a simple grading choice and reviews that become due on
the correct calendar day in my own timezone.

### Acceptance Criteria
2.1 The review UI SHALL present four grades — Again, Hard, Good, Easy — mapped to
    `Rating.Again|Hard|Good|Easy`, replacing the 0–5 scale.
2.2 WHEN a card lapses (Again) THEN it SHALL re-enter the current session queue before the
    session ends (intra-session relearning).
2.3 The system SHALL determine "due today" using the user's stored `timezone`
    (`profiles.timezone`), not the server's local date.
2.4 Due timestamps SHALL be stored as absolute instants (UTC) and compared against the
    user's local day boundary.
2.5 The existing 0–5 grade history in `card_reviews` SHALL be preserved (read-only) for
    migration/analytics.

## Requirement 3 — Grounded Feynman Evaluation

**User story:** As a student, I want my explanation graded against real source material so
the feedback is trustworthy, not the model's guess.

### Acceptance Criteria
3.1 The Feynman editor SHALL allow attaching an optional source for a topic: an indexed
    paper, a video transcript, or pasted notes.
3.2 WHEN a source is attached THEN evaluation SHALL retrieve relevant source passages and
    instruct the evaluator to judge accuracy ONLY against those passages, citing them.
3.3 WHEN a segment is marked red/amber THEN the feedback SHALL reference the specific
    source passage that contradicts or is missing from the explanation.
3.4 WHEN no source is attached THEN the system SHALL clearly label feedback as
    "unverified (no source attached)" and SHALL NOT present fabricated specifics as fact.
3.5 The comprehension score SHALL remain a deterministic function of the segment
    classification (existing `feynman-score.ts` behavior preserved).
3.6 The evaluator SHALL continue to reject questions-as-explanations and probe edge cases.

## Requirement 4 — Evidence-Aware Study Mix (Interleaving)

**User story:** As a student, I want mixed practice that actually helps, ordering
confusable material together and not harming vocabulary memorization.

### Acceptance Criteria
4.1 The system SHALL classify topics/cards by material type (e.g., `procedural_math`,
    `visual_discrimination`, `conceptual`, `verbal_vocabulary`).
4.2 Interleaving SHALL be applied within and across confusable topics of the SAME subject,
    not by alternating modalities arbitrarily.
4.3 WHEN cards are `verbal_vocabulary` type THEN they SHALL be presented blocked
    (sequential), NOT interleaved (per Brunmair & Richter 2019, g = −0.39 for word lists).
4.4 The queue SHALL be weighted toward the student's weakest topics, using FSRS difficulty
    and recent Feynman comprehension scores as the weakness signal.
4.5 The queue size SHALL scale to the actual due-card load rather than a fixed small cap.
4.6 Queue construction SHALL be a pure, unit-tested function.

## Requirement 5 — Grounded Research Desk (Real Academic Sources)

**User story:** As a student, I want research answers backed by real papers with citations
that actually map to sources, not AI-generated prose with decorative citations.

### Acceptance Criteria
5.1 The web Research Desk SHALL query real academic APIs — OpenAlex (primary, CC0),
    Crossref, and Unpaywall (for open-access PDFs) — replacing the Wikipedia/Open Library
    primary path.
5.2 Every citation in an answer SHALL map to a retrieved source record (title, authors,
    year, DOI/URL); the system SHALL NOT emit citation markers without a backing source.
5.3 WHEN sufficient sources are not found THEN the system SHALL say so and SHALL NOT
    fabricate a literature review from parametric memory.
5.4 Synthesis SHALL be constrained to retrieved source content; supplemental model
    knowledge, if used, SHALL be visibly separated and labeled as unverified.
5.5 API access SHALL comply with each provider's free-tier terms (OpenAlex `mailto`/per_page,
    Crossref Polite Pool `mailto`, Unpaywall `email`, Semantic Scholar key + 1 RPS if used).
5.6 Open-access PDFs discovered via Unpaywall SHALL be ingestable into the existing Paper
    RAG pipeline in one action.

## Requirement 6 — Hybrid Retrieval for Paper RAG

**User story:** As a student, I want paper Q&A to find the right passages even for exact
terms, version numbers, and names.

### Acceptance Criteria
6.1 Retrieval SHALL combine lexical ranking (Postgres full-text `ts_rank_cd`) and vector
    similarity (pgvector cosine) using Reciprocal Rank Fusion (RRF).
6.2 WHEN no embedding key is configured THEN retrieval SHALL fall back to ranked lexical
    search (`ts_rank_cd`), NOT an unranked "fetch first 8 chunks" scan.
6.3 The lexical index SHALL use the correct text-search configuration for the content
    language; embedding column dimensions SHALL match the configured embedding model.
6.4 Citations SHALL reference the actual retrieved chunk (paper title, section, chunk index)
    with no default-to-zero chunk index.
6.5 The RRF fusion SHALL be implemented in a database function and covered by a test that
    verifies fusion ordering on known inputs.

## Requirement 7 — Spacing-Aware Study Planner

**User story:** As a student, I want my plan to space study optimally before each exam and
to adapt as exam load rises, without cramming.

### Acceptance Criteria
7.1 The planner SHALL distribute review sessions across the week using expanding spacing
    derived from the optimal interstudy-gap ratio for the days-until-exam
    (Cepeda et al. 2008 temporal ridgeline), not only "today".
7.2 WHEN the ideal gap is uncertain THEN the planner SHALL err toward a WIDER gap
    (asymmetric-cost principle: under-spacing harms far more than over-spacing).
7.3 WHEN an exam is near THEN the planner SHALL raise FSRS target retention (e.g., 0.95–0.97)
    for that subject's cards INSTEAD of capping the maximum interval.
7.4 WHEN a planned session is missed THEN the planner SHALL reschedule it forward
    intelligently rather than compressing all sessions into the next day.
7.5 The planner SHALL continue merging confirmed academic events with status badges
    (existing behavior preserved).
7.6 Spacing/gap math SHALL be a pure, unit-tested function.

## Requirement 8 — Migration, Safety & Compatibility

### Acceptance Criteria
8.1 All schema changes SHALL ship as additive, ordered migrations under
    `supabase/migrations/` and preserve existing data and RLS policies.
8.2 New dependencies SHALL be permissively licensed (MIT/Apache-2.0/BSD); copyleft
    (GPL/AGPL/CC-BY-SA) and non-commercial dependencies SHALL NOT be added to the
    shippable app.
8.3 Heavy/Python-only tools (e.g., Docling, Ragas) SHALL NOT run inside Next.js serverless
    functions; if used, they SHALL be isolated behind an optional external service and
    SHALL NOT be a hard dependency.
8.4 External academic/transcript APIs SHALL be called through the existing SSRF guard and
    rate-limit utilities.
8.5 Each feature SHALL degrade gracefully when its optional API key is absent.