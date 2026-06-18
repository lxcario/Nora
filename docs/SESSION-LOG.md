# Pixel Study OS — Session Log (June 16, 2026)

## Overview

Built Pixel Study OS from zero to a fully functional study web app in a single session. The app combines evidence-based learning workflows (Feynman technique, spaced repetition, research desk) with gentle gamification (Pokémon pets, XP, missions) and a cozy pixel-art aesthetic.

**Tech Stack:** Next.js 16 (TypeScript, App Router) + Supabase (Postgres, Auth, RLS) + Tailwind CSS + Lucide icons + Groq/OpenRouter AI + PokéAPI + Sprout Lands UI Pack

---

## What Was Built (Phase by Phase)

### Phase 0 — Repo & Docs (Pre-existing)
- `docs/MAIN.md` — Full product & architecture spec
- `docs/PLAN.md` — 13-phase build roadmap
- `docs/ASSETS.md` — Asset licensing & attribution guide
- `.kiro/skills/pixel-study-os/SKILL.md` — Agent skill file

### Phase 1 — Next.js + Supabase Setup ✅
- Initialized Next.js 16.2.9 with TypeScript, App Router, Tailwind CSS
- Installed `@supabase/supabase-js` and `@supabase/ssr`
- Created Supabase client utilities:
  - `src/lib/supabase/server.ts` — Server-side client (uses cookies)
  - `src/lib/supabase/client.ts` — Browser-side client
- Created `src/proxy.ts` (Next.js 16's replacement for middleware):
  - Refreshes Supabase session on every request
  - Redirects unauthenticated users from `/app/*` to `/login`
  - Redirects authenticated users from `/login`/`/signup` to `/app`
- Auth pages:
  - `src/app/(auth)/login/page.tsx` — Email/password login with `useActionState`
  - `src/app/(auth)/signup/page.tsx` — Email/password registration
  - `src/app/(auth)/_actions/auth.ts` — Server actions for login, signup, signout
  - `src/app/auth/callback/route.ts` — OAuth/email confirmation callback handler
- Protected app layout with server-side auth check
- Connected to Supabase project: `hwoaljqtjlagxacvopnc.supabase.co`
- Environment variables in `.env.local` (gitignored)

### Phase 2 — Database Schema & RLS ✅
- Created `supabase/migrations/001_initial_schema.sql` with:
  - `pgvector` extension enabled
  - 11 tables: `profiles`, `subjects`, `topics`, `study_sessions`, `feynman_explanations`, `cards`, `card_reviews`, `avatars`, `pets`, `papers`, `paper_chunks`
  - RLS enabled on ALL tables with `user_id = auth.uid()` policies
  - Auto-create profile trigger (`handle_new_user`) on auth signup
  - Performance indexes (cards next_review, sessions, reviews)
  - Vector similarity index on `paper_chunks.embedding`
- Created `src/lib/supabase/database.types.ts` — Hand-written TypeScript types matching the schema
- Created `supabase/seed.sql` — Template for dev seed data
- Schema was run manually via Supabase SQL Editor

### Phase 3 — UI Shell & Navigation ✅
- Client-side sidebar component with:
  - Lucide icons for each nav item
  - Active route highlighting via `usePathname()`
  - Pixel font branding ("Pixel Study OS")
  - Sign out button
  - Music player (added later)
- Shared page header component (`PageHeader`)
- All app routes created as structured pages:
  - `/app` (dashboard), `/app/room`, `/app/feynman`, `/app/review`
  - `/app/research`, `/app/planner`, `/app/analytics`, `/app/settings`
- Dashboard with stat cards and navigation cards

### Phase 4 — Feynman Mode ✅
**The core study feature — explain concepts, get AI evaluation.**

- **Subjects & Topics Management** (`_actions/subjects.ts`):
  - CRUD for subjects (name + color)
  - CRUD for topics (name + optional exam date, linked to subject)
  - Integrated into Settings page with `SubjectsManager` component

- **AI Evaluation** (`_actions/feynman.ts`):
  - Calls Groq (primary, ~2-3s) or OpenRouter free (fallback, ~15-30s)
  - "Inquisitive Student" prompt that:
    - KNOWS the topic (subject + topic name injected into prompt)
    - Asks probing questions (edge cases, implications, trade-offs)
    - Paraphrases the student's explanation
    - Color-codes segments: GREEN (accurate), AMBER (vague), RED (wrong/missing)
    - Generates flashcard Q/A pairs from the explanation
  - Rejects questions as input (forces explanation, not asking)
  - Stores results in `feynman_explanations` table
  - Awards +15 XP on completion

- **Inline Autocomplete** (`_actions/autocomplete.ts`):
  - When textarea is empty: suggests an opening sentence for the topic
  - When user stops typing for 2 seconds: suggests a continuation
  - Press Tab to accept the ghost text suggestion
  - Uses Groq for speed

- **Frontend** (`feynman/_components/feynman-editor.tsx`):
  - Topic selector dropdown (populated from user's subjects/topics)
  - Textarea with ghost-text autocomplete overlay
  - "Evaluate with AI" button with loading states
  - Results display: questions, paraphrase, color-coded gap analysis, suggested cards
  - "Save All Cards" button → creates cards with `source_type: 'feynman'`

### Phase 5 — SM-2 Flashcards & Review ✅
**Spaced repetition engine with real scheduling.**

- **SM-2 Algorithm** (`src/lib/sm2.ts`):
  - Pure function implementing the SM-2 formula
  - Inputs: current interval, repetition count, efactor, grade (0-5)
  - Outputs: new interval, repetition, efactor, next_review_at date
  - Grade >= 3: successful recall (interval grows)
  - Grade < 3: failed recall (reset to interval=1)

- **Review Actions** (`_actions/review.ts`):
  - `getDueCards()` — fetches cards where `next_review_at <= today`
  - `submitReview()` — applies SM-2, updates card, logs to `card_reviews`, awards XP
  - `deleteCard()` — permanently removes bad cards

- **Review Session UI** (`review/_components/review-session.tsx`):
  - Progress bar (card N of M)
  - Card display: front (question) → click "Reveal Answer" → back (answer)
  - Grade buttons 0-5 (color-coded: red→orange→amber→green)
  - Topic/source badge on each card
  - Delete card button for low-quality cards
  - Session complete screen with trophy

### Phase 6 — Study Planner ✅
**Weekly calendar with auto-generated suggestions.**

- **Planner Actions** (`_actions/planner.ts`):
  - `getWeeklyPlan(offset)` — fetches real sessions + generates suggestions:
    - If due cards exist → suggests review session for today
    - If exam within 14 days → suggests Feynman session
  - `startSession()` / `completeSession()` — session lifecycle management

- **Weekly Calendar UI** (`planner/_components/weekly-calendar.tsx`):
  - 7-day grid (Mon-Sun) with today highlighted
  - Sessions shown as colored chips (indigo=Feynman, green=Review, amber=Research)
  - Week navigation (Prev/Next)
  - Color-coded legend

### Phase 7 — Pixel Room + PokéAPI Pets ✅
**The gamification centerpiece — your Pokémon study companion.**

- **PokéAPI Integration** (`src/lib/pokeapi.ts`):
  - `getPokemon(id)` — fetches sprite, types, name
  - `getEvolutionChain(id)` — finds evolution stages
  - `getEvolutionForLevel(evolutions, level)` — determines current form based on user level
  - Animated Gen V pixel sprites (from raw.githubusercontent.com)
  - 12 starter Pokémon options (Pikachu, Eevee, Bulbasaur, etc.)
  - Evolution tied to user level: Lv.1-4 = base, Lv.5-14 = stage 2, Lv.15+ = final form

- **Room State** (`_actions/room.ts`):
  - Fetches avatar, pet, profile (XP/coins/level)
  - Computes pet state from last 3 days of study activity (happy/neutral/sad)
  - Generates today's missions from real data (due cards, Feynman completions, sessions)
  - Checks evolution chain for current Pokémon form

- **Pixel Room UI** (`room/_components/pixel-room.tsx`):
  - CSS-drawn study room (placeholder — needs proper tileset)
  - Animated Pokémon sprite with state-colored border
  - HUD overlay: Level, XP, Coins, Pet name, Affinity %
  - Pet status message based on mood
  - "Ready to evolve!" indicator when close to next evolution
  - Daily quote (from ZenQuotes API)
  - Today's Missions with progress bar — links to actual study pages

- **Pet Selector** (`settings/_components/pet-selector.tsx`):
  - Grid of 12 animated Pokémon sprites
  - Click to select, optional nickname, save to database

### Phase 8 — AI Research Desk ✅
**Ask questions, get deep AI-researched answers with citations.**

- **Research Actions** (`_actions/research.ts`):
  - `performResearch(query)`:
    1. AI extracts optimal search keywords from natural language question
    2. Searches Wikipedia API + Open Library in parallel
    3. Feeds sources to Groq for deep synthesis (1500+ word report)
    4. Returns: answer, sources list, suggested flashcards
  - `createCardsFromResearch()` — saves cards with `source_type: 'research'`
  - Keyword extraction step so "How can I become a good person?" → searches "ethics morality virtue self-improvement"
  - AI answers from its own knowledge + supplements with sources (not limited to sources only)

- **Research Desk UI** (`research/_components/research-desk.tsx`):
  - Research question input (natural language)
  - "Save cards to" topic selector
  - Loading state with progress message
  - AI Analysis section (multi-paragraph research report)
  - Numbered sources with type icons (book/wiki) and external links
  - Suggested flashcards with "Save All Cards" button

### Phase 9 — Analytics Dashboard ✅
**Visual feedback on progress and mastery.**

- **Analytics Actions** (`_actions/analytics.ts`):
  - Aggregates: sessions this week, cards reviewed (30d), cards created, study minutes, streak
  - Daily sessions and reviews (last 30 days) for charts
  - Topic mastery (average grade per topic from reviews)
  - Streak calculation (consecutive days with activity)

- **Analytics UI** (`analytics/_components/analytics-dashboard.tsx`):
  - 5 stat cards (sessions, reviews, cards, minutes, streak)
  - Bar charts: sessions/day and reviews/day (30 days, with hover tooltips)
  - Consistency heatmap (GitHub-style, 30 days, 4 color levels)
  - Topic mastery progress bars (color-coded by avg grade)

### Phase 10 — Gamification (XP, Coins, Levels) ✅
**Rewards tied to real study behaviors.**

- **Gamification Logic** (`_actions/gamification.ts` + `src/lib/gamification.ts`):
  - XP rewards:
    - Feynman explanation: +15 XP, +5 coins
    - Card review (good, grade≥3): +3 XP, +1 coin
    - Card review (bad, grade<3): +1 XP
    - Card created: +2 XP
    - Session completed: +10 XP, +3 coins
    - All daily missions done: +20 XP, +10 coins
  - Level formula: `floor(sqrt(xp / 50)) + 1`
    - Lv2 at 50 XP, Lv3 at 200 XP, Lv4 at 450 XP, Lv5 at 800 XP
  - Pet affinity increases with study activity
  - Pet state auto-updates based on affinity score
  - `choosePet(pokemonId, nickname)` — sets/updates user's pet

- **Integration**: XP automatically awarded in review and feynman actions

### Phase 13 — Polish & Accessibility ✅
- Landing page (`/`) — marketing page with feature grid, pixel font, CTAs
- 404 page — pixel-styled with "Go to Dashboard" link
- Error boundary — catches runtime errors, shows retry button
- Loading state — spinner animation for route transitions
- Pixel font applied to headings throughout the app

### Additional Features (Beyond Original Plan)

**Music Player (sidebar):**
- Mini expandable player at bottom of sidebar
- 5 free lo-fi/ambient internet radio streams
- Play/pause, skip, volume control
- Animated equalizer indicator when playing
- No downloads, no copyright issues — streaming from licensed stations

**Sprout Lands UI Pack Integration:**
- Pixel font (`pixelFont-7-8x14-sproutLands.ttf`) loaded globally
- UI sprites moved to `public/sprites/ui/` (buttons, dialogs, icons, emojis)
- Available for future UI polish passes

**Daily Quote (Pixel Room):**
- ZenQuotes API for daily motivational quote
- 6 fallback quotes about learning if API is down

---

## API Keys & Services Used

| Service | Purpose | Key Location |
|---------|---------|-------------|
| Supabase | Database, Auth, RLS | `.env.local` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) |
| Groq | Primary AI (fast, ~2-3s) | `.env.local` (GROQ_API_KEY) |
| OpenRouter | Fallback AI (free, slower) | `.env.local` (OPENROUTER_API_KEY) |
| PokéAPI | Pokémon sprites & data | No key needed |
| Open Library | Book search | No key needed |
| Wikipedia API | Article search | No key needed |
| ZenQuotes | Daily quotes | No key needed |
| SomaFM/others | Music streams | No key needed |

---

## File Structure (Key Files)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── _actions/auth.ts          — Login/signup/signout server actions
│   │   ├── login/page.tsx             — Login page
│   │   ├── signup/page.tsx            — Signup page
│   │   └── layout.tsx                 — Auth layout
│   ├── (protected)/app/
│   │   ├── _actions/
│   │   │   ├── feynman.ts            — AI evaluation + card creation
│   │   │   ├── autocomplete.ts       — Inline suggestion for Feynman editor
│   │   │   ├── review.ts             — SM-2 review + delete card
│   │   │   ├── subjects.ts           — Subject/topic CRUD
│   │   │   ├── planner.ts            — Weekly plan generation
│   │   │   ├── room.ts               — Pixel room state + PokéAPI
│   │   │   ├── research.ts           — AI research desk
│   │   │   ├── analytics.ts          — Stats aggregation
│   │   │   ├── gamification.ts       — XP/coins/pet rewards
│   │   │   └── quotes.ts             — Daily motivational quote
│   │   ├── _components/
│   │   │   ├── sidebar.tsx            — Navigation sidebar
│   │   │   ├── page-header.tsx        — Reusable page header
│   │   │   └── music-player.tsx       — Lo-fi music player
│   │   ├── feynman/_components/feynman-editor.tsx
│   │   ├── review/_components/review-session.tsx
│   │   ├── research/_components/research-desk.tsx
│   │   ├── room/_components/pixel-room.tsx
│   │   ├── planner/_components/weekly-calendar.tsx
│   │   ├── analytics/_components/analytics-dashboard.tsx
│   │   ├── settings/_components/subjects-manager.tsx
│   │   ├── settings/_components/pet-selector.tsx
│   │   ├── layout.tsx                 — Protected app shell
│   │   ├── page.tsx                   — Dashboard
│   │   ├── loading.tsx                — Loading spinner
│   │   └── error.tsx                  — Error boundary
│   ├── auth/callback/route.ts         — Auth callback handler
│   ├── page.tsx                       — Landing page (marketing)
│   ├── not-found.tsx                  — 404 page
│   ├── layout.tsx                     — Root layout
│   └── globals.css                    — Tailwind + pixel font + utilities
├── lib/
│   ├── supabase/server.ts             — Server Supabase client
│   ├── supabase/client.ts             — Browser Supabase client
│   ├── supabase/database.types.ts     — TypeScript DB types
│   ├── sm2.ts                         — SM-2 spaced repetition algorithm
│   ├── pokeapi.ts                     — PokéAPI integration
│   └── gamification.ts                — Level/XP utility functions
├── proxy.ts                           — Auth middleware (session refresh + route protection)
supabase/
├── migrations/001_initial_schema.sql  — Full database schema
└── seed.sql                           — Dev seed data template
public/
├── fonts/sprout-lands.ttf             — Pixel font
└── sprites/ui/                        — Sprout Lands UI sprites
assets/
├── lpc/                               — LPC sprites (CC BY-SA/GPL)
├── cc0/                               — CC0 assets (Kenney, fonts)
└── custom/                            — Custom assets
```

---

## Known Issues / TODO for Next Session

1. **Pixel Room background** — Currently CSS-drawn (ugly). Need to download Sprout Lands environment tileset or another proper pixel room background.
2. **Research Desk JSON parsing** — Sometimes fails on complex AI responses. Fixed with fallback parser but occasionally drops suggested cards.
3. **Semantic Scholar** — Rate limits on first request. Switched to Open Library + Wikipedia as primary sources. Could add Semantic Scholar API key for higher limits.
4. **Music player streams** — Some streams may go offline. Need fallback handling.
5. **Autocomplete fires too eagerly** — May burn through Groq rate limits if user types a lot.
6. **No card editing** — Can only save all suggested cards or none. Should allow individual card editing before saving.
7. **No history** — Can't see past Feynman explanations or research sessions.
8. **Phase 11 (Parties)** — Skipped. Needs schema migration for `parties`, `party_members`, `party_quests`.
9. **Phase 12 (Full RAG)** — Skipped. Needs PDF parsing pipeline.
10. **Avatar system** — Only pet works. Avatar is still a placeholder.

---

## How to Continue

1. `npm run dev` — starts the app at localhost:3000
2. Sign in with your existing account
3. Go to Settings → choose a Pokémon pet
4. Try Feynman Mode → explain a topic → review cards
5. Check Pixel Room for missions and pet status
6. Research Desk → ask any research question

Next priorities:
- Download proper room tileset (Sprout Lands environment pack from Cup Nooble)
- Visual polish with Sprout Lands UI elements
- More robust error handling
- Party system (Phase 11) if needed for hackathon

---

*Session ended at ~04:30 AM AZT, June 16, 2026.*


---

# Session 2 — June 16, 2026 (Afternoon)

## Overview

Implemented Phase 11 (Social & Parties) and Phase 12 (Full RAG Research Desk) from spec to working features in a single session. Both features went through full spec-driven development: requirements → design → task list → implementation → debugging.

---

## Phase 11 — Social & Parties ✅

**Goal:** Cooperative study groups with shared quests, cheers, messages, and "help me" mechanics.

### Database
- Created `supabase/migrations/002_social_parties.sql`:
  - 5 new tables: `parties`, `party_members`, `party_quests`, `party_messages`, `party_cheers`
  - RLS policies with `SECURITY DEFINER` function to avoid infinite recursion
  - 9 performance indexes
  - UNIQUE constraint on `party_members.user_id` (one party per user)

### Server Actions (4 modules)
- `_actions/party.ts` — createParty, joinPartyByCode, joinPartyPublic, leaveParty, discoverParties, getPartyState
- `_actions/party-quests.ts` — generateWeeklyQuests, archiveExpiredQuests, advanceWeeklyCycle, incrementQuestProgress, checkAndGenerateHelpQuests, getActiveQuests
- `_actions/party-social.ts` — sendMessage, getMessages, sendCheer, getCheers (with rate limiting, blocklist)
- `_actions/party-admin.ts` — updatePartySettings, removeMember, regenerateInviteCode, disbandParty
- `_actions/party-presence.ts` — getPartyPresence (polling-based, 60s refresh)

### UI Components
- `/app/party/page.tsx` — server component routing between discovery and member views
- `party-discovery.tsx` — public party browser + create form + invite code join
- `create-party-form.tsx` — name validation, visibility toggle, invite code display
- `party-page.tsx` — main party view with all sections
- `party-members.tsx` — avatar circles, presence dots, contribution counts
- `party-quests.tsx` — progress bars (regular + help quests with distinct styling)
- `party-messages.tsx` — message feed + send form with character counter
- `party-cheers.tsx` — Lucide icon emoji buttons + weekly totals
- `party-admin.tsx` — settings, member management, disband with double-confirm
- `party-presence-indicator.tsx` — 16×16 avatars in Pixel Room

### Integrations
- Sidebar nav updated with "Party" link (Users icon)
- Quest progress hooks in `review.ts`, `feynman.ts`, `planner.ts`
- Pixel Room shows studying party members
- Profile form made functional (was disabled placeholders)

### Key Fixes During Implementation
- RLS infinite recursion → solved with `SECURITY DEFINER` function `get_user_party_id()`
- `last_help_check_at` default changed from `now()` to `NULL`
- Owner-can-remove-members DELETE policy added
- Cheers switched from native emojis → Lucide icons (Flame, Star, ThumbsUp, Heart, Rocket, Sparkles)

---

## Phase 12 — Full RAG Research Desk ✅

**Goal:** Upload PDFs, parse/chunk/store them, and ask questions with cited answers grounded in paper content.

### Database
- Created `supabase/migrations/003_rag_extensions.sql`:
  - Added `parse_status`, `parse_error`, `chunk_count`, `storage_path` to `papers`
  - Added `section_heading`, `content_tsv` (GIN-indexed tsvector) to `paper_chunks`
  - Created `match_paper_chunks` RPC for pgvector cosine similarity search
- Created `supabase/migrations/003b_storage_bucket.sql`:
  - `papers` storage bucket with user-scoped RLS

### Pipeline Modules (`_actions/rag/`)
- `parser.ts` — PDF text extraction via `pdf-parse` (lazy-loaded to avoid DOMMatrix issues), heading detection, 60s timeout
- `chunker.ts` — 256-512 token chunks with 12% overlap, heading-aware splitting, undersized final chunk merging
- `embedder.ts` — **Dual-mode**: OpenAI embeddings when `OPENAI_API_KEY` set, returns null[] otherwise (free FTS fallback)
- `validation.ts` — 7 pure validation functions (upload, URL, question, cards, Feynman, paper state, extracted text)

### Server Actions (`_actions/rag.ts`)
- `ingestPdf(formData)` — upload → storage → parse → chunk → embed → store
- `ingestFromUrl(url, paperId?)` — download with 30s timeout → same pipeline
- `queryRag(question, scope)` — **Dual-mode retrieval**:
  - With OPENAI_API_KEY: embed query → `match_paper_chunks` RPC → pgvector cosine similarity
  - Without: Groq keyword extraction → Postgres full-text search on `content_tsv`
  - Both feed top chunks to Groq/OpenRouter for synthesis with citations
- `getIngestionStatus(paperId)` — parse_status polling
- `retryIngestion(paperId)` — reset to pending, re-run pipeline
- `deleteFullPaper(paperId)` — chunks + storage + record deletion
- `getUserPapers()` — list with RAG-specific fields
- `generateSuggestedQuestions(paperId)` — Groq generates 5 questions from paper content

### UI Components
- `research-mode-toggle.tsx` — "From web sources" / "From your papers" tabs
- `paper-upload.tsx` — drag-and-drop + URL input with client validation
- `paper-library.tsx` — status badges, retry/delete/parse buttons
- `ingestion-progress.tsx` — polling progress indicator (3s interval)
- `rag-query-panel.tsx` — question textarea + scope selector + suggested questions
- `rag-answer-display.tsx` — inline citation superscripts + expandable citations panel
- `card-from-rag.tsx` — suggested flashcards with save-all/save-individual
- `send-to-feynman.tsx` — selection-based navigation to Feynman mode

### Key Design Decisions
- **Dual-mode retrieval**: Free Postgres FTS for dev, OpenAI pgvector for hackathon (one env var flip)
- **pdf-parse v1 with lazy import**: Avoids DOMMatrix polyfill issues in Next.js server actions
- **Existing web research untouched**: Mode toggle wraps both UIs on same page
- **Suggested questions from paper content**: Auto-generated via Groq after indexing

### Key Fixes During Implementation
- `pdf-parse` v2 → downgraded to v1 (canvas polyfill issues)
- Lazy dynamic import to avoid module evaluation side effects
- Created `test/data/05-versions-space.pdf` dummy for pdf-parse self-test
- Removed exported sync functions from "use server" file (must be async)
- FTS query relaxed from strict keyword matching to direct chunk fetch (works better with few chunks)
- RAG prompt rewritten to produce multi-paragraph answers instead of single-word JSON values

---

## Additional Improvements

- **`src/lib/supabase/admin.ts`** — service role client for cross-user queries (party co-member profiles, study session presence)
- **`settings/_components/profile-form.tsx`** — functional display name + ADHD mode form (was disabled)
- **`.env.example`** — documents all env vars including optional OPENAI_API_KEY
- **`vitest.config.ts`** + test scripts added to package.json
- **Parser and chunker unit tests** with Vitest

---

## Files Created/Modified

### New Files (Phase 11 — Party)
```
supabase/migrations/002_social_parties.sql
src/app/(protected)/app/_actions/party.ts
src/app/(protected)/app/_actions/party-quests.ts
src/app/(protected)/app/_actions/party-social.ts
src/app/(protected)/app/_actions/party-admin.ts
src/app/(protected)/app/_actions/party-presence.ts
src/app/(protected)/app/party/page.tsx
src/app/(protected)/app/party/_components/party-discovery.tsx
src/app/(protected)/app/party/_components/create-party-form.tsx
src/app/(protected)/app/party/_components/party-page.tsx
src/app/(protected)/app/party/_components/party-members.tsx
src/app/(protected)/app/party/_components/party-quests.tsx
src/app/(protected)/app/party/_components/party-messages.tsx
src/app/(protected)/app/party/_components/party-cheers.tsx
src/app/(protected)/app/party/_components/party-admin.tsx
src/app/(protected)/app/room/_components/party-presence-indicator.tsx
src/lib/supabase/admin.ts
src/app/(protected)/app/settings/_components/profile-form.tsx
```

### New Files (Phase 12 — RAG)
```
supabase/migrations/003_rag_extensions.sql
supabase/migrations/003b_storage_bucket.sql
src/app/(protected)/app/_actions/rag.ts
src/app/(protected)/app/_actions/rag/parser.ts
src/app/(protected)/app/_actions/rag/chunker.ts
src/app/(protected)/app/_actions/rag/embedder.ts
src/app/(protected)/app/_actions/rag/validation.ts
src/app/(protected)/app/_actions/rag/parser.test.ts
src/app/(protected)/app/_actions/rag/chunker.test.ts
src/app/(protected)/app/_actions/rag/embedder.test.ts
src/app/(protected)/app/research/_components/research-mode-toggle.tsx
src/app/(protected)/app/research/_components/paper-upload.tsx
src/app/(protected)/app/research/_components/paper-library.tsx
src/app/(protected)/app/research/_components/ingestion-progress.tsx
src/app/(protected)/app/research/_components/rag-query-panel.tsx
src/app/(protected)/app/research/_components/rag-answer-display.tsx
src/app/(protected)/app/research/_components/card-from-rag.tsx
src/app/(protected)/app/research/_components/send-to-feynman.tsx
vitest.config.ts
.env.example
test/data/05-versions-space.pdf
```

### Modified Files
```
src/app/(protected)/app/_components/sidebar.tsx (added Party nav item)
src/app/(protected)/app/_actions/review.ts (quest progress hook)
src/app/(protected)/app/_actions/feynman.ts (quest progress hook)
src/app/(protected)/app/_actions/planner.ts (quest progress hook)
src/app/(protected)/app/room/page.tsx (party presence)
src/app/(protected)/app/room/_components/pixel-room.tsx (presence prop)
src/app/(protected)/app/research/_components/research-desk.tsx (mode toggle + RAG integration)
src/app/(protected)/app/settings/page.tsx (profile form)
package.json (pdf-parse, vitest, fast-check, test scripts)
```

---

## Spec Files Created
```
.kiro/specs/social-parties/requirements.md (12 requirements, 77 acceptance criteria)
.kiro/specs/social-parties/design.md (architecture, schema, RLS, 29 correctness properties)
.kiro/specs/social-parties/tasks.md (34 implementation tasks)
.kiro/specs/full-rag-research/requirements.md (14 requirements, 69 acceptance criteria)
.kiro/specs/full-rag-research/design.md (architecture, dual-mode, 18 correctness properties)
.kiro/specs/full-rag-research/tasks.md (25 implementation tasks)
```

---

## How to Continue

1. Run migrations in Supabase SQL Editor (003_rag_extensions.sql, 003b_storage_bucket.sql) if not done
2. `npm run dev` → test Party at `/app/party`, RAG at `/app/research` (toggle to "From your papers")
3. Upload a PDF → ask questions about it
4. When ready for hackathon: add `OPENAI_API_KEY` to `.env.local` for vector search upgrade

---

*Session ended at ~2:30 PM AZT, June 16, 2026.*


---

## Session 2 — Polish Wave (continued)

### Card Editing Before Save ✅
- Replaced "Save All Cards" in Feynman editor with per-card edit/accept/reject
- Each card has Edit (pencil) and Accept/Reject (✓/✕) buttons
- Cards default to selected (green border), click ✕ to reject
- Inline editing for front/back text
- "Save Selected (N)" counter with disabled state when 0 selected
- Component: `SuggestedCardsEditor` in `feynman-editor.tsx`

### Interleaved Study Sessions ✅
- New `/app/study` route ("Study Mix" in sidebar with Shuffle icon)
- Server action `study-session.ts` generates mixed queue:
  - Up to 5 due flashcards
  - Up to 3 stale Feynman topics (no explanation in 7 days)
  - Up to 2 RAG questions from indexed papers
- Interleaves in pattern: card → feynman → card → rag → card → feynman...
- Client component with progress bar, type badges, and per-item views:
  - Flashcard: reveal → grade (SM-2 inline)
  - Feynman: prompt + link to Feynman Mode
  - RAG: question + link to Research Desk
- Session complete screen with stats (cards reviewed, topics prompted, questions explored)

### Better Loading States ✅
- Feynman evaluation: animated 4-step progress (reading → questioning → gaps → cards)
- RAG query: animated 4-step progress (keywords → searching → synthesizing → cards)
- Steps animate sequentially with checkmarks as they "complete"

### View Transitions ✅
- Enabled `viewTransition: true` in `next.config.ts`
- Added CSS keyframes for cross-fade (fade-out + slide-up, fade-in + slide-down)
- Respects `prefers-reduced-motion` for accessibility
- All sidebar navigation now smoothly cross-fades between routes

### Micro-Interactions ✅
- `XpToast` component: floating "+XP / +coins" that drifts up and fades out (2s)
- `SuccessCheck` component: centered green checkmark pop-in with message (3s auto-hide)
- CSS animations: `float-up-fade`, `pop-in`, `shake-happy`
- All respect `prefers-reduced-motion`

### Suggested Questions for RAG ✅
- After paper indexing, Groq generates 5 clickable question chips
- Displayed as amber pill buttons above the query input
- Regenerate when user switches paper/scope in dropdown
- Click a question → immediately queries RAG with that question

---

## Remaining Polish (Not Yet Done)

1. **Empty states** — Study Mix, Paper Library, Analytics with sparse data
2. **RAG low-text guidance** — "This PDF may be image-heavy" messaging
3. **Pixel Room tileset** — Proper Sprout Lands environment (still CSS-drawn)
4. **8-bit sound effects** — Web Audio API with mute toggle
5. **Inline XP/success animations wired into actual flows** — Components exist, need to be used in Feynman/Review/Research

---

*Polish wave ended at ~3:30 PM AZT, June 16, 2026.*


---

# Session 3 — June 17, 2026

## Overview

Massive feature session: final polish pass, Video Study Room (full spec → implementation), History & Journals page, 8-bit sound effects, project rebrand to "Nora", Vercel deployment, and various bugfixes.

---

## Final Polish Pass ✅

### Empty States
- **Study Mix** (`/app/study`) — Low-diversity hint when queue has ≤2 modalities; full empty state with action cards linking to Feynman, flashcards, Research
- **Analytics** (`/app/analytics`) — "Not enough data yet" message when fewer than 3 days of history; still shows stat cards below
- **Review** (`/app/review`) — Enhanced empty state: green CheckCircle, "All caught up!" messaging, links to Feynman and Research
- **Research → Papers** — Improved paper library empty state with richer guidance

### Reward Feedback Wiring
- **Feynman evaluation complete** → XpToast (+15 XP, +5 coins)
- **Cards saved from Feynman** → SuccessCheck ("Cards saved to your deck!")
- **Card review graded** → XpToast (+3 XP/+1 coin for grade ≥ 3, +1 XP for grade < 3)
- **Review session complete** → XpToast (+10 XP, +3 coins) + SuccessCheck
- **Study Mix session complete** → XpToast + SuccessCheck
- **Cards saved from RAG** → SuccessCheck ("Cards saved from your papers!")

### Low-Text PDF Guidance
- Papers with `parseStatus: "ready"` and 1-2 chunks show amber warning: "This document may be image-heavy."

### 8-Bit Sound Effects
- Created `src/lib/sfx.ts` — Web Audio API oscillator-based sounds:
  - `playXpGained()` — ascending triangle-wave chirp (C5 → E5 → G5)
  - `playCardSaved()` — short square-wave arpeggio
  - `playSessionComplete()` — triumphant melody
  - `playLevelUp()` — longer fanfare with sparkle overtone
- Sound suppression system (bigger sounds suppress smaller ones to avoid stacking)
- Mute state persisted in localStorage with in-memory fallback
- `SfxToggle` component in sidebar (Volume2/VolumeX icons)
- XpToast plays `playXpGained()`, SuccessCheck plays `playCardSaved()`
- Session completion plays `playSessionComplete()` directly

### Lint Fixes
- Fixed `react-hooks/set-state-in-effect` in feynman-editor.tsx (moved suggestion clearing to onChange handler)
- Fixed unused `CheckCircle` import in review-session.tsx

---

## Video Study Room (Phase 14) ✅

**Full spec-driven development: Requirements → Design → Tasks → Implementation**

### Spec Files Created
```
.kiro/specs/study-room/requirements.md (12 requirements, 78 acceptance criteria)
.kiro/specs/study-room/design.md (architecture, schema, 16 correctness properties)
.kiro/specs/study-room/tasks.md (45 tasks across 7 phases)
```

### Database
- `supabase/migrations/004_study_room.sql`:
  - `videos` table (user-scoped, UNIQUE on user_id + youtube_id)
  - `video_transcripts` table (JSONB segments, JOIN-based RLS via parent videos)
  - `notes` table (numrange time_segment, GiST index for range queries)
  - Extended `cards` with `source_type: 'video'` + `metadata` JSONB column
  - Extended `study_sessions` with `mode: 'video'`

### Server Actions (`_actions/study-room.ts` + sub-modules)
- `searchVideos()` — Two-step YouTube API pipeline: search.list → videos.list → heuristic scoring
- `loadVideo()` — UPSERT video record for user
- `fetchTranscript()` — Cache-first transcript retrieval (YouTube captions → Whisper fallback)
- `generateNotes()` — Transcript slicing + Groq LLM → structured notes with timestamp citations
- `saveNote()` / `getVideoNotes()` — CRUD for timestamped notes
- `saveVideoCards()` — Card creation with source_type 'video' + metadata
- `evaluateWithTranscript()` — Feynman evaluation grounded in video transcript
- `recordVideoSession()` — Study session tracking at 5-min cumulative play
- `updateVideoTopic()` — Topic association for videos

### Sub-Modules
- `search-heuristic.ts` — `scoreVideo()`, `filterAndRankVideos()`, `validateSearchQuery()`, `buildSearchQuery()`, `extractYouTubeId()`
- `transcript-provider.ts` — TranscriptProvider interface, YouTubeCaptionProvider, WhisperProvider (stubbed)
- `transcript-utils.ts` — `sliceTranscript()`, `parseTimeInput()`, `formatSeconds()`, `validateTimeRange()`, `buildNotePrompt()`
- `note-completion.ts` — AI inline completion for note editor

### UI Components (`study-room/_components/`)
- `youtube-player.tsx` — YouTube IFrame API with seekTo/pause/play/getCurrentTime, 500ms time reporting
- `video-search.tsx` — Debounced search with thumbnail grid results
- `url-input.tsx` — Direct YouTube URL paste with validation
- `time-range-selector.tsx` — MM:SS/HH:MM:SS inputs with "From here" button
- `generated-notes.tsx` — AI summary, key concepts with timestamp badges, flashcard editor
- `timestamp-mark.ts` — Custom Tiptap Mark extension (clickable [MM:SS] badges)
- `note-editor.tsx` — Tiptap editor with auto-save, AI completions, TimestampMark support
- `video-card-editor.tsx` — Per-card edit/accept/reject with timestamp badges
- `feynman-video-prompt.tsx` — "Explain what you watched" after 60s playback
- `topic-linker.tsx` — Topic association dropdown
- `study-room-layout.tsx` — Split-panel responsive layout (60/40 desktop, stacked mobile)

### Page
- `study-room/page.tsx` — Server component with topic loading + URL param handling (?video=xxx&t=yyy)

### Integrations
- Sidebar nav: "Study Room" with MonitorPlay icon
- Card source navigation: video cards in review show "View in Study Room" badge → navigates back
- XP toast for note generation, card save, Feynman completion, session recording
- Cumulative play time tracking → session record at 5 minutes

### Dependencies Added
- `youtube-transcript-plus` — Transcript extraction
- `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` — Rich text editor

---

## History & Journals ✅

- `/app/history` — Filterable timeline of past study activity
- Server action `_actions/history.ts`: queries `feynman_explanations`, `notes` (with video JOIN), `study_sessions`
- Client filter bar: Type chips (All/Feynman/Video/Research), Topic dropdown, Date range (7d/30d/90d/All)
- Items grouped by date, expandable with full content + AI summary
- Feynman items show gap analysis dot summary (green/amber/red count)
- Video items show video title + time segment
- Sidebar nav: "History" with History icon

---

## Project Rebrand: Pixel Study OS → Nora ✅

- Tagline: "a softer way to study"
- Updated: package.json, root layout metadata, sidebar branding, landing page, login/signup, 404, all OpenRouter X-Title headers
- README.md completely rewritten as premium GitHub README
- Sidebar shows "NORA" in pixel font with amber color

---

## Vercel Deployment ✅

- Deployed to: `https://nora-mu-six.vercel.app`
- GitHub repo connected: `https://github.com/lxcario/Nora`
- Auto-deploys on push
- All environment variables configured (Supabase, Groq, OpenRouter, YouTube API)

---

## Bugfixes

### Party Disband Fix
- `disbandParty()` was failing due to RLS on child tables (cheers, messages, quests)
- Fixed: uses admin client to bypass RLS for cascading delete, while still verifying ownership through normal auth

### Dashboard Stats Fix
- Level, XP, Cards Due, Streak were hardcoded ("1", "0", "—", "0 days")
- Fixed: now fetches real data from profiles table, cards (due count), and calculates streak from consecutive activity days

---

## Git History (this session)

```
28d141e feat: Nora — full study OS with Feynman, SM-2, RAG, Video Study Room, Parties, and Gamification
c0fa0a5 feat: add History & Journals page with filterable timeline
49031c1 fix: use admin client for party disband to bypass RLS on child tables
0c947aa feat: add Nora cat logo as favicon and sidebar brand
71b3f98 style: switch to gold pixel text logo, remove text label
0a0bc8a style: increase logo size to h-12, remove pixelated rendering
6c7d7dc style: revert to pixel font NORA text in sidebar
71fb146 fix: dashboard stats now fetch real Level, XP, Cards Due, and Streak from DB
```

---

## Current State

- **Live at:** https://nora-mu-six.vercel.app
- **GitHub:** https://github.com/lxcario/Nora
- **All features working:** Feynman, SM-2 Review, Study Mix, Research + RAG, Video Study Room, Party, Planner, Analytics, History, Gamification, SFX, Music Player
- **Next up:** UI/visual overhaul to cozy pixel RPG aesthetic (requires pixel art sprite assets)

---

*Session ended June 17, 2026.*


---

# Session 4 — June 18, 2026

## Overview

Deep UX audit of the entire app, followed by full implementation of all 24 improvement tasks across 3 sprints. Resolved the "split personality" problem — half the app was using legacy SaaS-white styling while the other half used the pixel-art theme. Every page now uses the pixel-ui design system consistently.

---

## Phase 1 — UX Audit (Analysis Only)

Conducted a full codebase read of all 15 pages, their _components subdirectories, the pixel-ui library, and utility files. Produced two deliverables:

### Audit Report (`.kiro/specs/ux-audit/audit-report.md`)
- Scored every page across 8 dimensions (First Impression, Task Clarity, Emotional Tone, Feedback, Empty States, Wayfinding, Mobile, Consistency)
- Identified 23 issues: 5 P0 (Critical), 6 P1 (High), 7 P2 (Medium), 5 P3 (Low)
- Documented 10 things working well
- Page-by-page detailed notes

### Improvement Spec (`.kiro/specs/ux-audit/improvement-spec.md`)
- 24 implementation-ready tasks across 3 sprints
- Empty State Catalog (16 entries)
- Error Message Catalog (9 entries)
- 10 Tone & Copy Consistency Rules

### Spec Documents
- `requirements.md` — 7 functional + 5 non-functional requirements
- `design.md` — PixelConfirmDialog spec, re-skin pattern table, grade button color mapping, layout changes
- `tasks.md` — 24 tasks with files, steps, acceptance criteria

---

## Phase 2 — Sprint 1: Pre-Demo (P0 Fixes) ✅

| Task | Files | Change |
|------|-------|--------|
| UX-001 | `layout.tsx` | Rendered BottomNav for mobile navigation (was built but never mounted) |
| UX-002 | `error.tsx` | Full rewrite → DialogFrame + PixelButton (was lucide + indigo) |
| UX-003 | `loading.tsx` | Full rewrite → LoadingSkeleton (was Loader2 + indigo) |
| UX-004 | `confirm-dialog.tsx`, `pixel-button.tsx`, `index.ts` | New PixelConfirmDialog + forwardRef on PixelButton |
| UX-005 | `review-session.tsx` | Delete card now requires PixelConfirmDialog confirmation |
| UX-006 | `review/page.tsx`, `review-session.tsx` | Full pixel-ui reskin (DialogFrame, PixelButton, PixelProgressBar, grade buttons with CSS vars) |
| UX-007 | `study/page.tsx`, `study-session.tsx` | Full pixel-ui reskin (same treatment as review) |

---

## Phase 3 — Sprint 2: Pre-Ship (P1 Fixes) ✅

| Task | Files | Change |
|------|-------|--------|
| Task 8 | `party-discovery.tsx` | Full reskin → DialogFrame, PixelButton, PixelInput, LoadingSkeleton, EmptyState |
| Task 9 | `party-page.tsx` | Removed window.confirm → PixelConfirmDialog, DialogFrame wrappers, sprite badges |
| Task 10 | `analytics-dashboard.tsx` | Removed lucide → sprite icons, pixel-panel stats, BarChartPixel, pixel heatmap |
| Task 11 | `history-filters.tsx`, `history-list.tsx` | pixel-panel-inset filter chips, pixel-panel cards, EmptyState |
| Task 12 | `weekly-calendar.tsx` | pixel-panel nav, PixelButton, pixel-panel-inset day cells, accent today |
| Task 13 | `game-top-bar.tsx`, `collection/page.tsx` | Title tooltips on XP/coins, intro sentence |
| Task 14 | `study-room-layout.tsx` | pixel-panel search panel, removed unused lucide imports |

---

## Phase 4 — Sprint 3: Polish (P2+P3) ✅

| Task | Files | Change |
|------|-------|--------|
| Task 15 | `subjects-manager.tsx` | pixel-panel-inset, PixelButton, PixelInput, PixelConfirmDialog for deletes |
| Task 16 | `feynman-editor.tsx` | Replaced !bg-/!text- overrides with PixelButton components |
| Task 17 | (already fixed) | Review stats simplified in Sprint 1 |
| Task 18 | (already fixed) | LoadingSkeleton in Sprint 2 |
| Task 19 | `planner/page.tsx` | EmptyState when week has no sessions/events |
| Task 20 | `party/page.tsx`, `planner/page.tsx`, `history/page.tsx`, `room/page.tsx` | All red-text errors → DialogFrame state="error" |
| Task 21 | `feynman/page.tsx` | EmptyState component with action link |
| Task 22 | `globals.css` | Pixel-themed range input (track + thumb styling) |
| Task 23 | `game-sidebar.tsx` | forest_rescue → "🌲 Lost in forest" in warning color |
| Task 24 | `profile-popover.tsx` | Removed dead Settings/LogOut lucide imports |

---

## Phase 5 — Per-Page Loading Skeletons ✅

Created layout-matched `loading.tsx` for every page route. Each skeleton mirrors the exact structure of its page content:

| Page | Skeleton matches |
|------|-----------------|
| Homepage (`/app`) | Briefing + CTA + 4-stat grid + quests panel + friends feed |
| Review | Stat tile + card panel + meta row |
| Study Mix | Type badge + progress + card panel + skip |
| Feynman | Topic selector + textarea editor |
| Research | Mode toggle + search input panel |
| Study Room | Centered "Start Studying" empty state layout |
| Planner | Week nav + 7-column grid + legend |
| Academic | University header + progress + events + documents |
| Analytics | 5-stat row + 2 charts + heatmap + mastery bars |
| History | Filter chips + date-grouped cards |
| Pixel Room | 360px scene + pet status + quote + missions |
| Party | Header badges + members + quests + messages |
| Collection | Cursor grid + themes/decorations 2-col |
| Settings | Tab bar + profile form |

Also created `src/components/pixel-ui/skeleton-helpers.tsx` with reusable `PageHeaderSkeleton`, `PanelSkeleton`, `StatTileSkeleton`.

---

## New Files Created

```
.kiro/specs/ux-audit/audit-report.md
.kiro/specs/ux-audit/improvement-spec.md
.kiro/specs/ux-audit/requirements.md
.kiro/specs/ux-audit/design.md
.kiro/specs/ux-audit/tasks.md
src/components/pixel-ui/confirm-dialog.tsx
src/components/pixel-ui/skeleton-helpers.tsx
src/app/(protected)/app/review/loading.tsx
src/app/(protected)/app/study/loading.tsx
src/app/(protected)/app/feynman/loading.tsx
src/app/(protected)/app/research/loading.tsx
src/app/(protected)/app/study-room/loading.tsx
src/app/(protected)/app/planner/loading.tsx
src/app/(protected)/app/academic/loading.tsx
src/app/(protected)/app/analytics/loading.tsx
src/app/(protected)/app/history/loading.tsx
src/app/(protected)/app/room/loading.tsx
src/app/(protected)/app/party/loading.tsx
src/app/(protected)/app/collection/loading.tsx
src/app/(protected)/app/settings/loading.tsx
```

## Modified Files

```
src/app/(protected)/app/layout.tsx (BottomNav + mobile padding)
src/app/(protected)/app/error.tsx (full rewrite)
src/app/(protected)/app/loading.tsx (full rewrite — homepage skeleton)
src/app/(protected)/app/review/page.tsx (pixel-ui reskin)
src/app/(protected)/app/review/_components/review-session.tsx (full reskin + confirm dialog)
src/app/(protected)/app/study/page.tsx (pixel-ui reskin)
src/app/(protected)/app/study/_components/study-session.tsx (full reskin)
src/app/(protected)/app/party/_components/party-discovery.tsx (full reskin)
src/app/(protected)/app/party/_components/party-page.tsx (full reskin + confirm dialog)
src/app/(protected)/app/party/page.tsx (error standardization)
src/app/(protected)/app/analytics/_components/analytics-dashboard.tsx (full reskin)
src/app/(protected)/app/history/_components/history-filters.tsx (full reskin)
src/app/(protected)/app/history/_components/history-list.tsx (full reskin)
src/app/(protected)/app/history/page.tsx (error standardization)
src/app/(protected)/app/planner/_components/weekly-calendar.tsx (full reskin)
src/app/(protected)/app/planner/page.tsx (empty state + error fix)
src/app/(protected)/app/feynman/_components/feynman-editor.tsx (button overrides → PixelButton)
src/app/(protected)/app/feynman/page.tsx (EmptyState)
src/app/(protected)/app/room/page.tsx (error standardization)
src/app/(protected)/app/collection/page.tsx (coins intro)
src/app/(protected)/app/settings/_components/subjects-manager.tsx (full reskin)
src/app/(protected)/app/study-room/_components/study-room-layout.tsx (search panel fix)
src/app/(protected)/app/_components/game-top-bar.tsx (XP/coins tooltips)
src/app/(protected)/app/_components/game-sidebar.tsx (forest_rescue label)
src/app/(protected)/app/_components/profile-popover.tsx (dead imports removed)
src/app/globals.css (range input styling)
src/components/pixel-ui/index.ts (exports: PixelConfirmDialog, skeleton-helpers)
src/components/pixel-ui/pixel-button.tsx (forwardRef support)
```

---

## Key Outcomes

1. **Split personality resolved** — No more bg-white/zinc/indigo pages. Every route uses pixel-ui exclusively.
2. **Mobile navigation fixed** — BottomNav now renders on mobile (was built but never wired).
3. **Destructive actions safe** — PixelConfirmDialog replaces all window.confirm() and unprotected deletes.
4. **Error states cozy** — All raw red-text errors replaced with DialogFrame state="error" + warm copy.
5. **Loading states branded** — Every page has a layout-matched LoadingSkeleton instead of generic spinners.
6. **Gamification explained** — XP bar and coins now have tooltip explanations for new users.

---

*Session ended June 18, 2026.*
