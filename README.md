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
  <img src="https://img.shields.io/badge/AI-Groq%20%2B%20OpenRouter-FF6F00?style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/tests-Vitest%20%2B%20fast--check-729B1B?style=flat-square&logo=vitest" />
</p>

<p align="center">
  <img src="public/ui.png" alt="Nora in action" width="860" />
</p>

---

## Why Nora

Most study apps are timers with a coat of paint, or AI that does the work for you. Nora is neither.

It's a study operating system built on six learning strategies from cognitive science, and a pixel-art world that only grows when your understanding does. The AI never writes your assignments — it asks questions, finds your gaps, and helps you plan. Your pet's mood reflects your real habits, not a streak counter you can game.

> Learning first. AI as a tutor, never the author. Gentle motivation over guilt.

---

## What's inside

### 🧠 Feynman Mode
Explain a concept in plain words and an AI "Inquisitive Student" probes it back — color-coded gap analysis (green / amber / red), clarifying questions, and one-click flashcards generated from your own explanation.

### 🔁 SM-2 Spaced Repetition
A full SM-2 scheduler (interval, repetition, ease factor) drives a due-card review queue. Cards from Feynman, research, and video study all flow into the same queue. Grade 0–5, edit before saving.

### 🔀 Study Mix
Interleaved practice that auto-builds a mixed queue across subjects and modalities — flashcards, Feynman prompts, and research questions — for desirable difficulty.

### 🎬 Video Study Room
YouTube search with educational filtering, transcript extraction (with Groq Whisper fallback), timestamp-aware AI notes in a Tiptap editor with clickable time marks, inline ghost-text completions, and "explain what you just watched" Feynman evaluated against the transcript.

### 🔬 Research Desk + Paper RAG
Web research synthesized from open sources with citations, plus PDF upload → auto chunk → index → ask with cited answers. Dual-mode retrieval: pgvector cosine similarity when an embedding key is present, or free Postgres full-text search otherwise.

### 🎓 University-Aware Onboarding & Personalization
Tell Nora your university, faculty, department, year, and term. It finds your institution's **official** academic data — academic calendar (akademik takvim), registration / add-drop / midterm / final / make-up dates, holidays, and curriculum — stores the official PDFs, indexes them, and uses them to build a semester-aware study plan, a dashboard timeline, and an academic RAG you can ask about your own semester.

- Diacritic-insensitive Turkish-aware university matching (first launch: **ODTÜ / METU**, Electrical & Electronics Engineering)
- Guarded auto-discovery through an SSRF-protected, per-university domain allowlist
- **Never invents dates** — ungrounded LLM-extracted dates are dropped; missing official dates are stored as `unreleased`
- Manual upload always works; auto-discovery is an enhancement, not a dependency
- Background ingestion via an `ingestion_jobs` queue with client-poll-driven processing

### 🐾 Pixel Room & Pet
Pick from 12 animated companions. Your pet evolves with your level and its mood mirrors your last few days of study. Daily missions tie directly to real study actions.

### 👥 Social Parties
Create or join study groups, share weekly quests, and send cheers. Missed days become compassionate "help quests" for the group instead of punishing resets.

### 📊 Analytics & 📅 Planner
Weekly stats, 30-day charts, a GitHub-style consistency heatmap, topic mastery bars, and a weekly planner that now merges confirmed academic events with status badges.

---

## Gamification

| Action | XP | Coins | Affinity |
|---|---|---|---|
| Feynman explanation | +15 | +5 | +3 |
| Card review (grade ≥ 3) | +3 | +1 | +1 |
| Card review (grade < 3) | +1 | — | — |
| Card created | +2 | — | — |
| Study session complete | +10 | +3 | +2 |
| All daily missions | +20 | +10 | +5 |

**Level:** `floor(sqrt(xp / 50)) + 1` — Lv2 at 50 XP, Lv3 at 200, Lv4 at 450, Lv5 at 800.

8-bit sound effects are generated live with the Web Audio API — no audio files, just procedural oscillators with a mute toggle in the sidebar.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Cache Components) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4, custom pixel-UI components |
| Database | Supabase — Postgres, pgvector, Row Level Security, Storage |
| Auth | Supabase Auth (gated via `proxy.ts`) |
| AI (primary) | Groq Cloud (Llama 3.3 70B) |
| AI (fallback) | OpenRouter (free tier) |
| Transcription | Groq Whisper |
| Scraping | Provider-agnostic (Firecrawl, free tier) behind SSRF guard + domain allowlist |
| Rich text | Tiptap v3 (custom timestamp mark) |
| PDF parsing | pdf-parse |
| Sprites | PokéAPI (animated Gen V), Sprout Lands UI Pack |
| Testing | Vitest + fast-check (property-based) |

---

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
git clone https://github.com/lxcario/Nora.git
cd Nora
npm install
cp .env.example .env.local
```

### Environment

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_key
YOUTUBE_API_KEY=your_youtube_data_api_key

# Optional — enables pgvector RAG (otherwise free Postgres FTS is used)
OPENAI_API_KEY=your_openai_key

# Optional — enables academic auto-discovery (otherwise manual upload only)
FIRECRAWL_API_KEY=your_firecrawl_key
```

### Database

Run the migrations in order via the Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_social_parties.sql
supabase/migrations/003_avatar_storage.sql
supabase/migrations/003_rag_extensions.sql
supabase/migrations/003b_storage_bucket.sql
supabase/migrations/004_study_room.sql
supabase/migrations/005_party_rls_fix.sql
supabase/migrations/006_feynman_scoring.sql
supabase/migrations/007_university_onboarding.sql
supabase/migrations/008_ingestion_jobs.sql
supabase/migrations/009_academic_sweeper.sql   # optional sweeper
```

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
npm test            # run all tests
npm run test:watch  # watch mode
```

Coverage includes the SM-2 scheduler, transcript slicing and time parsing, search heuristics, the RAG chunker and embedder, and the academic feature's pure functions — university matching, identity validation, date extraction and grounding, source ranking, job state transitions, and cognitive-load modeling — all with property-based tests via fast-check.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/                     # Login, signup
│   └── (protected)/app/            # Main app
│       ├── _actions/               # Server actions
│       │   ├── academic/           # Onboarding, registry, ingest, extract, review, jobs
│       │   └── rag/                # parser, chunker, embedder
│       ├── _components/            # Shared UI (sidebar, academic panels, pollers)
│       ├── onboarding/             # University-aware onboarding wizard
│       ├── academic/               # Academic documents + review
│       ├── feynman/  review/  study/  study-room/
│       ├── research/  room/  party/  planner/  analytics/  settings/
│       └── globals.css
├── lib/
│   ├── academic/                   # Pure libs: registry, validation, extract, ranking, job-state, load
│   ├── sm2.ts  gamification.ts  ssrf.ts  rate-limit.ts  scrape-client.ts
│   └── supabase/                   # Clients + generated types
└── proxy.ts                        # Auth gate
supabase/migrations/                # 001–009
```

---

## Design philosophy

1. **Learning over engagement** — every mechanic maps to real study behavior.
2. **AI as tutor, not author** — it questions and guides, never writes your work.
3. **Compassionate design** — no punishment for missed days; the group helps instead.
4. **Grounded data** — official sources only; no invented academic dates, ever.
5. **Reuse over rebuild** — the academic feature rides the existing RAG pipeline.

---

## Credits & licenses

- **Sprout Lands UI Pack** by Cup Nooble — pixel font and UI elements
- **PokéAPI** — companion data and animated sprites (fan use)
- **Lucide** — MIT-licensed icons
- **Tiptap** — MIT-licensed rich text editor
- **SM-2 algorithm** — Piotr Woźniak (1987), public domain

University academic data is sourced from official institutional portals and treated as untrusted, read-only input.

---

## License

MIT

<p align="center"><em>Built with pixels, science, and a lot of coffee.</em><br/><strong>Nora</strong> — a softer way to study.</p>
