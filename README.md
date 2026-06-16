<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/AI-Groq%20%2B%20OpenRouter-FF6F00?style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript" />
</p>

# 🎮 Nora

> A softer way to study — combining evidence-based learning techniques with a cozy pixel-art world where your Pokémon companion evolves as you master topics through Feynman explanations, spaced repetition, AI-powered research, and video study rooms.

---

## ✨ What Makes This Different

Nora isn't another generic study timer or AI homework helper. It's built on six evidence-based learning strategies from cognitive psychology:

- **Feynman Technique** — Explain concepts in your own words; AI identifies knowledge gaps
- **Spaced Repetition (SM-2)** — Review flashcards at scientifically optimal intervals
- **Interleaved Practice** — Mix study modalities for deeper retention
- **Retrieval Practice** — Active recall through flashcards and quizzes
- **Elaboration** — Connect ideas, find analogies, go deeper
- **RAG-Powered Research** — Ask questions about your uploaded papers with cited answers

All wrapped in a pixel-art game world where your Pokémon pet's happiness reflects your real study habits.

---

## 🏠 Features

### 🧠 Feynman Mode
Explain any topic in your own words. The AI "Inquisitive Student" evaluates your explanation with:
- Color-coded gap analysis (green = accurate, amber = vague, red = wrong)
- Probing questions that test deeper understanding
- Auto-generated flashcards from your explanation
- Inline autocomplete suggestions while typing

### 📚 SM-2 Flashcard Review
- Full SM-2 algorithm implementation (interval, repetition, ease factor)
- Grade 0-5 with color-coded buttons
- Cards from Feynman, Research, or Video study automatically enter the review queue
- Per-card editing before save (accept/reject/modify)

### 🔀 Study Mix (Interleaved Practice)
- Automatically builds a mixed queue: flashcards + Feynman prompts + research questions
- Interleaves across subjects and modalities for "desirable difficulty"
- Progress tracking and session completion stats

### 🎬 Video Study Room
- **YouTube video search** with educational filtering (category, duration, heuristic scoring)
- **Transcript extraction** with caching (youtube-transcript-plus + Groq Whisper fallback)
- **Timestamp-aware AI notes** — select a time range, get structured notes with key concepts
- **Tiptap rich text editor** with clickable timestamp marks (Ctrl+Shift+T to insert)
- **AI inline completions** in the note editor (2s inactivity → ghost text → Tab to accept)
- **Feynman-with-video** — "Explain what you just watched" evaluated against the transcript
- **Flashcard generation** from any video segment, linked back to source timestamps

### 🔬 Research Desk
- **Web Research** — AI-synthesized answers from Wikipedia + Open Library with citations
- **Paper RAG** — Upload PDFs, auto-chunk/index, ask questions with cited answers
- Dual-mode retrieval: pgvector cosine similarity (with OpenAI key) or Postgres FTS (free)
- Suggested flashcards from research findings

### 🐾 Pixel Room & Pet System
- Choose from 12 animated Pokémon companions (PokéAPI Gen V sprites)
- Pet evolves based on your level (Stage 2 at Lv5, Stage 3 at Lv15)
- Pet mood (happy/neutral/sad) reflects your last 3 days of study activity
- Daily missions with progress bars linking to actual study actions
- Daily motivational quote

### 👥 Social Parties
- Create or join study groups (public discovery or invite code)
- Shared weekly quests (cards reviewed, Feynman sessions, study minutes)
- "Help quests" auto-generated for members who miss 2+ days (compassionate design)
- Real-time cheers (6 Lucide icon reactions, daily cooldown)
- Party chat with character limit and content filtering
- Presence indicators showing who's currently studying

### 📊 Analytics Dashboard
- Sessions/week, cards reviewed, cards created, study minutes, streak
- 30-day bar charts with hover tooltips
- GitHub-style consistency heatmap
- Topic mastery progress bars (color-coded by average grade)

### 📅 Study Planner
- Weekly calendar view (Mon–Sun)
- Completed sessions shown as colored chips
- Auto-suggestions: "Review due cards today", "Feynman session for upcoming exam"

---

## 🎯 Gamification

| Action | XP | Coins | Pet Affinity |
|--------|-----|-------|-------------|
| Feynman explanation | +15 | +5 | +3 |
| Card review (grade ≥ 3) | +3 | +1 | +1 |
| Card review (grade < 3) | +1 | — | — |
| Card created | +2 | — | — |
| Study session complete | +10 | +3 | +2 |
| All daily missions | +20 | +10 | +5 |

**Level formula:** `floor(sqrt(xp / 50)) + 1`

Lv2 at 50 XP → Lv3 at 200 XP → Lv4 at 450 XP → Lv5 at 800 XP

### 🔊 8-Bit Sound Effects
- Procedural Web Audio API oscillators (no audio files)
- XP gained → ascending triangle-wave chirp
- Card saved → short arpeggio
- Session complete → triumphant fanfare
- Overlap suppression (bigger sounds suppress smaller ones)
- Mute toggle in sidebar

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript (strict mode) |
| React | 19.2.4 |
| Database | Supabase (Postgres + pgvector + RLS + Storage) |
| Auth | Supabase Auth (email/password) |
| AI (Primary) | Groq Cloud (Llama 3.3 70B, ~2s response) |
| AI (Fallback) | OpenRouter (free tier, ~15-30s) |
| Transcription | Groq Whisper (fallback for videos without captions) |
| Rich Text | Tiptap v3 (custom timestamp mark extension) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| PDF Parsing | pdf-parse v1 |
| Video | YouTube IFrame API + youtube-transcript-plus |
| Sprites | PokéAPI (animated Gen V), Sprout Lands UI Pack |
| Testing | Vitest + fast-check (property-based) |
| Audio | Web Audio API (procedural 8-bit SFX) |
| Music | Streaming internet radio (lo-fi, jazz, ambient) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/nora.git
cd nora

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_key
YOUTUBE_API_KEY=your_youtube_data_api_key
# Optional: enables vector search for RAG (otherwise uses free FTS)
OPENAI_API_KEY=your_openai_key
```

### Database Setup

Run migrations in order via the Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_social_parties.sql
supabase/migrations/003_rag_extensions.sql
supabase/migrations/003b_storage_bucket.sql
supabase/migrations/004_study_room.sql
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start studying.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Signup
│   ├── (protected)/app/     # Main app (all features)
│   │   ├── _actions/        # Server actions (17 files)
│   │   ├── _components/     # Shared UI (sidebar, toasts, etc.)
│   │   ├── feynman/         # Feynman Mode
│   │   ├── review/          # SM-2 Review
│   │   ├── study/           # Study Mix
│   │   ├── study-room/      # Video Study Room
│   │   ├── research/        # Research Desk + RAG
│   │   ├── room/            # Pixel Room + Pet
│   │   ├── party/           # Social Parties
│   │   ├── planner/         # Study Planner
│   │   ├── analytics/       # Analytics Dashboard
│   │   └── settings/        # Profile, Pet, Topics
│   └── globals.css          # Tailwind + pixel font + animations
├── lib/
│   ├── sm2.ts               # SM-2 algorithm
│   ├── gamification.ts      # XP/level calculations
│   ├── pokeapi.ts           # PokéAPI integration
│   ├── sfx.ts               # 8-bit sound effects
│   └── supabase/            # Supabase clients + types
├── proxy.ts                 # Auth middleware
supabase/
├── migrations/              # 5 SQL migrations
public/
├── fonts/                   # Pixel font
├── sprites/ui/              # UI spritesheets
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests include:
- SM-2 algorithm correctness
- Transcript slicing and time parsing
- Search heuristic scoring
- RAG chunker and embedder
- Property-based tests with fast-check

---

## 📝 Design Philosophy

1. **Learning over engagement** — Every game mechanic maps to real study behavior
2. **AI as tutor, not author** — AI asks questions, identifies gaps, and suggests — never writes your work
3. **Compassionate design** — No punishment for missed days; "help quests" support struggling members
4. **Progressive complexity** — Start with one topic, one card; grow into full research pipelines
5. **Offline-first data** — Transcripts and notes cached; works even when APIs are slow

---

## 🙏 Credits & Licenses

- **Sprout Lands UI Pack** by Cup Nooble — pixel font and UI elements
- **PokéAPI** — Pokémon data and animated sprites (fan use)
- **Lucide** — MIT-licensed icon set
- **Tiptap** — MIT-licensed rich text editor
- **SM-2 Algorithm** — Public domain (Piotr Wozniak, 1987)

---

## 📜 License

MIT

---

<p align="center">
  <em>Built with 🎮 pixels, 🧠 science, and ☕ way too much coffee.</em>
  <br/>
  <strong>Nora</strong> — a softer way to study.
</p>
