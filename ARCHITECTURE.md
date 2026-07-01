# Architecture

*Nora is small on purpose. The architecture exists to keep it calm, honest, and easy to care for — the same things we hope the app feels like for the people using it.*

How Nora is built, and why it's built this way. This document is for contributors and reviewers who want the system-level picture — the request lifecycle, the data model, the AI pipeline, and the security boundaries.

For *what* Nora does feature-by-feature, see [`docs/PRODUCT_DESCRIPTION.md`](docs/PRODUCT_DESCRIPTION.md). For *why* it exists, see [`docs/WHY_NORA.md`](docs/WHY_NORA.md).

---

## 1. Design principles (engineering)

Nora follows a small set of architectural rules that keep it simple and safe:

1. **Monolith-first.** One Next.js app + one Supabase project. No microservices, no separate real-time server. Complexity is added only where a feature genuinely needs it.
2. **Server Actions over API routes.** Business logic lives in `src/app/(protected)/app/_actions/`. React Server Components fetch data directly; client components call Server Actions for mutations.
3. **Pure functions for core logic.** FSRS scheduling, spacing math, the study-mix queue, and Feynman scoring are pure and unit-testable without a database. This is why the suite runs in ~2s.
4. **RLS everywhere.** Every user-owned table enforces `user_id = auth.uid()` in the database, not just in application code. The database is the last line of defense.
5. **Graceful degradation.** Each optional integration (embeddings, web search, video, university discovery) degrades a single feature when its key is absent — it never breaks the app.
6. **Grounded AI only.** Every AI surface is constrained to retrieved sources. Unverified output is labelled; insufficient data is declared, never fabricated.

---

## 2. High-level topology

```
                    Browser (React 19, pixel-UI)
                              │  HTTPS
                              ▼
        ┌─────────────────────────────────────────────┐
        │  Next.js 16 on Vercel                         │
        │                                               │
        │   proxy.ts  ── edge auth gate + session       │
        │      │         refresh, x-pathname header      │
        │      ▼                                         │
        │   App Router (RSC)                             │
        │      • (protected)/app/layout.tsx  auth gate   │
        │      • pages  → Server Components (read)        │
        │      • _actions/ → Server Actions (write)       │
        └───────┬───────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
        Supabase (Postgres         External services
        + pgvector + RLS +         • Groq / OpenRouter (LLM)
        Auth + Storage)            • OpenAI (embeddings)
                                   • OpenAlex/Crossref/Unpaywall
                                   • Tavily, Firecrawl, YouTube
                                          │
                                   all outbound calls pass
                                   through lib/ssrf.ts guard
```

The database and the Vercel functions should be **co-located in the same region** — every server render issues several Postgres round-trips, so cross-region latency multiplies. `vercel.json` pins the function region accordingly.

---

## 3. Request lifecycle

A single navigation to a protected page flows through three layers:

1. **`proxy.ts` (edge).** Runs on every matched request. Refreshes the Supabase session cookie, sets an `x-pathname` header (so the layout can run its onboarding gate), and redirects unauthenticated users away from `/app`.
2. **`(protected)/app/layout.tsx` (RSC).** Resolves the current user, enforces the onboarding gate, and loads the shell data (profile, pet) for the sidebar and top bar — in a **single parallel query wave**.
3. **The page (RSC).** Fetches its own data and renders. Mutations are delegated to Server Actions in `_actions/`.

### Auth is memoized per request

`supabase.auth.getUser()` is a network call to the Supabase Auth server. Because the layout, the page, and nested server components all need the user, `getCurrentUser()` (`src/lib/supabase/auth.ts`) wraps it in React's `cache()` so the entire render shares **one** auth round-trip instead of several. The proxy still refreshes the session separately (different runtime), which is expected.

### Data fetching avoids waterfalls

Server Components gather independent queries into a single `Promise.all` wave rather than awaiting them sequentially. The Today screen, for example, resolves the profile first (its timezone determines the "due today" cutoff) and then fires the remaining ~10 reads concurrently.

---

## 4. Data model

Postgres, via Supabase, across 22 migrations in `supabase/migrations/`. Core tables:

```
profiles            user settings, XP, coins, level, timezone
subjects            what the user studies (name, color)
topics              topics within subjects (exam_date, material_type)
study_sessions      logged sessions (mode: feynman/review/research/planner…)
feynman_explanations raw explanations + AI gap analysis + comprehension score
cards               flashcards with full FSRS state (stability, difficulty, due, state)
card_reviews        per-card grading history
avatars / pets      composited pixel avatar; companion (type, name, state, affinity)
papers              academic paper metadata (title, authors, year, DOI, URL)
paper_chunks        parsed + embedded text chunks for RAG (pgvector, 1536 dims)
academic_profiles   university, faculty, program, year, term, onboarding_status
academic_events     extracted calendar dates with a confidence status
academic_sources    official document URLs + classification
ingestion_jobs      durable background work queue for academic data collection
videos / notes      YouTube metadata; timestamped notes (time_segment numrange)
video_transcripts   cached transcripts with full timestamp arrays
parties             study groups (name, visibility, owner)
party_members       membership records
party_quests        shared weekly goals with progress tracking
party_messages      short group messages
cheers              emoji reactions between members
```

Every user-owned table has RLS policies keyed on `auth.uid()`. Migrations are numbered and append-only.

---

## 5. Spaced repetition (FSRS-6)

Scheduling uses `ts-fsrs` (MIT), implementing the FSRS-6 Difficulty–Stability–Retrievability model.

- Cards enter from Feynman mode, the Research Desk, the Video Study Room, or manual creation.
- Each review grades the card **Again / Hard / Good / Easy**; the scheduler computes the next optimal date, reducing review load ~20–30% vs SM-2 at equal retention.
- **Timezone-safe:** due dates are stored as UTC instants and compared against the user's *local* day boundary (from `profiles.timezone`), never the server clock.
- **Pure and offline-capable:** the scheduler is a pure function with no network dependency, covered by unit and property-based tests.
- Target retention defaults to 0.90 and elevates toward 0.95 for subjects with an exam within ~14 days.

---

## 6. AI pipeline

```
User input → Server Action → LLM (Groq primary → OpenRouter fallback)
                          ↘ Embeddings (OpenAI text-embedding-3-small)
                          ↘ RAG retrieval (pgvector + FTS → RRF)
                          ↘ Academic APIs (OpenAlex / Crossref / Unpaywall)
                          ↘ SSRF guard → external fetch
```

Rules enforced across every AI surface:

- **Never authors the student's work** — it asks questions and identifies gaps.
- **Citations map to real retrieved sources** — no decorative citation markers.
- **Insufficient data is declared**, not filled with hallucination ("fewer than 2 sources found").
- **Rate-limited per action type** with configurable windows.

### Retrieval (hybrid RAG)

1. **Ingestion:** PDF → section-aware parse → chunk (256–512 tokens, 10–15% overlap) → embed → store in `paper_chunks` (pgvector).
2. **Retrieval:** Reciprocal Rank Fusion of two legs —
   - **vector:** pgvector cosine similarity, and
   - **lexical:** `ts_rank_cd` over a `tsvector` GIN index.
3. **Answering:** top-k chunks are passed to the LLM with strict citation instructions; each claim references an actual chunk.
4. **Degradation:** with no embedding key, retrieval falls back to ranked lexical-only search — never an unranked scan.

---

## 7. Security boundaries

Security is enforced at the database and network edges, not just in the UI. Full detail in [SECURITY.md](SECURITY.md); the short version:

- **Row-Level Security** on every user-owned table (`user_id = auth.uid()`).
- **Authorization-scoped database functions.** `SECURITY DEFINER` RPCs (reward/quest mutations) assert `auth.uid()` and are granted only to `authenticated` / `service_role`, never to `anon` (migration `020`).
- **SSRF guard** (`lib/ssrf.ts`) on all outbound fetches — blocks private, loopback, and cloud-metadata addresses. University discovery is additionally scoped to official-domain allowlists.
- **Untrusted content is data, never instructions** — fetched pages and documents are never treated as prompts.
- **Secrets are server-only.** The service-role key and provider keys never reach the client; only `NEXT_PUBLIC_*` values are exposed.

---

## 8. Frontend architecture

- **Design system in CSS.** `globals.css` defines the pixel design tokens (`--pixel-*`), the 9-slice `.pixel-panel` / `.pixel-btn` sprites via `border-image`, palette themes via `[data-palette]`, and a single stepped-motion vocabulary (`steps()` animations).
- **Component library.** `src/components/pixel-ui/` holds the shared primitives (panels, buttons, inputs, dialog frames, toasts, charts, the `PixelSpinner` loading indicator, command palette).
- **Voice in code.** `src/lib/nora-voice.ts`, `src/lib/companion-dialogue.ts`, and `src/lib/copy.ts` centralize Nora's tone so UI strings stay consistent and on-voice.
- **Accessibility.** A skip link, keyboard-navigable command palette, `prefers-reduced-motion` support plus a user-facing animation kill-switch, and focus-visible states are built into the shell.

---

## 9. Testing strategy

- **Unit + property-based tests (Vitest + fast-check)** cover the pure logic: FSRS scheduling, spacing math, timezone boundaries, the study-mix queue, and Feynman scoring. Property-based tests assert invariants (e.g. "the next due date is always in the future") across randomized inputs.
- **Type safety** is a test: `next build` runs a full `tsc` pass under strict mode.
- **SQL tests** live in `supabase/tests/` (e.g. hybrid-search ranking).
- **End-to-end scenarios** are planned and executed with TestSprite (`.testsprite/`).

---

## 10. Deployment

- Hosted on **Vercel** (Next.js) + **Supabase** (managed Postgres).
- The Vercel function region should match the Supabase project region — see `vercel.json`.
- Database changes ship as ordered SQL migrations applied to the Supabase project.
- Optional integrations are enabled by presence of their environment variable; none are required to boot the app beyond Supabase + Groq.

---

*The best compliment this architecture could get is that you never had to think about it — that adding a feature felt calm, and nothing surprising happened. Knowledge grows slowly; so should the codebase.* 🌱
