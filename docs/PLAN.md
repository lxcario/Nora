# Pixel Study OS – Build Plan

This document is a practical roadmap for building Pixel Study OS from zero to a fully functional web app using **Next.js + Supabase** and the specs in `study-os-spec.md` and `ASSETS.md`.[web:64][web:66][web:71][web:74][web:77]

- Stack: Next.js (TypeScript), Supabase (Postgres, Auth, Storage, Edge Functions, pgvector), LLM + embeddings.
- Art: LPC characters/tiles/animals + Kenney Pixel UI + CC0 UI assets.[web:12][web:80][web:82][web:83][web:84][web:87][web:88][web:91]

---

## Phase 0 – Repo, Docs, and Environment

**Goal:** Clean project skeleton with docs and basic tooling.

### Tasks

- [ ] Create Git repo: `pixel-study-os`.
- [ ] Add initial docs:
  - [ ] `docs/study-os-spec.md` (product spec).
  - [ ] `docs/ASSETS.md` (assets & licenses).
  - [ ] `docs/build-plan.md` (this file).
- [ ] Tooling:
  - [ ] Add ESLint + Prettier.
  - [ ] Add TypeScript strict mode.
  - [ ] Choose package manager (pnpm / npm / yarn) and lockfile.

---

## Phase 1 – Next.js + Supabase Setup

**Goal:** Running app shell with auth and a placeholder dashboard.

### Tasks

- [ ] Initialize Next.js app:

  ```bash
  npx create-next-app@latest pixel-study-os
  ```

- [ ] Integrate Supabase using the Next.js quickstart template and SSR client helpers.[web:66][web:69][web:72][web:75][web:78]
- [ ] Configure Supabase project:
  - [ ] Create project.
  - [ ] Set environment variables in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` etc.).[web:64][web:70]
- [ ] Auth:
  - [ ] Add email/password sign‑up & login pages using Supabase Auth.[web:64][web:70]
  - [ ] Create a protected `/app` area that requires login.
- [ ] Basic layout:
  - [ ] Add a main layout for `/app` (top bar, main content).
  - [ ] Add a temporary “Hello, Pixel Study OS” dashboard.

---

## Phase 2 – Database Schema & RLS (MVP Tables)

**Goal:** Core relational schema in Supabase with row‑level security.

### Tasks

- [ ] Enable the `pgvector` extension in Supabase.[web:71][web:74][web:77]
- [ ] Create tables (via SQL editor or migrations) for:

  - [ ] `profiles`
  - [ ] `subjects`, `topics`
  - [ ] `study_sessions`
  - [ ] `feynman_explanations`
  - [ ] `cards`, `card_reviews`
  - [ ] `avatars`, `pets`
  - [ ] `papers`, `paper_chunks`

  (Use the schema from the spec and adjust if needed.)

- [ ] Row Level Security (RLS):
  - [ ] Enable RLS on all user‑owned tables.
  - [ ] Policies like: `user_id = auth.uid()` for select/insert/update/delete.
- [ ] Add initial seed data (optional):
  - [ ] Seed 1–2 demo subjects/topics for local dev.

---

## Phase 3 – Basic UI Shell & Navigation

**Goal:** Non‑pixel but functional UI across main app sections.

### Tasks

- [ ] Create `/app` sub‑routes:
  - [ ] `/app/room` – Pixel study room (placeholder version).
  - [ ] `/app/feynman` – Feynman mode.
  - [ ] `/app/review` – Flashcard review mode.
  - [ ] `/app/research` – AI Research Desk.
  - [ ] `/app/analytics` – Stats & dashboard.
  - [ ] `/app/settings` – Profile & preferences.
- [ ] Implement a sidebar/nav linking these pages.
- [ ] For now, use simple Tailwind/CSS boxes; pixel art comes later.

---

## Phase 4 – Feynman Mode Implementation

**Goal:** Fully working Feynman explanation + gap analysis flow.

### Backend

- [ ] Create an Edge Function `feynman-evaluate`:
  - Input: `{ topicId, explanationText }`.
  - Logic:
    - Call LLM with the “Inquisitive Student” prompt (from spec) to:
      - Ask 1–2 clarifying questions.
      - Paraphrase back.
      - Classify text into green/amber/red points.
    - Store result in `feynman_explanations` (raw text, AI summary, `gaps_json`).
- [ ] Expose API route or server action to call `feynman-evaluate`.

### Frontend

- [ ] Page `/app/feynman`:
  - [ ] Topic selector (from `subjects` + `topics`).
  - [ ] Text area for explanation.
  - [ ] “Evaluate” button:
    - Calls `feynman-evaluate`.
    - Displays:
      - AI questions.
      - Paraphrase.
      - Highlighted green/amber/red segments.
  - [ ] “Create cards from this explanation” button:
    - Opens a dialog listing suggested Q/A pairs derived from the explanation.
    - User can edit/accept them, then create `cards` records.

---

## Phase 5 – SM‑2 Flashcards & Review Queue

**Goal:** Real spaced repetition engine and review loop.

### Backend

- [ ] Edge Function `sm2-review`:
  - Input: `{ cardId, grade }`.
  - Logic:
    - Fetch card’s `interval`, `repetition`, `efactor`.
    - Apply SM‑2 algorithm to compute new values.
    - Update `cards` and insert into `card_reviews`.
    - Optionally grant XP/coins and adjust pet affinity in a single transaction.
- [ ] Server function or RPC to fetch “due cards”:
  - Query `cards` where `next_review_at <= today` (plus maybe a cap).
  - Order by `next_review_at` and `repetition`/difficulty.

### Frontend

- [ ] Page `/app/review`:
  - [ ] Fetch due cards for the user.
  - [ ] Show one card at a time:
    - Hide answer initially → reveal on click.
    - Then show 0–5 grade buttons.
  - [ ] On grade:
    - Call `sm2-review`.
    - Move to the next card.
  - [ ] Show progress indicator (e.g., “3 / 20 cards reviewed”).

---

## Phase 6 – Study Planner & Sessions

**Goal:** Basic yet real study planner using spacing rules.

### Backend

- [ ] Planner logic:
  - [ ] For each subject:
    - Use exam date (if any) and target hours to propose a schedule.
    - Simple rules for MVP:
      - New learning blocks early.
      - Auto‑create review sessions at 1, 3, 7 days after initial exposure.[web:3][web:8][web:24]
  - [ ] Store planned sessions in `study_sessions` or derive them on the fly from card and exam data.
- [ ] RPC or server function: `getWeeklyPlan(userId, weekRange)`.

### Frontend

- [ ] Add `/app/planner` (or integrate into `/app/analytics`):
  - [ ] Weekly calendar view showing planned sessions.
  - [ ] Ability to mark sessions as done (or they are inferred from actual study_sessions).
- [ ] Tie session start/end to:
  - [ ] “Start session” button in Feynman/Review/Research.
  - [ ] Upon completion, record `study_sessions` row.

---

## Phase 7 – Pixel Room, Avatar & Pet (Visual Core)

**Goal:** Implement the core pixel‑art experience and tie it to real behavior.

### Assets & Licensing

- [ ] Download chosen LPC assets:
  - Characters and clothes via Universal LPC Spritesheet / Character Generator.[web:80][web:7][web:86]
  - Animals/pets via Fantasy Monster & Animal Sprites, etc.[web:82][web:88]
  - Tilesets via LPC Tile Atlas and selected 16×16 RPG Tileset.[web:87][web:81]
- [ ] Download Kenney Pixel UI Pack + any CC0 UI icon sets.[web:83][web:84][web:91]
- [ ] Update `ASSETS.md` with exact packs, authors, and URLs.
- [ ] Export credits (CREDITS.csv/text) from LPC generator and add to repo.[web:7][web:86]

### Frontend Implementation

- [ ] Build a **fixed‑resolution pixel container**:
  - E.g., 320×180 → scaled with CSS `transform: scale()` and `image-rendering: pixelated`.[web:11][web:16]
- [ ] Compose the study room:
  - [ ] Use LPC tiles to build a room background (floor, walls, shelves, desk).
  - [ ] Either pre‑render on a canvas during build or use background images with tile‑aligned positioning.
- [ ] Character sprite:
  - [ ] Load base LPC body, head, hair, outfit layers.
  - [ ] Compose them in a canvas or overlapping `<div>`s.
  - [ ] Implement idle animation using CSS `steps()` or simple frame cycling.
- [ ] Pet sprite:
  - [ ] Choose 1–2 pets (e.g., cat/bird).
  - [ ] Animate idle + “happy” and “sad” states.
- [ ] Hook up state:
  - [ ] Avatar customization UI in `/app/settings` (choose body/hair/outfit from allowed options).
  - [ ] Pet state derived from recent activity (e.g., check last 3 days of study_sessions and card_reviews).
  - [ ] Display pet in states: happy/neutral/sad/forest_rescue.

---

## Phase 8 – AI Research Desk (MVP RAG‑lite)

**Goal:** Teach academic search with real papers before heavy RAG.

### Backend

- [ ] Edge Function `semantic-scholar-search`:
  - Input: `{ query }`.
  - Calls Semantic Scholar `paper/search` API.[web:37][web:42][web:47]
  - Returns title, authors, year, citationCount, abstract, URLs.
- [ ] Tables:
  - [ ] Save selected papers in `papers` table (user‑scoped).
  - [ ] At this stage, skip heavy PDF parsing; just store metadata and abstracts.

### Frontend

- [ ] `/app/research`:
  - [ ] Search input with hints on keywords (instead of full sentences).
  - [ ] Results list from `semantic-scholar-search`.
  - [ ] “Save paper to topic” → link to a `topicId`.
  - [ ] Abstract viewer with:
    - Highlight + “Make Card” button.
    - Highlight + “Send to Feynman” button (create prefilled explanation prompt).

---

## Phase 9 – Analytics & Dashboard

**Goal:** Useful feedback on progress, mastery, and consistency.

### Backend

- [ ] Write SQL views or RPCs in Supabase to aggregate:
  - Weekly totals of `study_sessions` (minutes, mode counts).
  - Card review counts and average grades per topic.
  - Streak/consistency data (days with at least one session).[web:5][web:15]

### Frontend

- [ ] `/app/analytics`:
  - [ ] Line/bar charts for:
    - Sessions per day (last 7/30 days).
    - Cards reviewed per day.[web:15]
  - [ ] Topic mastery list (based on card EF/repetition or review grades).
  - [ ] Calendar heatmap for consistency.[web:5][web:15]

---

## Phase 10 – Gamification Logic (XP, Coins, Quests)

**Goal:** Tie study behaviors to progression in a controlled, non‑exploitative way.

### Backend

- [ ] Design XP/coin grant rules:
  - E.g., per card reviewed, per Feynman explanation, per completed session.
- [ ] Implement a service (or Edge Function) `reward-session`:
  - Takes a `study_session` and:
    - Computes XP/coins.
    - Updates `profiles.xp`, `profiles.coins`, `profiles.level`.
    - Updates `pets.affinity` and `state` based on recent history.
- [ ] Add “daily mission”/“weekly quest” tables if needed for more advanced quests later.

### Frontend

- [ ] Show XP bar and coin count in the main layout.
- [ ] Show today’s missions in `/app/room` (e.g., dynamic checklist based on planner).
- [ ] Show small popups (“+10 XP”, “Pet is happier!”) after key events.

---

## Phase 11 – Social & Parties (Optional but Planned)

**Goal:** Cooperative buffering against failure and group accountability.

### Backend

- [ ] Tables:
  - [ ] `parties` (id, name, owner_id, visibility).
  - [ ] `party_members`.
  - [ ] `party_quests` (shared weekly goals).
- [ ] Functions:
  - [ ] `join-party`, `leave-party`.
  - [ ] `complete-party-quest` (aggregates contributions).
- [ ] Logic:
  - [ ] Missed days can create “help” quests (e.g., “I missed 3 days, help me finish 3 sessions this week”) instead of hard punishment.[web:23][web:29][web:32]

### Frontend

- [ ] `/app/party` page:
  - [ ] See members, weekly goals, and progress bars.
  - [ ] Simple “cheer” reactions and short messages (no heavy feed).
- [ ] Add party indicators in `/app/room` (e.g., tiny avatars of party members online).

---

## Phase 12 – Full RAG Research Desk (v1+)

**Goal:** Retrieval‑augmented Research Desk with pdf parsing and vector search.

### Backend

- [ ] Enable pgvector and vector indexes (already done earlier).[web:65][web:71][web:74][web:77]
- [ ] Edge Function `parse-and-embed-paper`:
  - Download PDF (Semantic Scholar `openAccessPdf` URL or user upload).
  - Use a CPU parser first (Docling or similar) to get sectioned text.[web:35][web:40][web:45]
  - Chunk by headings/paragraphs:
    - 256–512 tokens with small overlap.[web:50][web:52][web:56][web:62]
  - Generate embeddings for each chunk.
  - Store chunks + embeddings in `paper_chunks`.
- [ ] Edge Function `rag-answer`:
  - Input: `{ question, paperId? }`.
  - Build question embedding.
  - Run similarity search on `paper_chunks` with vector operators.[web:50][web:52][web:60][web:62]
  - Feed top‑k chunks to LLM with instructions to cite sections.
  - Return answer + highlightable snippet metadata.

### Frontend

- [ ] Upgrade `/app/research`:
  - [ ] “Ask a question about this paper/topic” input.
  - [ ] Display AI answer with inline citations and snippet list.
  - [ ] Allow user to turn parts of the AI answer into cards or Feynman prompts.

Later, when you hit complex/scanned PDFs, you can add a second parser tier (MinerU, Unstructured) and hierarchical chunking as per modern RAG best practices.[web:40][web:41][web:48][web:62]

---

## Phase 13 – Polish, Accessibility, and Launch

**Goal:** Production‑ready, accessible, and performant app.

### Tasks

- [ ] UI polish:
  - [ ] Tighten pixel art alignment and scaling.
  - [ ] Use consistent color palette and typography.
  - [ ] Add transitions and micro‑animations sparingly.
- [ ] Accessibility:
  - [ ] Keyboard navigation for main flows.
  - [ ] Sufficient contrast and focus states.
  - [ ] Aria labels for buttons/icons.
- [ ] Performance:
  - [ ] Optimize images and spritesheets.
  - [ ] Use code‑splitting for heavy routes.
  - [ ] Cache static assets properly.
- [ ] Security:
  - [ ] Audit RLS policies.
  - [ ] Ensure no API keys in the browser.
  - [ ] Rate‑limit sensitive Edge Functions.
- [ ] Final checks:
  - [ ] Credits screen and ASSETS information.
  - [ ] Responsible AI/academic honesty notice.
  - [ ] Error boundary pages and helpful 404/500.

After this phase, Pixel Study OS should be a fully functional web app with:

- Deep study workflows (Feynman, SM‑2, planner).
- A real pixel‑art room, avatar, and pet tied to behavior.
- An AI Research Desk that teaches research instead of replacing it.
- Optional social/party mechanics and RAG‑powered research for advanced users.