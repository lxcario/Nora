# Nora — The Full Story

> A softer way to study.

---

## What is this?

Nora is a study operating system. Not a flashcard app. Not a timer with a coat of paint. Not an AI that does your homework.

It's the thing you open when you actually want to understand something — when you're tired of highlighting textbooks and hoping something sticks. It wraps six evidence-based learning strategies from cognitive psychology inside a cozy pixel-art world, where a little companion grows alongside your actual understanding.

The AI never writes your work. It asks questions. It finds your gaps. It helps you plan. But you always do the thinking.

---

## Who made this?

Built by **Resque** (lxcario) — a student who got tired of study apps that either do nothing or do everything for you. Previous work: CinePurr (2nd place, TestSprite Hackathon Season 2). This is the follow-up — bigger, deeper, and more personal.

The name "Nora" comes from wanting something that sounds like a friend, not a product. Someone you'd study with at 2am without it feeling weird.

---

## Why does it exist?

Most study apps fall into two traps:

1. **Passive timers** that track hours without improving understanding
2. **AI slop generators** that do the work for you, creating an illusion of learning

Nora solves this by forcing active recall, spacing reviews optimally, grounding feedback in real sources, and making the process emotionally sustainable through a cozy pixel world where your companion reacts to your real habits — not a streak counter you can game.

The philosophy is simple: **learning first, AI as tutor never author, grounded data only, compassionate design.**

---

## The Science Behind Everything

Every feature in Nora is backed by published cognitive science. This isn't marketing — it's the actual implementation logic.

| Strategy | Research | How Nora implements it |
|----------|----------|----------------------|
| **Spaced Practice** | Cepeda et al. (2008) | FSRS-6 algorithm schedules reviews at optimal intervals; planner distributes sessions using the temporal ridgeline |
| **Retrieval Practice** | Bjork (1994) | Flashcard reviews force active recall; Feynman mode requires explaining without notes |
| **Interleaving** | Brunmair & Richter (2019) | Study Mix interleaves confusable topics — but blocks vocabulary (where interleaving *hurts*, g = −0.39) |
| **Elaboration** | Chi (2000); Fiorella & Mayer (2016) | Feynman "Inquisitive Student" probes for why/how, connections, and analogies |
| **Concrete Examples** | — | AI evaluator asks for specific cases and real-world scenarios |
| **Dual Coding** | Paivio (1971) | Video Study Room combines visual lectures with textual timestamped notes |
| **Deliberate Erring** | Springer (2023) | Error Spotter — finding AI's planted mistakes enhances far-transfer learning |
| **Metacognition** | MIT (2025) | JOL confidence calibration shows if you *know what you know* |

---

## The Features — All of Them

### Feynman Mode

The heart of Nora. You pick a topic, explain it in your own words like you're teaching someone, and an AI "Inquisitive Student" evaluates you — not by giving you answers, but by color-coding your explanation (green = solid, amber = vague, red = wrong) and asking probing follow-up questions.

The evaluation is grounded: when you attach a source (a paper, your notes), feedback cites the specific passage you contradicted or missed. Without a source, everything is clearly labeled "unverified."

Generates a deterministic comprehension score (0-100) from segment classifications. Suggests flashcards from your own words. Supports iterative refinement — re-explain, see your score improve.

**Voice Mode:** A microphone button lets you speak your explanation. Web Speech API transcribes it into the same textarea. For when you want to practice articulating ideas out loud.

**What it's not:** It never writes your explanation for you. If you ask questions instead of explaining, everything goes red.

### FSRS Spaced Repetition

A modern memory-model scheduler (FSRS-6, via ts-fsrs MIT library) that tells you exactly when to review each card for maximum retention with minimum effort. Reduces review load ~20-30% vs the old SM-2 algorithm.

- Four-button grading: Again / Hard / Good / Easy
- JOL confidence gate: before revealing the answer, you rate how sure you are (1-5). This feeds the calibration dashboard.
- Intra-session relearning: lapsed cards (Again) re-queue immediately
- Timezone-safe: due dates stored as UTC, compared against your local day boundary
- Cards come from Feynman, research, video notes, error spotter, or manual creation

### Evidence-Based Study Mix

An interleaved practice queue built on Brunmair & Richter (2019):

- Vocabulary topics are always **blocked** (sequential) — interleaving hurts word-list recall
- Math/procedural and visual discrimination topics are **interleaved** within confusable same-subject topics
- Queue weighted toward your weakest areas: 70% FSRS difficulty + 30% inverse Feynman score
- Queue size scales to actual due-card load (no artificial cap)

You set each topic's material type in Settings → Subjects.

### Error Spotter

Based on the "derring effect" (Springer 2023) — deliberately committing and correcting errors in low-stakes contexts enhances far-transfer learning more than errorless elaboration.

The AI writes a 200-350 word explanation of your topic with 1-3 hidden mistakes. You read it carefully, select the text you think is wrong, and explain why. Then it reveals what was actually wrong, what you caught, and what you missed.

Difficulty adapts from your Feynman comprehension scores. Low scores → obvious factual errors. High scores → subtle conceptual errors that require deep understanding.

Scoring: +15 XP per correct identification, +5 per partial, -5 per false positive (minimum 0).

### Research Desk

Real academic sources, not fabricated literature reviews.

Queries three real APIs:
- **OpenAlex** (CC0 scholarly catalog, 240M+ works) — primary
- **Crossref** — supplementary DOI/metadata
- **Unpaywall** — open-access PDF discovery

Every citation maps to an actual retrieved source. When fewer than 2 sources are found, the system says so explicitly. Model supplementation (if any) is visibly labeled "unverified."

One-click "Ingest Open Access PDF" runs the full-text through the RAG pipeline.

### Hybrid Paper RAG

Dual-mode retrieval fused with Reciprocal Rank Fusion (RRF):

- **Vector leg** — pgvector cosine similarity (text-embedding-3-small, 1536 dims)
- **Lexical leg** — ts_rank_cd over a generated tsvector GIN index

When no embedding API key is configured → ranked lexical-only (never an unranked scan). Citations reference the actual retrieved chunk (paper title, section, chunk index) — no default-to-zero fallback.

Students can upload PDFs (up to 20MB) or ingest by URL from Unpaywall.

### Video Study Room

YouTube search filtered to educational content. Video embeds with programmatic timestamp control. Auto-extracted transcripts (youtube-transcript-plus, with Groq Whisper fallback for unavailable captions).

**AI Notes:** Select a time range → system slices transcript → LLM generates structured notes with summary, key concepts (with timestamp citations), and flashcard pairs.

**Rich Text Editor:** Tiptap-based with full markdown formatting, custom timestamp marks (clickable badges that seek the video to that moment), keyboard shortcut (Ctrl+Shift+T) to insert current playback time, and AI inline ghost-text completions.

**Cornell Notes Mode:** Three-zone structured layout (notes 70%, cue questions 30%, summary bottom). AI generates recall questions from your notes after 5 seconds of inactivity. One-click conversion of cue questions to flashcards.

### Listen Mode

Turns your Feynman explanations and flashcards into a two-host conversational podcast script. Uses Web Speech API synthesis for client-side playback (no external TTS cost).

Two voices — a "host" who explains clearly with analogies, and a "student" who asks clarifying questions and brings up edge cases. Includes embedded recall pauses.

Click any segment to hear it individually, or play all sequentially. Generated from YOUR content — never invents facts beyond what you've studied.

Research basis: arxiv.org/html/2409.04645 — AI-generated personalized podcasts led to significantly improved learning outcomes.

### Practice Exam

Upload a PDF or paste your notes. AI generates a timed exam from YOUR material:

- Two modes: Quick (10 questions, 10 min) and Full (20 questions, 30 min)
- Question types: MCQ (4 options), short answer, explain-in-your-own-words
- MCQ graded deterministically, open-ended graded by LLM
- Results page with score %, section breakdown, difficulty analysis
- Auto-generates flashcards from missed questions (feed into FSRS queue)
- Exam history with past scores and retake ability

### Spacing-Aware Study Planner

Session distribution using the Cepeda et al. (2008) temporal ridgeline — optimal interstudy gap as a function of days-until-exam:

- Sessions spread with expanding gaps (not crammed to today)
- Asymmetric cost: when uncertain, gaps err wider (under-spacing harms far more than over-spacing)
- Near-exam boost: subjects within 14 days get FSRS request_retention = 0.95
- Missed-session forward-fill: marking a session missed reschedules it to the next free day
- Academic event merge: semester events surface as calendar chips and warning strips

### University-Aware Onboarding

Tell Nora your university, faculty, department, year, and term. It finds your institution's official academic data — calendar, registration/add-drop/midterm/final dates, holidays, curriculum.

- Diacritic-insensitive Turkish-aware matching (ODTÜ / METU first launch)
- Never invents dates — missing dates stored as "unreleased"
- Background ingestion via job queue; student enters app immediately
- Academic RAG: students can ask "When is the add-drop deadline?" grounded in official sources
- Currently supports 200+ Turkish and Azerbaijani universities

### Memory Garden

A pixel-art visualization of your knowledge decay. Each topic is a plant:

- 🌸 **Blooming** (R > 0.85) — you remember this well
- 🌿 **Healthy** (R 0.60-0.85) — still fresh
- 🥀 **Wilting** (R 0.30-0.60) — needs watering (review)
- 💀 **Dead** (R < 0.30) — forgotten
- 🌱 **Seedling** — new, never reviewed

Retrievability computed from FSRS: R = e^(-elapsed_days / stability). Tap a wilting plant to jump directly into a review session for that topic.

### Knowledge Web

AI extracts key concepts from your topics and maps their relationships. Rendered as an interactive mastery-colored grid (no heavy graph library — stays lightweight and pixel-styled).

Relationships: "builds-on" (prerequisites), "relates-to" (shared patterns), "contradicts" (tension). Click a concept to see what it connects to. Mastery bars from FSRS stability.

### Eureka Connections

Cross-subject "aha!" moments. AI compares topics from DIFFERENT subjects and finds surprising parallels. Presents them as delightful insights with a challenge: "Explain how X from Physics relates to Y from Economics."

Needs at least 4 topics across 2+ subjects. Each connection includes a Feynman-style challenge for bonus XP.

### Card Market

Browse and import flashcard decks shared by your study party members. One-click import with fresh FSRS state (no inherited intervals — your schedule starts clean).

Shows creator name, card count, topic. Requires party membership. Only shows topics with 3+ cards.

### Social Parties

Small cooperative study groups (3-5 members) with shared weekly quests and gentle social accountability.

- Create or join parties (public discovery or private invite codes)
- Shared weekly quests aggregating individual contributions
- "Help Me" quests: when a member misses 2+ days, the party gets a collaborative quest to help them (not punish them)
- 6 cheer emojis, short messages for coordination
- No competition, no rankings — just companionship

### Pixel Room & Pet

A cozy pixel-art virtual study room with your customizable avatar and an animated companion pet (Pokémon-style sprites).

Pet mood mirrors your real study habits:
- Happy (affinity > 70): you're studying consistently
- Neutral (40-70): could use a bit more
- Sad (< 40): missing days gradually lowers affinity
- Forest rescue: retreated completely (restorative quest needed)

Daily missions tied to real study actions. Room items, avatar customization unlocking through levels.

### Confidence Calibration (Metacognition)

Tracks the correlation between your JOL confidence ratings (1-5) and actual recall success. Shows whether you're overconfident, underconfident, or well-calibrated.

A calibration curve chart (confidence level on X, actual success rate on Y) compared to the perfect diagonal. Per-topic breakdown reveals which subjects have the worst calibration.

Research: MIT 2025 — students who received feedback on their metacognitive accuracy showed transformed learning behaviors.

### Floating Study Session Tracker

A small floating widget on every page. Start a session, go study (review cards, write Feynman explanations, watch videos, do research) — it tracks what you did and for how long.

When you end the session: a cozy "study receipt" appears showing total time, activity breakdown with duration bars, and a timeline of what you did. Downloadable as an image.

### Analytics Dashboard

- Weekly statistics: sessions, cards reviewed, cards created, study minutes
- 30-day bar charts for daily activity
- GitHub-style consistency heatmap
- Per-topic mastery bars (from FSRS + Feynman scores)
- Confidence calibration section (see above)

---

## The Aesthetic

Everything is pixel art. Not because it's trendy, but because it makes studying feel like a game — warm, low-stakes, cozy. The visual language borrows from Stardew Valley and life-sim games:

- **8px spacing grid** for all layout
- **SproutLands pixel font** for headings and navigation
- **`image-rendering: pixelated`** on all sprite elements
- **Warm earth tones** — cream/parchment backgrounds, dark brown text, amber/gold accents, sage green success, muted red errors
- **CSS `steps()` animations** for sprite transitions
- 30-component custom pixel-UI library: Nine-Slice panels, pixel buttons, dialog frames, stat cards, heatmaps, progress bars, toast notifications, command palette, onboarding tour

Dark mode (primary) uses warm brown backgrounds. Light mode uses parchment. Both maintain the cozy feeling.

### Sound Design

8-bit sound effects generated live with the Web Audio API — procedural oscillators, no audio files loaded. Sidebar mute toggle for accessibility. Used for navigation clicks, XP rewards, and session completions.

---

## The Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions, RSC) |
| Language | TypeScript strict — Node.js ≥ 20 |
| UI | React 19, Tailwind CSS v4, custom pixel-UI components |
| Database | Supabase — Postgres, pgvector, Row Level Security, Storage |
| Auth | Supabase Auth (email/password), gated via proxy.ts |
| Spaced Repetition | ts-fsrs (MIT) — FSRS-6 DSR model |
| AI (primary) | Groq Cloud (Llama 3.3 70B) |
| AI (fallback) | OpenRouter (free tier) |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Academic Sources | OpenAlex (CC0), Crossref Polite Pool, Unpaywall |
| RAG Retrieval | pgvector cosine + ts_rank_cd FTS → RRF fusion |
| Rich Text | Tiptap v3 (custom timestamp mark extension) |
| PDF Parsing | pdf-parse (default); unpdf optional |
| Video | YouTube IFrame API + youtube-transcript-plus |
| Testing | Vitest + fast-check (property-based) — 332+ tests |

### Architecture Principles

1. **Monolith-first** — single Next.js + Supabase project, no microservices
2. **Server Actions over API routes** — business logic in `_actions/` with RSC data fetching
3. **Pure functions for core logic** — FSRS scheduling, spacing math, study-mix queue, Feynman scoring — all unit-testable without database
4. **RLS everywhere** — every user-owned table has user_id = auth.uid() policies
5. **Graceful degradation** — each optional API key's absence degrades a feature, never breaks the app
6. **SSRF protection** — all outbound fetches go through lib/ssrf.ts (blocks private/loopback/metadata addresses)

### Data Model (19 Migrations)

- `profiles` — XP, coins, level, timezone, preferences
- `subjects`, `topics` — what you study (with material_type for interleaving logic)
- `study_sessions` — every study session logged with mode and duration
- `feynman_explanations` — your explanations + AI gap analysis + score
- `cards` — flashcards with full FSRS state (stability, difficulty, due, state)
- `card_reviews` — grading history + JOL confidence per review
- `pets` — companion type, name, state, affinity
- `papers`, `paper_chunks` — academic sources + embedded chunks for RAG
- `videos`, `notes`, `video_transcripts` — video study room data
- `academic_profiles`, `academic_events`, `academic_sources` — university context
- `ingestion_jobs` — durable background work queue
- `parties`, `party_members`, `party_quests`, `party_messages`, `cheers` — social
- `practice_exams` — exam results and history

---

## The Gamification

Not points for points' sake. Every reward maps to a real study behavior:

| Action | XP | Coins | Pet Affinity |
|--------|-----|-------|-------------|
| Feynman explanation | +15 | +5 | +3 |
| Card review (Good/Easy/Hard) | +3 | +1 | +1 |
| Card review (Again — lapse) | +1 | — | — |
| Card created | +2 | — | — |
| Study session complete | +10 | +3 | +2 |
| All daily missions | +20 | +10 | +5 |
| Party quest completed | +50 | +25 | — |
| Error Spotter (correct) | +15 | — | — |

**Level formula:** `floor(sqrt(xp / 50)) + 1`

XP → level-ups → cosmetic unlocks. Coins → direct purchases. Never pay-to-win, never pay-to-learn.

---

## What Makes This Different

1. **It forces you to think.** Feynman mode, error spotting, and retrieval practice mean you can't passively scroll through content. Understanding is the requirement, not the byproduct.

2. **The AI is a tutor, not an author.** It asks questions, finds gaps, evaluates your understanding, and helps you research. It never writes your assignments or pretends to be a homework generator.

3. **Every claim is grounded.** Research citations, academic sources, university calendars — everything comes from a verified source or is explicitly labeled "unverified." No hallucinated facts, no fabricated literature reviews.

4. **Compassion over punishment.** No streak resets. No guilt. Missed days become "help me" quests for friends. The pet gets sad but recovers through gentle actions. The system responds to burnout signals by suggesting rest, not more work.

5. **It's a real system, not a weekend hack.** 19 database migrations, 332+ unit tests, TypeScript strict, proper RLS security, SSRF protection, rate limiting, graceful degradation. This is production engineering.

6. **The aesthetic has soul.** It feels like a little RPG world you're living in while studying — not a corporate dashboard, not a clinical productivity tool.

---

## Live

**URL:** https://norastudy.vercel.app  
**Repo:** https://github.com/lxcario/Nora  
**License:** MIT (application code); LPC assets CC BY-SA 3.0 / GPL 3.0; UI assets CC0

---

*Built with pixels, science, and a lot of coffee.*

**Nora** — because studying shouldn't feel lonely.
