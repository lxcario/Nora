# Nora — Pixel Study OS: Complete Product Description

> The full, feature-by-feature specification of what Nora is and how each part is meant to work. For the shorter overview, start with the [README](../README.md); for the philosophy behind these choices, see [WHY_NORA.md](WHY_NORA.md).

---

## 1. Product Identity

**Name:** Nora (Pixel Study OS)  
**Tagline:** "A softer way to study."  
**Category:** AI-powered study operating system with gamification  
**Platform:** Web application (responsive, mobile-friendly)  
**License:** MIT (application code); LPC assets CC BY-SA 3.0 / GPL 3.0; UI assets CC0

---

## 2. Purpose & Vision

Nora is a **study operating system** — not a flashcard app, not a timer with a coat of paint, and absolutely not an AI homework generator. It wraps six evidence-based learning strategies from cognitive psychology inside a cozy pixel-art RPG world where a student's companion pet grows as their understanding deepens.

### Core Philosophy

1. **Learning first, AI as tutor never author** — The AI never writes assignments. It asks questions, identifies knowledge gaps, finds academic sources, and helps students plan. The student always does the thinking.
2. **Grounded data only** — Every claim, citation, and academic date comes from a verified source. The system never fabricates literature reviews, invents exam dates, or presents ungrounded claims as fact.
3. **Compassionate design** — No punishment for missed days. Missed study sessions become "help me" quests for friends, not streak resets. The pet gets sad but recovers through gentle restorative actions.
4. **Evidence-based defaults** — Every learning feature is backed by published cognitive science research with explicit citations in the codebase.

### The Problem It Solves

Most study apps fall into two traps:
- **Passive timers** that track hours without improving understanding
- **AI slop generators** that do the work for students, creating an illusion of learning

Nora solves this by forcing active recall, spacing reviews optimally, grounding feedback in real sources, and making the process emotionally sustainable through a cozy game world.

---

## 3. Target Users

### Primary Audience
- **University students** preparing for exams across all disciplines
- **High-school students** building structured study habits
- **Self-learners** studying complex topics (CS, math, sciences, literature)
- **Neurodivergent learners** (ADHD) who benefit from structure, chunking, low-friction routines, and gentle gamification

### User Persona

> *"I want to actually understand what I'm studying, not just highlight textbooks. I need something that holds me accountable without making me feel guilty when I skip a day. And I want it to feel like a game, not a chore."*

### Use Cases
- Turning lecture notes into Feynman explanations and flashcards
- Planning multi-week exam prep with optimally spaced sessions
- Conducting guided research with real academic papers
- Watching educational videos and generating timestamped study notes
- Maintaining a sustainable daily study habit with a companion pet and friend group
- Declaring academic identity so the app knows your real university calendar

---

## 4. Pedagogical Foundations

Nora is grounded in **six evidence-based learning strategies** from cognitive psychology:

| Strategy | How Nora Implements It |
|----------|----------------------|
| **Spaced Practice** | FSRS-6 algorithm schedules reviews at optimal intervals; planner distributes sessions using the Cepeda et al. 2008 temporal ridgeline |
| **Retrieval Practice** | Flashcard reviews force active recall; Feynman mode requires explaining without notes |
| **Interleaving** | Study Mix interleaves confusable topics within the same subject (backed by Brunmair & Richter 2019 meta-analysis) |
| **Elaboration** | Feynman "Inquisitive Student" probes for why/how, connections, and analogies |
| **Concrete Examples** | AI evaluator asks for specific cases and real-world scenarios |
| **Dual Coding** | Video study room combines visual lectures with textual timestamped notes |

### Motivational Design (Self-Determination Theory)
- **Autonomy:** Students choose subjects, missions, avatars, and pets
- **Competence:** Clear per-topic mastery feedback, comprehension scores, and level progression
- **Relatedness:** Cooperative study parties with shared quests and soft social accountability

---

## 5. Feature Pillars

### 5.1 Feynman Mode — Grounded Explanation Evaluation

**What it is:** A writing workspace where students explain concepts in their own words, then receive AI-driven gap analysis graded against real source material.

**How it works:**
1. Student selects a topic and optionally attaches a source (indexed paper, video transcript, or pasted notes)
2. Student writes an explanation in plain language — as if teaching someone who knows nothing
3. The AI "Inquisitive Student" evaluates the explanation:
   - Asks 2-3 probing follow-up questions (edge cases, implications, trade-offs)
   - Paraphrases the student's explanation in technical terms
   - Classifies each segment as **green** (solid), **amber** (vague/oversimplified), or **red** (wrong/missing)
   - Provides specific feedback referencing actual source passages when available
4. Generates a deterministic **comprehension score** (0-100) from segment classifications
5. Suggests 3-5 high-quality flashcards from the explanation content
6. Supports **iterative refinement** — students can re-explain after feedback, with the evaluator acknowledging improvements

**Grounding rules:**
- When a source is attached: evaluation grades strictly against source passages, citing the specific passage for each amber/red segment
- When no source is attached: feedback is clearly labeled "unverified (no source attached)" — never presents model guesses as fact
- Rejects questions-as-explanations (marks everything red if student asks instead of explains)

**Rewards:** +15 XP, +5 coins, +3 pet affinity per explanation

---

### 5.2 FSRS Spaced Repetition — Smart Flashcard Scheduling

**What it is:** A modern memory-model scheduler (FSRS-6, via `ts-fsrs` MIT library) that tells students exactly when to review each card for maximum retention with minimum effort.

**How it works:**
1. Cards enter the system from Feynman mode, Research Desk, Video Study Room, or manual creation
2. The FSRS algorithm tracks per-card state: Difficulty, Stability, Retrievability (DSR model)
3. Students grade each card on a **four-button scale:** Again / Hard / Good / Easy
4. The scheduler computes the next optimal review date — reducing review load 20-30% vs traditional SM-2
5. "Due today" is determined by the user's stored timezone, never the server clock
6. Cards that lapse (graded Again) re-enter the current session immediately (intra-session relearning)
7. Target retention defaults to 0.90, but auto-elevates to 0.95-0.97 for subjects with upcoming exams

**Key properties:**
- Eliminates "Ease Hell" (the SM-2 problem where difficult cards spiral into impossibly short intervals)
- Timezone-safe: due dates stored as UTC instants, compared against the user's local day boundary
- Pure function implementation: scheduling works offline without network calls
- 394 unit tests covering scheduling, migration, and timezone edge cases

**Rewards:** +3 XP, +1 coin per Good/Hard/Easy review; +1 XP per lapse (Again)

---

### 5.3 Evidence-Based Study Mix — Intelligent Interleaving

**What it is:** A mixed-practice queue that applies interleaving where it helps and blocks where it doesn't, based on the Brunmair & Richter (2019) meta-analysis.

**How it works:**
1. Each topic has a `material_type` classification:
   - `verbal_vocabulary` — word lists, definitions (interleaving **hurts**: g = -0.39)
   - `procedural_math` — math procedures and formulas (interleaving helps: g = 0.34)
   - `visual_discrimination` — visual categorization tasks (interleaving helps most: g = 0.67)
   - `conceptual` — general conceptual knowledge (default)
2. The queue builder applies rules:
   - Vocabulary topics are always **blocked** (sequential, never interleaved)
   - Math and visual topics are **interleaved** within confusable same-subject topics
3. Queue is weighted toward the student's weakest areas:
   - 70% FSRS difficulty signal
   - 30% inverse Feynman comprehension score
4. Queue size scales to actual due-card load (no artificial fixed cap)

**Configuration:** Students set each topic's material type in Settings → Subjects.

---

### 5.4 Research Desk — Real Academic Sources

**What it is:** An AI-assisted research workspace that queries real academic databases, presents verified citations, and never fabricates a literature review.

**How it works:**
1. Student enters a research question in natural language
2. System queries three real academic APIs:
   - **OpenAlex** (primary) — CC0 scholarly catalog with 240M+ works
   - **Crossref** — Supplementary DOI and metadata resolution
   - **Unpaywall** — Open-access PDF discovery for free full-text
3. Retrieves ranked academic works with title, authors, year, DOI, abstract
4. Synthesizes an answer constrained strictly to retrieved source content
5. Every citation maps to a real retrieved source — no decorative citation markers
6. When fewer than 2 sources are found, the system says so explicitly
7. Model supplementation (if any) is visibly labeled "unverified"
8. One-click "Ingest Open Access PDF" — finds full-text via Unpaywall, runs it through RAG pipeline

**Dual mode:**
- "From your papers" — RAG queries against user's indexed PDFs (hybrid vector + lexical retrieval)
- "From web sources" — live queries to OpenAlex/Crossref/Unpaywall

---

### 5.5 Hybrid Paper RAG — Question Your Documents

**What it is:** A retrieval-augmented generation system that lets students ask questions about their uploaded/ingested academic PDFs and get cited, verifiable answers.

**How it works:**
1. **Ingestion:** PDF → parse (section-aware text extraction) → chunk (256-512 tokens with 10-15% overlap) → embed (OpenAI text-embedding-3-small, 1536 dimensions) → store in `paper_chunks` with pgvector
2. **Retrieval:** Dual-mode Reciprocal Rank Fusion (RRF):
   - **Vector leg:** pgvector cosine similarity search
   - **Lexical leg:** `ts_rank_cd` over generated `tsvector` GIN index
   - Fused with RRF for best-of-both (semantic understanding + exact keyword matching)
3. **Answering:** Top 8 chunks fed to LLM with strict citation instructions
4. **Citations:** Each claim references the actual retrieved chunk (paper title, section, chunk index) — no default-to-zero fallback
5. **Graceful degradation:** When no embedding API key is configured, falls back to ranked lexical-only search (never an unranked scan)

**Features:**
- Upload PDFs up to 20MB from local computer
- Ingest PDFs by URL (from Unpaywall open-access links, up to 50MB)
- Section-aware chunking preserves document structure
- Citations panel with expandable source snippets for verification
- Convert any RAG answer segment into a flashcard

---

### 5.6 Video Study Room — Active Video Learning

**What it is:** A unified workspace that transforms passive YouTube watching into active, structured learning with transcripts, AI notes, Feynman practice, and flashcard generation.

**How it works:**
1. **Search:** Student searches for educational videos (filtered to Education/Science categories, excludes shorts, vlogs, gaming)
2. **Play:** YouTube video embeds with programmatic timestamp control (seekTo, pause, getCurrentTime)
3. **Transcript:** Auto-extracted via YouTube captions (with Groq Whisper fallback for unavailable captions), cached for instant re-access
4. **AI Notes:** Student selects a time range → system slices transcript → Groq LLM generates structured notes with:
   - Summary (100-200 words)
   - Key concepts with definitions and source timestamp citations
   - Flashcard question-answer pairs with source timestamps
5. **Rich Text Editor:** Tiptap-based editor with:
   - Full markdown formatting (headings, bold, italic, lists, code blocks)
   - Custom **timestamp marks** — clickable badges that seek the video to that moment
   - Keyboard shortcut (Ctrl+Shift+T) inserts current playback time as a mark
   - AI inline ghost-text completions (after 2s of inactivity, accept with Tab)
   - Auto-save within 3 seconds of last edit
6. **Feynman Integration:** After watching 60+ seconds, optional "Explain what you just watched" prompt evaluates against the transcript
7. **Flashcards:** All generated cards store `source_type: 'video'` with `video_id` and `offset_seconds` — clicking the source during review navigates back to the exact video moment

---

### 5.7 Spacing-Aware Study Planner

**What it is:** An intelligent session scheduler that distributes study across the week using optimal spacing science, not just "study today."

**How it works:**
1. **Cepeda Ridgeline:** Calculates optimal interstudy gap as a function of days-until-exam using Cepeda et al. (2008) research
2. **Expanding gaps:** Sessions spread with increasing intervals, not crammed together
3. **Asymmetric cost:** When the ideal gap is uncertain, errs wider (under-spacing harms far more than over-spacing)
4. **Near-exam boost:** Subjects with exams within 14 days get elevated FSRS `request_retention = 0.95` instead of interval caps
5. **Missed-session forward-fill:** Missing a session reschedules it to the next free day without compressing remaining sessions
6. **Academic event merge:** Confirmed university dates (finals, holidays, add-drop) surface as calendar chips and warning strips
7. **Academic load awareness:** Calculates current load phase (baseline → ramp-up → peak → recovery) and adjusts session intensity multipliers

**Weekly view:** Shows completed sessions, auto-generated suggestions with topic/subject colors, and upcoming deadlines with confidence badges (verified/inferred/unreleased).

---

### 5.8 University-Aware Onboarding & Personalization

**What it is:** A system that personalizes Nora to the student's real academic context — their specific university, faculty, department, year, and term — using official institutional data.

**How it works:**
1. **Academic Identity:** During onboarding, student declares:
   - University (with diacritic-insensitive autocomplete: "ODTÜ" = "METU" = "Orta Doğu")
   - Faculty/School
   - Department/Major
   - Year of study
   - Current term
   - Optional: course codes, syllabus uploads
2. **University Registry:** Curated reference tables for supported institutions with verified domains, registrar URLs, and calendar URLs (launch: METU EEE)
3. **Automatic Discovery:** Finds official academic calendar, curriculum, and course data:
   - Registry-matched institutions: uses known URLs directly
   - Unknown institutions: locale-aware web search scoped to official domains (e.g., Turkish "akademik takvim")
4. **Safe Ingestion:** All outbound fetches go through SSRF guard, domain allowlist, and timeout protections. Content treated strictly as data, never as instructions.
5. **Academic Events:** Extracts real dates from official sources:
   - Semester start/end, registration, add-drop, midterms, finals, holidays, breaks
   - Each event has a confidence status: `verified` (≥0.95), `inferred` (0.60-0.95), or `unreleased` (date is NULL)
   - **Never invents dates** — missing dates stored as "Unreleased" rather than guessed
6. **Background Processing:** Ingestion runs in a background job queue; student enters the app immediately without waiting
7. **Academic RAG:** Indexed university documents become queryable — students can ask "When is the add-drop deadline?" grounded in official sources

**Hard rule:** The system uses only real, official data. It never invents dates.

---

### 5.9 Pixel Room, Avatar & Pet Companion

**What it is:** A cozy pixel-art virtual study room with a customizable avatar and an animated companion pet whose mood mirrors the student's real study habits.

**How it works:**

**Pet System:**
- 12 animated companion types to choose from
- Pet mood states: `happy` → `neutral` → `sad` → `forest_rescue`
- Affinity score (0-100) drives mood transitions:
  - Above 70: happy | 40-70: neutral | Below 40: sad
  - Missing days gradually lowers affinity
  - Completing study actions increases affinity (+1 to +5 per action)
- Pet evolves visually with the student's level
- Displayed persistently in the sidebar — always visible, gently bobbing

**Avatar System:**
- Composited pixel avatar: body + head + hair + outfit + accessory
- Customization unlocks through leveling (XP from real study actions)
- LPC-style spritesheet layers rendered with `image-rendering: pixelated`

**Room:**
- Pixel-art background (walls, floor, desk, shelves, plants)
- Built with LPC tileset grids (16x16 tiles)
- Room items purchasable with coins earned from studying

**Emotional design:** The pet is the emotional core — a companion that celebrates real progress and gently reflects neglect, creating positive accountability without punishment.

---

### 5.10 Social Parties — Cooperative Study Groups

**What it is:** Small cooperative study groups (3-5 members) with shared weekly quests and gentle social accountability.

**How it works:**

**Party System:**
- Create or join parties (public discovery or private invite codes)
- Maximum 5 members per party; 1 party per user
- Party_Owner manages quest templates and settings
- 7-day invite codes for private parties

**Shared Weekly Quests:**
- 1-3 quests per week aggregating individual contributions:
  - Total cards reviewed (target: 10-1000)
  - Total Feynman sessions (target: 5-200)
  - Total study minutes (target: 30-5000)
- Progress displayed as fraction (e.g., "47 / 100 cards reviewed")
- Completing a quest: +50 XP and +25 coins for every contributing member
- Incomplete quests: archived without penalty, never punishing

**Help Me Quests (Compassionate Accountability):**
- When a member misses 2+ consecutive study days, the party receives a collaborative "Help Me" quest
- Target calculated from the member's actual study average (not arbitrary)
- All members (including the missed member) can contribute
- Completion: "Rescued" badge for helped member + 10 XP per session for contributors
- Maximum 2 active help quests per party; 7-day expiry without penalty
- **Key design:** Missed days become group support opportunities, not individual punishment

**Social Features:**
- 6 cheer emojis (fire, star, clap, heart, rocket, sparkles) — max 10/day
- Short party messages (max 200 characters, 20/day) for light coordination
- No noisy feed, no competition — just companionship

---

### 5.11 Analytics & Progress Dashboard

**What it is:** Visual progress tracking with weekly stats, consistency heatmap, and per-topic mastery visualization.

**Features:**
- Weekly statistics: sessions completed, cards reviewed, new cards created
- 30-day charts showing study trends
- GitHub-style consistency heatmap (days with completed missions)
- Per-topic mastery bars based on card performance and Feynman scores
- Academic load indicator (baseline → ramp-up → peak → recovery phases)

---

## 6. Gamification System

### XP & Rewards Table

| Action | XP | Coins | Pet Affinity |
|--------|-----|-------|-------------|
| Feynman explanation | +15 | +5 | +3 |
| Card review (Good/Hard/Easy) | +3 | +1 | +1 |
| Card review (Again — lapse) | +1 | — | — |
| Card created | +2 | — | — |
| Study session complete (≥15 min) | +10 | +3 | +2 |
| All daily missions complete | +20 | +10 | +5 |
| Party quest completed (per member) | +50 | +25 | — |
| Help quest contribution | +10/session | — | — |

### Level Formula
```
level = floor(sqrt(xp / 50)) + 1
```
- Level 2 at 50 XP
- Level 3 at 200 XP
- Level 4 at 450 XP
- Level 5 at 800 XP

### Currency Uses
- **XP:** Level-ups → cosmetic unlocks (avatar items, room decorations, pet accessories)
- **Coins:** Direct purchases in the cosmetic shop (room items, avatar accessories)

### Sound Design
- 8-bit sound effects generated live with the Web Audio API
- Procedural oscillators — no audio files loaded
- Sidebar mute/SFX toggle for accessibility

---

## 7. User Experience & Visual Design

### Pixel-Art Aesthetic

The entire UI uses a cozy pixel-art style inspired by Stardew Valley and RPG life-sim games:

- **8px spacing grid** for all layout (padding, margin, gap)
- **SproutLands pixel font** for headings, labels, and navigation
- **Geist sans-serif** for body/long-form text (readability)
- **`image-rendering: pixelated`** on all sprite elements
- **Integer scaling** (2x, 3x) to prevent sub-pixel blurring
- **CSS `steps()` animations** for sprite frame transitions
- **Limited color palette:** warm earth tones — cream/parchment backgrounds, dark brown text, amber/gold accents, sage green success, muted red errors

### Component Library (`src/components/pixel-ui/`)

| Component | Description |
|-----------|-------------|
| **Nine-Slice Panel** | Scalable pixel-art bordered frame from dialog-box sprites; 4 corners + 4 edges + center |
| **Pixel Button** | RPG-style button with idle/hover/active/disabled/focus sprite states; 44x44px min touch target |
| **Icon Sprite** | Single icons from spritesheet via background-position; supports 1x/2x/3x sizes |
| **Pixel Sidebar** | Navigation wrapped in Nine-Slice frame; pixel font labels; sprite icons |
| **Dialog Frame** | Content card container using Nine-Slice; optional pixel-font title header |
| **Pixel Input** | Text/textarea/select/toggle with pixel-art borders, amber focus glow |
| **Toast Notification** | Mini Dialog_Frame for XP rewards, level-ups, and confirmations |
| **Bottom Nav** | Mobile-optimized bottom navigation for thumb accessibility |
| **Analytics Display** | Pixel-styled stat cards, bar charts, heatmap, progress bars |

### UI State System
- **Disabled:** Grayed/desaturated, reduced opacity, non-interactive cursor
- **Loading:** Pixel-art spinner animation or pulsing frame effect
- **Focus:** Amber/gold pixel-art outline (keyboard-accessible)
- **Selected:** Brighter background from the Color_Palette
- **Success:** Sage green border + checkmark Icon_Sprite
- **Warning:** Amber/gold border + caution Icon_Sprite
- **Error:** Muted red treatment

### Responsive Design
- Desktop: Full sidebar + main content area
- Mobile: Bottom navigation bar replacing sidebar; collapsible panels
- All pixel art maintains integer scaling at every breakpoint

### Dark/Light Mode
- Dark mode (primary): warm brown backgrounds, cream text, amber accents
- Light mode: parchment backgrounds, dark brown text, same accent system
- Auto-switches based on system preference without manual toggle

---

## 8. Technical Architecture

### Stack Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions, React Server Components) |
| Language | TypeScript strict — Node.js ≥ 20 |
| UI | React 19, Tailwind CSS v4, custom pixel-UI component library |
| Database | Supabase — Postgres, pgvector, Row Level Security, Storage |
| Auth | Supabase Auth (email/password + optional OAuth), gated via `proxy.ts` |
| Spaced Repetition | ts-fsrs (MIT) — FSRS-6 DSR model |
| AI (primary) | Groq Cloud (Llama 3.3 70B) |
| AI (fallback) | OpenRouter (free tier models) |
| Embeddings | OpenAI text-embedding-3-small (1536 dimensions) |
| Academic APIs | OpenAlex (CC0), Crossref Polite Pool, Unpaywall |
| RAG Retrieval | pgvector cosine + ts_rank_cd FTS → Reciprocal Rank Fusion |
| Rich Text | Tiptap v3 (custom timestamp mark extension) |
| PDF Parsing | pdf-parse (default); unpdf optional (Node ≥ 22) |
| Video | YouTube IFrame API + youtube-transcript-plus + Groq Whisper fallback |
| Testing | Vitest + fast-check (property-based) — 394 tests passing |
| Sprites | LPC character sets + Sprout Lands UI + Kenney CC0 |

### Architecture Principles
1. **Monolith-first:** Single Next.js + Supabase project, no microservices
2. **Server Actions over API routes:** Business logic in `_actions/` with RSC data fetching
3. **Pure functions for core logic:** FSRS scheduling, spacing math, study-mix queue, Feynman scoring — all unit-testable without database
4. **RLS everywhere:** Every user-owned table has `user_id = auth.uid()` policies
5. **Graceful degradation:** Each optional API key's absence degrades a feature, never breaks the app
6. **SSRF protection:** All outbound fetches go through `lib/ssrf.ts` (blocks private/loopback/metadata addresses)

### Data Model (Core Tables)

```
profiles          → user settings, XP, coins, level, timezone, ADHD mode
subjects          → what the user studies (name, color)
topics            → specific topics within subjects (with exam_date, material_type)
study_sessions    → logged sessions (mode: feynman/review/research/planner)
feynman_explanations → raw explanations + AI gap analysis + comprehension score
cards             → flashcards with full FSRS state (stability, difficulty, due, state)
card_reviews      → grading history per card
avatars           → composited pixel avatar (body, head, hair, outfit, accessory)
pets              → companion type, name, state (happy/neutral/sad), affinity (0-100)
papers            → academic paper metadata (title, authors, year, DOI, URL)
paper_chunks      → parsed + embedded text chunks for RAG (vector 1536 dims)
academic_profiles → university, faculty, program, year, term, onboarding_status
academic_events   → extracted calendar dates with confidence status
academic_sources  → official document URLs and their classification
ingestion_jobs    → durable background work queue for academic data collection
videos            → YouTube video metadata (youtube_id, title, channel, duration)
notes             → timestamped video notes (time_segment as numrange)
video_transcripts → cached transcripts with full timestamp arrays
parties           → study groups (name, visibility, owner)
party_members     → membership records
party_quests      → shared weekly goals with progress tracking
party_messages    → short group messages
cheers            → emoji reactions between party members
```

### AI Pipeline Architecture

```
User Input → Server Action → LLM (Groq primary / OpenRouter fallback)
                          ↘ Embedding (OpenAI text-embedding-3-small)
                          ↘ RAG Retrieval (pgvector + FTS → RRF fusion)
                          ↘ Academic APIs (OpenAlex / Crossref / Unpaywall)
                          ↘ SSRF Guard → External Fetch
```

Every AI interaction follows these rules:
- Never writes student's work — asks questions and finds gaps
- Citations must map to actual retrieved sources
- Insufficient data declared explicitly, not fabricated
- Rate-limited per action type with configurable windows

---

## 9. User Flows

### 9.1 First-Time Experience (Onboarding)

```
Sign Up → Academic Identity Declaration → Background Data Collection → Dashboard
          ↓                                    ↓
          University, Faculty, Dept,          System finds official calendar,
          Year, Term (autocomplete)           curriculum, courses (non-blocking)
          Optional: course codes,             Student enters app immediately
          syllabus uploads
```

1. New user signs up (Supabase Auth)
2. Redirected to onboarding wizard (enforced by layout gate)
3. Declares academic identity with cascading autocomplete
4. System enqueues discovery/ingestion jobs in background
5. Student enters main app while data collection continues
6. Progress exposed via polling; notification on completion

### 9.2 Daily Study Loop

```
Open App → Pixel Room (pet + sidebar) → See Today's Missions → Choose Mode
                                                                     ↓
     ┌─────────────────────────────────────────────────────────────────┐
     │  Feynman Mode → Explain → Get Feedback → Create Cards          │
     │  Review Mode → Due Cards → Grade (Again/Hard/Good/Easy)        │
     │  Research Mode → Ask Question → Get Cited Answer → Create Cards│
     │  Video Room → Watch → AI Notes → Feynman → Create Cards        │
     │  Study Mix → Interleaved Queue → Review + Feynman              │
     └─────────────────────────────────────────────────────────────────┘
                                                                     ↓
              Earn XP + Coins → Pet Affinity ↑ → Level Up → Unlock Cosmetics
                                                                     ↓
                       End-of-Day: Summary + Party Quest Progress Update
```

### 9.3 Planner Flow

```
Planner Page → View Weekly Plan → See Auto-Generated Suggestions
     ↓                                ↓
  Confirmed academic events         Spacing-optimized sessions across the week
  (finals, holidays, deadlines)     (expanding gaps, weighted by due load)
     ↓                                ↓
  Academic Load Indicator           Miss a session → Forward-fill to next free day
  (baseline/ramp/peak/recovery)     Near exam → Retention boosted to 0.95
```

### 9.4 Research Flow

```
Research Desk → Enter Question → Mode Selection
                                      ↓
     ┌────────────────────────────────────────────────────┐
     │  "From web sources"                                 │
     │  → OpenAlex/Crossref query → Ranked works          │
     │  → Constrained synthesis → Cited answer            │
     │  → "Ingest OA PDF" for full RAG                    │
     ├────────────────────────────────────────────────────┤
     │  "From your papers"                                 │
     │  → Embedding query → Hybrid RRF retrieval          │
     │  → Top 8 chunks → LLM synthesis → Cited answer    │
     │  → Expandable citation snippets → Verify claims   │
     └────────────────────────────────────────────────────┘
                                      ↓
         Select text → "Create Card" → Pre-populated flashcard → Save
```

### 9.5 Social Party Flow

```
Create/Join Party → Configure Quest Templates → Weekly Cycle Begins
                                                      ↓
     Study actions auto-increment quest progress (cards, sessions, minutes)
                                                      ↓
     Quest completed → +50 XP + 25 coins for all contributors
     Quest expires → Archived without penalty
                                                      ↓
     Member misses 2+ days → Help Quest generated → Group collaborates
                                                      ↓
     Social: Send cheers (6 emojis, 10/day) + Short messages (200 chars, 20/day)
```

---

## 10. Navigation & Information Architecture

### Sidebar Structure (5 Top-Level Items)

```
🏠 Home (Dashboard)
📚 Study
    ├── Review Cards (FSRS queue)
    ├── Study Mix (interleaved practice)
    ├── Feynman Mode (explain & evaluate)
    ├── Research Desk (academic search + RAG)
    ├── Study Room (video learning)
    └── Study Planner (spacing scheduler)
👥 Friends (Social Parties)
🏡 My Room
    ├── Pixel Room (avatar + pet)
    ├── Collection (cosmetics)
    ├── Analytics (progress dashboard)
    └── History (session log)
⚙️ Settings
    ├── Profile (timezone, ADHD mode)
    ├── Subjects & Topics (material types, exam dates)
    └── Academic Profile (university, onboarding status)
```

**Persistent sidebar elements:**
- NORA brand logo (pixel font, amber/gold)
- Pet widget (animated sprite + mood badge + name) — links to Pixel Room
- Study Music / SFX toggle (pinned at bottom)
- Sign out

---

## 11. Security & Safety

### Authentication & Authorization
- Supabase Auth with email/password (OAuth optional)
- Auth gate via `proxy.ts` middleware — all `/app/*` routes require authentication
- Academic profile onboarding gate — new users must complete identity before accessing features
- Row Level Security on every user-owned table: `user_id = auth.uid()`

### Data Safety
- All outbound fetches through SSRF guard (`lib/ssrf.ts`):
  - Rejects private, loopback, link-local, and metadata addresses
  - Domain allowlist per institution for academic scraping
  - Per-request timeouts
- External content treated strictly as data — never executed as instructions
- User data never transmitted to third parties beyond search/scrape queries
- Per-action rate limiting with configurable windows

### Academic Data Integrity
- Only real, official data from verified institutional domains
- Source ranking: Tier 1 (registrar) → Tier 2 (faculty) → Tier 3 (department) → Tier 4 (syllabus)
- Confidence scoring: verified (≥0.95) / inferred (0.60-0.95) / unreleased (<0.60)
- Missing dates stored as NULL, surfaced as "Unreleased" — never guessed
- Extracted dates validated against plausible term windows

### Graceful Degradation
Every optional service degrades without breaking the app:

| Missing Key | Behavior |
|-------------|----------|
| `OPENAI_API_KEY` | RAG uses ranked lexical search (FTS) instead of vector |
| `GROQ_API_KEY` | Required — core AI features unavailable |
| `OPENROUTER_API_KEY` | No LLM fallback; primary (Groq) must succeed |
| `YOUTUBE_API_KEY` | Video search unavailable; direct URL input still works |
| `FIRECRAWL_API_KEY` | University auto-discovery disabled; manual upload always works |
| `ACADEMIC_API_MAILTO` | Lower rate limits on OpenAlex/Crossref (still functional) |
| `ACADEMIC_API_EMAIL` | Unpaywall OA PDF lookup unavailable |

---

## 12. Testing & Quality

### Test Coverage (394 tests, all passing)
- **FSRS scheduling:** FSRS-1, FSRS-2 properties
- **SM-2 → FSRS migration:** No NaN/negative values; no all-same-day collapse
- **Timezone safety:** DUE-1 across 9 IANA zones + DST transitions
- **RRF fusion:** Ordering verified on known inputs
- **Citation validation:** Every emitted citation resolves to a retrieved chunk (RAG-1)
- **Academic search:** Mocked fetch clients with graceful no-key/empty handling
- **Research citations:** No unsupported `[N]` markers (RESEARCH-1)
- **Feynman grounding:** Passage building, prompt constraints
- **Study Mix:** Vocab blocking (MIX-1), weakness ordering (MIX-2)
- **Spacing math:** Non-decreasing gaps, never past the exam (SPACING-1)
- **Planner forward-fill:** Result strictly after original, never in occupied set

### Testing Framework
- **Vitest** — fast unit/integration test runner
- **fast-check** — property-based testing for algorithmic correctness
- **pgTAP** — SQL-level tests for database functions (hybrid search ordering)

---

## 13. Asset Strategy & Licensing

### Art Sources

| Category | Source | License | Location |
|----------|--------|---------|----------|
| Characters & Avatars | LPC Universal Spritesheet Generator | CC BY-SA 3.0 / GPL 3.0 | `assets/lpc/characters/` |
| Pets & Animals | LPC Animal & Monster Sprites | CC BY-SA 3.0 / GPL 3.0 | `assets/lpc/animals/` |
| Environment Tiles | LPC Tile Atlas (indoor/outdoor, furniture) | CC BY-SA 3.0 / GPL 3.0 | `assets/lpc/tiles/` |
| UI Components | Sprout Lands UI Pack (Travel Book series) | Custom/purchased | `assets/Sprites/` |
| UI Chrome & Buttons | Kenney Pixel UI Pack (700+ elements) | CC0 (public domain) | `assets/cc0/ui/kenney/` |
| Icons | Sprout Lands Icons + Lucide fallback | Custom + MIT | `assets/Icons/` |
| Fonts | SproutLands pixel font + Geist sans-serif | Custom + MIT | `assets/cc0/fonts/` |

### Licensing Rules
- LPC derivatives must remain CC BY-SA 3.0 / GPL 3.0 — no DRM, no incompatible relicensing
- CC0 assets (Kenney) can be freely modified and shipped commercially with no attribution requirement
- All art credits maintained in `docs/ASSETS.md`
- Application code is MIT licensed

---

## 14. Environment Configuration

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL     → Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase anonymous key
GROQ_API_KEY                 → LLM provider (Feynman, research, synthesis)
```

### Optional Variables
```
OPENROUTER_API_KEY           → LLM fallback provider
OPENAI_API_KEY               → Enables pgvector RAG (FTS used otherwise)
OPENAI_EMBEDDING_MODEL       → Defaults to text-embedding-3-small (1536 dims)
ACADEMIC_API_MAILTO          → OpenAlex + Crossref Polite Pool enrollment
ACADEMIC_API_EMAIL           → Unpaywall API (required for OA PDF ingestion)
FIRECRAWL_API_KEY            → University auto-discovery (manual upload fallback)
YOUTUBE_API_KEY              → YouTube search in Study Room
NEXT_PUBLIC_SITE_URL         → OpenRouter attribution headers
NEXT_PUBLIC_SUPPORT_EMAIL    → Fallback if specific email vars are absent
```

---

## 15. Deployment & Infrastructure

### Requirements
- Node.js ≥ 20 (required by ts-fsrs)
- Supabase project (free tier works for development)
- Groq API key (free at console.groq.com)

### Database Migrations (16 ordered migrations)
```
001 → Core schema (profiles, subjects, topics, sessions, cards, avatars, pets, papers)
002 → Social parties (parties, members, quests, messages, cheers)
003 → Avatar storage + RAG extensions (FTS, match_paper_chunks RPC)
004 → Video study room tables
005 → Party RLS fix
006 → Feynman scoring column
007 → University onboarding (academic profiles, events, sources)
008 → Background job queue
009 → Academic data sweeper
010 → FSRS scheduling columns
011 → Material type for topics
012 → Hybrid search RPC (match_paper_chunks_hybrid)
013 → Research sources (DOI + OA URL)
014 → Feynman source attachment
015 → Planner missed-session records
016 → Drop SM-2 columns (destructive — run last after FSRS migration verified)
```

Plus university registry seed: `supabase/seed_university_registry.sql`

### Commands
```bash
npm run dev       # Development server (localhost:3000)
npm run build     # Production build
npm run start     # Production server
npm test          # Run all 394 tests
npm run lint      # ESLint
```

---

## 16. What Nora Is NOT

To prevent scope creep and maintain pedagogical integrity, these are explicit non-goals:

| Not This | Why |
|----------|-----|
| AI homework generator | AI never writes final assignments — it teaches and guides |
| Generic timer app | Every mechanic maps to evidence-based learning, not just time tracking |
| Competitive leaderboard | Social design is cooperative, not competitive |
| Chat-based AI tutor | Structured modes (Feynman, review, research) over freeform chat |
| Note-taking app | Notes are a byproduct of active learning modes, not the primary feature |
| Content library | Students bring their own material; app helps them process it |
| Punishment system | Missed days are met with compassion and support, never penalties |
| General-purpose scheduler | Planning is specifically for spaced study, grounded in cognitive science |

---

## 17. Design Decisions & Trade-offs

### Why FSRS over SM-2?
SM-2 (1987) uses a fixed "ease factor" that spirals downward for difficult cards ("Ease Hell"). FSRS (2022) uses a 3-parameter memory model (Difficulty, Stability, Retrievability) trained on millions of reviews, reducing study load 20-30% while maintaining the same retention. The `ts-fsrs` MIT library provides a pure TypeScript implementation suitable for server-side Next.js.

### Why Hybrid RAG (Vector + Lexical)?
Pure vector search misses exact terms, version numbers, and proper nouns. Pure keyword search misses semantic similarity. Reciprocal Rank Fusion combines both — the system finds passages by meaning AND by exact text match, then fuses rankings for optimal results.

### Why No OCR?
Image-only/scanned PDFs require heavy Python libraries (Tesseract, Docling) that don't fit in serverless Node.js. Rather than adding complexity, Nora marks unreadable PDFs as "requires unsupported format" and suggests alternatives. Docling is documented as an optional external sidecar for operators who want it.

### Why Background Job Queue for Onboarding?
University data ingestion (scraping calendars, downloading PDFs, embedding chunks) can take minutes. Instead of blocking the onboarding flow, work is enqueued and processed asynchronously. The student enters the app immediately. Progress is polled without persistent connections (WebSocket-free).

### Why Cooperative Parties over Competitive Leaderboards?
Research on gamification in education shows that cooperative challenges sustain motivation better than solo trackers or competition. Missed days becoming "help quests" aligns with self-determination theory's relatedness need and prevents the guilt/dropout cycle common with streak systems.

### Why Monolith Architecture?
A single Next.js + Supabase project keeps deployment simple, development fast, and the team small. Server Actions colocate business logic with UI. No message brokers, no microservices, no Kubernetes. The app can scale vertically until it genuinely needs horizontal distribution.

---

## 18. Summary

**Nora (Pixel Study OS)** is a study operating system that:

1. **Makes students explain, recall, and space** — using six evidence-based learning strategies
2. **Grounds all AI output in real sources** — never fabricating citations, dates, or claims
3. **Provides a cozy pixel-art world** — where a companion pet grows with real understanding
4. **Supports without punishing** — cooperative groups, compassionate mechanics, no guilt
5. **Knows your real academic context** — university calendar, courses, deadlines from official sources
6. **Works with minimal infrastructure** — single Next.js app, free-tier Supabase, one Groq API key

The result is a product where studying feels like tending a small garden — consistent, rewarding, and never overwhelming.
