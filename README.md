<p align="center">
  <img src="public/noralogo.png" alt="Nora — Pixel Study OS" width="220" />
</p>

<h1 align="center">Nora</h1>

<p align="center">
  <strong>A softer way to study.</strong><br/>
  Evidence-based learning wrapped in a cozy pixel-art world — where your companion grows as you master what you study.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/FSRS-ts--fsrs%20MIT-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/AI-Groq%20%2B%20OpenRouter-FF6F00?style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/tests-332%20passing-729B1B?style=flat-square&logo=vitest" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-brightgreen?style=flat-square&logo=nodedotjs" />
</p>

<p align="center">
  <img src="public/ui.png" alt="Nora in action" width="860" />
</p>

---

## Why Nora

Most study apps are timers with a coat of paint, or AI that does the work for you. Nora is neither.

It's a study operating system built on six learning strategies from cognitive science, and a pixel-art world that only grows when your understanding does. The AI never writes your assignments — it asks questions, finds your gaps, and helps you plan. Your pet's mood reflects your real habits, not a streak counter you can game.

> Learning first. AI as a tutor, never the author. Grounded data only — never fabricated claims.

---

## What's inside

### 🧠 Feynman Mode — Grounded Evaluation
Explain a concept in plain words and an AI "Inquisitive Student" probes it back — colour-coded gap analysis (green / amber / red), clarifying questions, and one-click flashcards from your own explanation.

**Source grounding (new):** Attach an indexed paper, video transcript, or pasted notes to any topic. Evaluation then grades your explanation *strictly* against those passages, citing the specific passage that each amber/red segment contradicts or omits. Without a source, feedback is clearly labelled **"unverified (no source attached)"** — no fabricated specifics presented as fact.

### 🔁 FSRS Spaced Repetition
A full [FSRS-6](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) scheduler (via **[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)**, MIT) drives the review queue. FSRS reduces review load ~20–30% vs SM-2 and eliminates "Ease Hell" by using a DSR memory model (Difficulty, Stability, Retrievability).

- **Four-button grading:** Again / Hard / Good / Easy (mapped to FSRS Rating).
- **Intra-session relearning:** A lapsed card (Again) re-queues within the current session.
- **Timezone-safe due dates:** "Due today" is determined by `profiles.timezone`, never the server's local clock.
- Cards from Feynman, research, video study, and manual entry all flow into the same FSRS queue.

> SM-2 columns were preserved during backfill and removed after verification (migration 016).

### 🔀 Evidence-Based Study Mix
Mixed practice queue built on the Brunmair & Richter (2019) meta-analysis:

- **verbal_vocabulary** topics → **blocked** (never interleaved) — interleaving hurts word-list recall (*g* = −0.39).
- **procedural_math** and **visual_discrimination** → **interleaved** within confusable same-subject topics (*g* = 0.34–0.67).
- Queue weighted toward weakest topics using FSRS difficulty (70%) and inverse Feynman comprehension score (30%).
- Queue size scales to the actual due-card load (no fixed cap).

Set each topic's material type in **Settings → Subjects**.

### 🎬 Video Study Room
YouTube search with educational filtering, transcript extraction (with Groq Whisper fallback), timestamp-aware AI notes in a Tiptap editor with clickable time marks, inline ghost-text completions, and "explain what you just watched" Feynman evaluated against the transcript.

### 🔬 Research Desk — Real Academic Sources
Web research now uses **real academic APIs** instead of Wikipedia/Open Library:

| API | Role | License |
|---|---|---|
| [OpenAlex](https://openalex.org) | Primary — CC0 scholarly catalog | CC0 |
| [Crossref](https://www.crossref.org) | Supplementary DOI/metadata | Free Polite Pool |
| [Unpaywall](https://unpaywall.org) | Open-access PDF discovery | Free |

Every citation maps to a retrieved source. When fewer than 2 sources are found the system says so — **it never fabricates a literature review**. Synthesis is constrained to retrieved abstracts; model supplementation is clearly labelled "unverified."

One-click **"Ingest Open Access PDF"**: looks up a DOI via Unpaywall → SSRF-checks the URL → runs it through the full Paper RAG pipeline.

### 📄 Hybrid Paper RAG
Dual-mode retrieval fused with **Reciprocal Rank Fusion (RRF)**:

- **Vector leg** — pgvector cosine similarity (`text-embedding-3-small`, 1536 dims).
- **Lexical leg** — `ts_rank_cd` over a generated `tsvector` GIN index (always available).
- When no embedding key is configured → ranked lexical-only (never an unranked scan).
- Citations reference the **actual retrieved chunk** (paper title, section, chunk index) — no default-to-zero fallback.

### 🎓 University-Aware Onboarding
Tell Nora your university, faculty, department, year, and term. It finds your institution's official academic data — academic calendar, registration/add-drop/midterm/final dates, holidays, and curriculum — stores the official PDFs, indexes them, and uses them to build a semester-aware study plan and an academic RAG you can ask about your own semester.

- Diacritic-insensitive Turkish-aware matching (ODTÜ / METU first launch)
- **Never invents dates** — ungrounded dates are dropped; missing official dates are stored as `unreleased`
- Background ingestion via an `ingestion_jobs` queue; manual upload always works

### 📅 Spacing-Aware Planner
Session distribution using the **Cepeda et al. (2008) temporal ridgeline** — optimal interstudy gap as a function of days-until-exam:

- Sessions spread across the week with **expanding gaps** (not crammed to today).
- **Asymmetric cost principle** — when the ideal gap is uncertain, gaps err wider (under-spacing is far costlier than over-spacing).
- **Near-exam boost** — subjects with exams within 14 days get FSRS `request_retention = 0.95` instead of capping intervals.
- **Missed-session forward-fill** — marking a session missed reschedules it to the next free day without compressing the rest.
- Academic event merge: confirmed semester events surface as calendar chips and warning strips.

### 🐾 Pixel Room & Pet
Pick from 12 animated companions. Your pet evolves with your level and its mood mirrors your last few days of study. Daily missions tie directly to real study actions.

### 👥 Social Parties
Create or join study groups, share weekly quests, and send cheers. Missed days become compassionate "help quests" for the group instead of punishing resets.

### 📊 Analytics
Weekly stats, 30-day charts, a GitHub-style consistency heatmap, and topic mastery bars.

---

## Gamification

| Action | XP | Coins | Affinity |
|---|---|---|---|
| Feynman explanation | +15 | +5 | +3 |
| Card review (Good/Easy/Hard) | +3 | +1 | +1 |
| Card review (Again — lapse) | +1 | — | — |
| Card created | +2 | — | — |
| Study session complete | +10 | +3 | +2 |
| All daily missions | +20 | +10 | +5 |

**Level:** `floor(sqrt(xp / 50)) + 1` — Lv2 at 50 XP, Lv3 at 200, Lv4 at 450, Lv5 at 800.

8-bit sound effects generated live with the Web Audio API — no audio files, just procedural oscillators with a sidebar mute toggle.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript strict — Node.js **≥ 20** |
| UI | React 19, Tailwind CSS v4, custom pixel-UI components |
| Database | Supabase — Postgres, pgvector, RLS, Storage |
| Auth | Supabase Auth (gated via `proxy.ts`) |
| Spaced Repetition | **ts-fsrs** (MIT) — FSRS-6 DSR model |
| AI (primary) | Groq Cloud (Llama 3.3 70B) |
| AI (fallback) | OpenRouter (free tier) |
| Academic Sources | OpenAlex (CC0), Crossref Polite Pool, Unpaywall |
| RAG retrieval | pgvector cosine + `ts_rank_cd` FTS → RRF |
| Rich text | Tiptap v3 (custom timestamp mark) |
| PDF parsing | pdf-parse (default); unpdf optional (Node ≥ 22) |
| Testing | Vitest + fast-check (property-based) — **332 tests** |

---

## Getting Started

### Prerequisites

- **Node.js ≥ 20** (required by ts-fsrs)
- A Supabase project (free tier works)
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
git clone https://github.com/lxcario/Nora.git
cd Nora
npm install
cp .env.example .env.local
# Edit .env.local with your keys
```

### Environment

See the full variable reference in [`.env.example`](.env.example). Minimum to run:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GROQ_API_KEY=...
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `GROQ_API_KEY` | ✅ | LLM — Feynman, research, synthesis |
| `OPENROUTER_API_KEY` | optional | LLM fallback |
| `OPENAI_API_KEY` | optional | Enables pgvector RAG (FTS used otherwise) |
| `OPENAI_EMBEDDING_MODEL` | optional | Defaults to `text-embedding-3-small` (1536 dims) |
| `ACADEMIC_API_MAILTO` | recommended | OpenAlex + Crossref Polite Pool enrollment |
| `ACADEMIC_API_EMAIL` | recommended | Unpaywall API access — required for OA PDF ingestion |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | fallback | Used if specific mailto/email vars are absent |
| `FIRECRAWL_API_KEY` | optional | University auto-discovery (manual upload always works) |
| `YOUTUBE_API_KEY` | optional | YouTube search in Study Room |
| `NEXT_PUBLIC_SITE_URL` | optional | OpenRouter attribution headers |

> **Academic APIs (OpenAlex, Crossref, Unpaywall)** are free with no key required, but passing your email in `ACADEMIC_API_MAILTO` / `ACADEMIC_API_EMAIL` enrolls the app in the Polite Pool for higher rate limits and is required by Unpaywall's terms of service.

### Database Migrations

Run all migrations in order via the **Supabase SQL Editor** or `supabase db push`:

```
supabase/migrations/001_initial_schema.sql       # core schema
supabase/migrations/002_social_parties.sql       # party tables
supabase/migrations/003_avatar_storage.sql       # avatar storage
supabase/migrations/003_rag_extensions.sql       # FTS, match_paper_chunks RPC
supabase/migrations/003b_storage_bucket.sql      # PDF storage bucket
supabase/migrations/004_study_room.sql           # video / transcript tables
supabase/migrations/005_party_rls_fix.sql        # RLS fix
supabase/migrations/006_feynman_scoring.sql      # comprehension score column
supabase/migrations/007_university_onboarding.sql # academic profile / events
supabase/migrations/008_ingestion_jobs.sql       # background job queue
supabase/migrations/009_academic_sweeper.sql     # academic data sweeper
supabase/migrations/010_fsrs_scheduling.sql      # FSRS columns on cards
supabase/migrations/011_material_type.sql        # topic material_type
supabase/migrations/012_hybrid_search.sql        # match_paper_chunks_hybrid RPC
supabase/migrations/013_research_sources.sql     # doi + oa_url on papers
supabase/migrations/014_feynman_source_attachment.sql  # feynman_source_ref on topics
supabase/migrations/015_planner_skips.sql        # planner missed-session records
supabase/migrations/016_drop_sm2_columns.sql     # removes SM-2 columns (run LAST)
```

> **Migration 016 is destructive.** Run it only after verifying that all production cards have non-NULL `due` values (i.e., after Task 2's `initFromSM2` backfill has completed successfully).

Then seed the university registry:

```
supabase/seed_university_registry.sql
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start studying.

---

## Testing

```bash
npm test            # run all tests once (332 passing)
npm run test:watch  # watch mode
```

Tests use **Vitest** + **fast-check** (property-based). Coverage includes:

- FSRS scheduling (FSRS-1, FSRS-2 properties)
- SM-2 → FSRS migration backfill (no NaN/negative; no all-same-day)
- Timezone-safe due-date helpers (DUE-1 across 9 IANA zones + DST)
- RRF fusion ordering on known inputs
- Citation validation — every emitted citation resolves to a retrieved chunk (RAG-1)
- Academic search API clients with mocked fetch (graceful no-key/empty handling)
- Research citation validation — no unsupported `[N]` markers (RESEARCH-1)
- Feynman grounding helpers (passage building, prompt constraints)
- Study Mix queue builder — vocab blocking (MIX-1), weakness ordering (MIX-2)
- Spacing math — non-decreasing gaps, never past the exam (SPACING-1)
- Planner forward-fill — result strictly after original, never in occupied set

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                     # Login / signup
│   └── (protected)/app/
│       ├── _actions/               # Server actions
│       │   ├── review.ts           # FSRS review queue + submit
│       │   ├── feynman.ts          # Grounded Feynman evaluation + source attachment
│       │   ├── research.ts         # Grounded synthesis (OpenAlex/Crossref/Unpaywall)
│       │   ├── rag.ts              # Hybrid RAG (RRF retrieval)
│       │   ├── planner.ts          # Spacing-aware planner + missed-session reschedule
│       │   ├── study-session.ts    # Evidence-based Study Mix queue
│       │   ├── subjects.ts         # Material-type management
│       │   ├── academic/           # University onboarding, registry, ingest, jobs
│       │   └── rag/                # parser, chunker, embedder sub-modules
│       ├── feynman/                # Feynman editor with source attachment UI
│       ├── review/                 # FSRS review session (4-button, intra-session relearning)
│       ├── research/               # Research Desk (OpenAlex + OA PDF ingestion)
│       ├── settings/               # Settings including material-type selector
│       └── …
├── lib/
│   ├── fsrs.ts                     # Pure FSRS module (scheduleReview, initFromSM2)
│   ├── due.ts                      # Timezone-safe due-date helpers
│   ├── rrf.ts                      # Reciprocal Rank Fusion (mirrors SQL function)
│   ├── feynman-grounding.ts        # Passage building + grounded prompt construction
│   ├── study-mix.ts                # Evidence-based queue builder (buildQueue)
│   ├── spacing.ts                  # Cepeda ridgeline + distributeSessions
│   ├── academic-search/
│   │   ├── openalex.ts             # OpenAlex client (CC0)
│   │   ├── crossref.ts             # Crossref Polite Pool client
│   │   ├── unpaywall.ts            # Unpaywall OA lookup + enrichWithUnpaywall
│   │   └── types.ts                # Shared AcademicWork / UnpaywallResult types
│   ├── academic/                   # University pure libs (registry, load, extract…)
│   ├── sm2.ts                      # SM-2 (retained as migration reference, no longer used)
│   └── supabase/                   # Typed clients
├── supabase/
│   ├── migrations/                 # 001–016
│   └── tests/
│       └── 012_hybrid_search.test.sql  # SQL fusion-ordering test (run with psql)
└── proxy.ts                        # Auth gate
```

---

## Optional External Services

The following tools are **not required** and **not part of the runtime path**. They are documented here for operators who want to extend the pipeline.

### Docling (PDF extraction)
Docling provides higher-fidelity PDF parsing (tables, figures, complex layouts) than `pdf-parse`. It is a Python service that runs outside Next.js. To use it:
1. Run Docling as a sidecar service (Docker).
2. Call its REST API from a custom server action before calling `chunkText`.
3. Docling is **never a hard dependency** — `pdf-parse` is always the default.

### Ragas (RAG evaluation)
Ragas is a Python library for evaluating retrieval-augmented generation pipelines. It can score faithfulness, answer relevance, and context precision of `queryRag` responses offline. To use it:
1. Export a sample of `(question, answer, contexts)` triples from your production logs.
2. Run Ragas in a Python notebook or CI script against those triples.
3. Ragas **does not run inside Next.js** and is not installed as a dependency.

---

## Design Philosophy

1. **Learning over engagement** — every mechanic maps to real study behavior.
2. **AI as tutor, not author** — it questions and guides; never writes your work.
3. **Grounded data only** — official academic sources only; no invented dates, no fabricated citations, ever.
4. **Compassionate design** — no punishment for missed days; the group helps instead.
5. **Evidence-based defaults** — interleaving, FSRS, and spacing choices are backed by published meta-analyses with explicit citations in the code.
6. **Reuse over rebuild** — new features ride the existing Supabase + Server Actions architecture.

---

## Evidence Base

| Feature | Source |
|---|---|
| FSRS scheduler | Ye (2022), DSR model — reduces review load ~20–30% vs SM-2 |
| Vocab blocking | Brunmair & Richter (2019) — *g* = −0.39 for word lists |
| Math/visual interleaving | Brunmair & Richter (2019) — *g* = 0.34 (math), 0.67 (discrimination) |
| Spacing ridgeline | Cepeda et al. (2008) — optimal lag ratio by retention interval |
| Asymmetric spacing cost | Cepeda et al. (2008) — under-spacing harms far more than over-spacing |
| Self-explanation grounding | Chi (2000); Fiorella & Mayer (2016) — strongest when checked against sources |

---

## Credits & Licenses

- **ts-fsrs** — MIT — FSRS-6 scheduling library
- **Sprout Lands UI Pack** by Cup Nooble — pixel font and UI elements
- **Lucide** — MIT icons
- **Tiptap** — MIT rich text editor
- **OpenAlex** — CC0 scholarly metadata
- **Crossref** — free Polite Pool metadata service
- **Unpaywall** — free open-access PDF registry

University academic data is sourced from official institutional portals and treated as untrusted, read-only input.

---

## License

MIT

<p align="center"><em>Built with pixels, science, and a lot of coffee.</em><br/><strong>Nora</strong> — a softer way to study.</p>
