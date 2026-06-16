# Pixel Study OS – Product & Architecture Spec

## 1. Overview

Pixel Study OS is a web application that combines evidence‑based study methods, an AI‑assisted Research Desk, and a cozy pixel‑art game world with pets and avatars.[web:3][web:8][web:24]
The goal is to create a serious “study operating system” instead of a generic AI homework helper: students explain concepts, practice retrieval, plan spaced reviews, and research papers, while their pixel character and pet grow alongside their real skills.[web:3][web:8][web:24]

Core principles:

- **Learning first:** All game mechanics (XP, quests, pet mood, cosmetics) are tied to real study behaviors and mastery, not just time spent.
- **No AI slop:** AI never writes full assignments; it guides research, asks questions, and helps identify gaps.
- **Gentle motivation:** Pets, rooms, and cooperative parties create positive pressure without punishing streak resets.[web:23][web:29][web:32]
- **Cozy pixel‑art aesthetic:** The interface feels like a small RPG or life‑sim (Stardew‑style) while staying clean and usable.[web:11]

---

## 2. Pedagogical Foundations

Pixel Study OS is grounded in six evidence‑based learning strategies from cognitive psychology:[web:3][web:8][web:21][web:24]

- **Spaced practice:** Spread study over time instead of cramming.
- **Retrieval practice:** Actively recall information (questions, flashcards, Feynman explanations).
- **Interleaving:** Mix topics/problem types within a session.
- **Elaboration:** Explain why/how, connect ideas, and use analogies.[web:18][web:27]
- **Concrete examples:** Ground abstract ideas in specific cases.
- **Dual coding:** Combine words with visuals (diagrams, maps).[web:8][web:18]

Motivational design follows self‑determination theory:

- **Autonomy:** Users choose subjects, missions, avatars, and pets.[web:4][web:9]
- **Competence:** Clear feedback on mastery per topic and card.[web:15]
- **Relatedness:** Cooperative parties, shared quests, and soft social accountability.[web:9][web:14][web:23]

---

## 3. Target Users and Use Cases

### 3.1 Target users

- University and high‑school students preparing for exams.
- Self‑learners studying complex topics (CS, math, literature, etc.).
- Neurodivergent learners (e.g., ADHD) who benefit from structure, chunking, and low‑friction routines.

### 3.2 Primary use cases

- Turning lecture notes and textbook sections into Feynman explanations and flashcards.
- Planning multi‑week exam prep using spaced repetition and topic coverage.
- Conducting guided research with academic papers via the AI Research Desk.[web:19][web:28][web:37][web:42]
- Maintaining a sustainable daily study habit supported by a pet and party.

---

## 4. Core Experience & Flows

### 4.1 Onboarding

1. Sign up / log in (Supabase Auth).
2. Choose study goals (exams, projects, general learning) and time horizon.
3. Create subjects and topics; optionally add exam dates.
4. Choose a base avatar and pet; explain that deeper customization unlocks through learning.
5. Generate an initial weekly plan (simple spacing rules) and run a first guided Feynman + card session.

### 4.2 Daily loop

- Open the app → arrive in the pixel study room.
- See **today’s missions** (e.g., Feynman explanation, 20 card reviews, 25 minutes focus).
- Start a focus session (Feynman, cards, or research).
- Earn XP/coins and improve pet mood as missions are completed.
- End‑of‑day summary shows progress, mastery highlights, and pet/room changes.

### 4.3 Study modes

- **Feynman Mode:** Explain a concept in simple language → AI “Inquisitive Student” asks clarifying questions → AI highlights strong points and gaps → user converts key ideas into cards.
- **Review Mode (SM‑2):** Review due cards in an optimized order, grading recall quality; the scheduler updates `interval`, `repetition`, and `efactor` per SM‑2.[web:3][web:8][web:24]
- **Research Mode:** Use the AI Research Desk to search academic papers, extract key ideas, and create cards and explanations from them.[web:19][web:28][web:37][web:42]

---

## 5. Major Feature Pillars

### 5.1 Study Planner & Scheduling

- Create subjects and topics with optional exam dates.
- Auto‑generate a weekly plan that balances new learning and review using spacing rules.[web:3][web:8][web:24]
- Show a calendar and timeline of upcoming sessions per subject.
- Reschedule missed sessions intelligently instead of compressing them.

### 5.2 Feynman Dialogue Engine

- Text editor where the user explains a topic in their own words.
- AI “Inquisitive Student” agent:
  - Asks naive, simple questions.
  - Requests analogies and examples.
  - Probes edge cases (“does this still apply if…?”).
  - Paraphrases back to check understanding.
  - Marks parts as **green** (solid), **amber** (vague), **red** (gaps).
- One‑click card generation from explanation sections.

### 5.3 Flashcards & SM‑2 Spaced Repetition

- Card model: `front`, `back`, `source_type` (Feynman / Research / Manual).
- SM‑2 algorithm implementation on the backend (Supabase Edge Function):
  - Tracks `interval`, `repetition`, `efactor`, `next_review_at`.
  - Accepts grades 0–5 and updates schedule accordingly.
- Review UI:
  - Show card front → user recalls → reveal back → user grades recall.
  - Follows a due‑date queue prioritized by `next_review_at`.

### 5.4 Pixel Room, Avatar, and Pet

- **Pixel room UI:**
  - Background pixel study room (walls, floor, desk, shelves, plants).
  - Composited avatar (body + head + hair + outfit + accessory).
  - Pet sprite with different states (happy, neutral, sad, forest_rescue).
- **Rewards:**
  - XP → level‑ups and cosmetic unlocks.
  - Coins → room items and avatar accessories.
- **Pet behavior:**
  - Missing days gradually lowers affinity → pet becomes sad or retreats to a “forest rescue” state.
  - Completing restorative quests (e.g., one focus session + 10 reviews) improves state.

### 5.5 AI Research Desk (MVP)

- Search academic papers via Semantic Scholar API:
  - Guided keyword UI instead of free‑form prompts.
  - Show title, authors, year, citation count, and abstract.[web:37][web:42][web:47]
- Allow users to:
  - Pin 1–3 key papers per topic.
  - Highlight abstract or selected text and convert it into cards or Feynman prompts.
- Later versions add PDF parsing, chunking, embeddings, and full retrieval‑augmented generation.

### 5.6 Analytics & Progress

- **Dashboard:**
  - Weekly statistics: sessions, cards reviewed, new cards created.[web:15]
  - Mastery per topic based on card performance.
  - Consistency heatmap (days with completed missions).[web:5][web:15]
- **Reflections:**
  - Optional short journal entries at the end of a session.

### 5.7 Social & Parties (v1+)

- Create or join a small party (3–5 people).
- Shared weekly quests (e.g., total cards reviewed, Feynman sessions completed).
- Soft social features: “cheer” reactions, simple chat, no noisy feed.
- Failed streaks become “help me” quests instead of punishing resets, aligning with findings that cooperative challenges sustain motivation better than solo trackers.[web:23][web:29][web:32]

---

## 6. Visual & UX Design

### 6.1 Overall pixel style

- Low‑resolution base (e.g., 256×144 or 320×180) scaled up by integer multipliers.
- Use CSS `image-rendering: pixelated` and integer transforms to keep edges sharp.[web:11]
- 8px spacing grid for layout; limited harmonious color palettes.
- Clear affordances: buttons with 1‑pixel borders, hover/active states; distinct panels for dialogs.[web:11][web:16]

### 6.2 Chosen sprite sources

#### 6.2.1 Characters & clothing – LPC character sets

- **Source:** Liberated Pixel Cup (LPC) character sprites and Universal LPC Spritesheet Character Generator.[web:12][web:82][web:80][web:7]
- **What they provide:**
  - Human base bodies (male/female, different builds).
  - Modular heads, hair styles, clothes, armor, accessories.[web:82][web:80]
- **Licensing:**
  - LPC assets are dual‑licensed under **CC BY‑SA 3.0** and **GPL 3.0**.[web:12][web:80]
  - Universal LPC generator includes assets under CC0, CC BY, CC BY‑SA, OGA‑BY, and GPL; the most restrictive license (usually CC BY‑SA or GPL) effectively governs the combined sprite.[web:7][web:86]
- **How to use correctly:**
  - Use the Universal LPC generator site or repo to create composite characters from body/head/hair/clothing layers.[web:86][web:92]
  - When exporting a composite sprite, also export or copy the **CREDITS.csv** / credits text to your repo.[web:7][web:86]
  - In your app, include an in‑app **“Art Credits”** screen that lists:
    - All LPC authors involved.
    - Licenses (CC BY‑SA 3.0 / GPL 3.0) and links to original pages.[web:7][web:82]
  - Treat all derived LPC art (your recolors, edits, composites) as CC BY‑SA 3.0 / GPL 3.0 derivatives and do **not** lock them behind DRM or incompatible licenses.[web:7][web:12][web:80]

#### 6.2.2 Pets & creatures – LPC animals & monsters

- **Sources:**
  - LPC character & animal collections on OpenGameArt (e.g., “LPC Character Sprites”, “Fantasy Monster & Animal Sprites”).[web:82][web:88]
- **What they provide:**
  - Animals suitable for pets (cats, dogs, birds, etc.).[web:82][web:88]
  - Fantasy creatures that could appear as “Bad Guys” representing cognitive obstacles.[web:88]
- **Licensing & use:**
  - Same LPC licensing rules as characters (CC BY‑SA 3.0 / GPL 3.0).[web:12][web:82]
  - Add their authors and URLs to your ASSETS/CREDITS list.

#### 6.2.3 Environment tiles – LPC tilesets

- **Sources:**
  - LPC Tile Atlas and LPC‑style 16×16 RPG tilesets on OpenGameArt (indoor/outdoor, furniture, nature).[web:87][web:81]
- **What they provide:**
  - Floors, walls, desks, bookshelves, windows, plants, etc., in the same visual language as LPC characters.[web:81][web:87]
- **Licensing & use:**
  - CC BY‑SA 3.0 / GPL 3.0, same as other LPC assets.[web:12][web:87]
  - Maintain a list of tile sheets used and include those authors and URLs in credits.

#### 6.2.4 UI chrome – Kenney Pixel UI Pack + CC0 UI assets

- **Primary UI pack:**
  - **Kenney Pixel UI Pack** – 700+ UI elements: buttons, sliders, panels, bars; licensed **CC0** (public domain).[web:83][web:84][web:89][web:90]
- **Additional UI icons:**
  - CC0 UI/icon sets like Lucid icons and “Free Game UI Assets” (SVG/PNG), also CC0.[web:85][web:91]
- **Why this combo:**
  - LPC art handles characters and environments (share‑alike), while Kenney and other CC0 assets give you flexible, no‑restriction UI that you can freely recolor and adapt.[web:83][web:84][web:91]
- **How to use correctly:**
  - Kenney assets are CC0: you may use, modify, and ship them in commercial projects with no attribution requirement, though credit is appreciated.[web:83][web:84][web:89][web:90]
  - CC0 UI/icon packs likewise require no attribution; you can still thank authors in your credits.

### 6.3 Composition & implementation

- **Characters & pets:**
  - Load base LPC spritesheets as layers (body, head, hair, outfit, pet).
  - Composite in HTML `<canvas>` or via layered backgrounds with synced `background-position`.
  - Turn off smoothing: set `ctx.imageSmoothingEnabled = false` for canvas, and `image-rendering: pixelated` for CSS backgrounds.[web:11]
  - Use CSS `steps()` animations or a sprite animator to move across sprite frames.

- **Environment:**
  - Use LPC tilesets to build the study room as a grid (e.g., 16×16 tiles).[web:81][web:87]
  - Pre‑compose static backgrounds (walls, floor, furniture) into a single PNG to minimize draw calls if using canvas.

- **UI:**
  - Wrap content in Kenney‑style pixel frames for dialogs, panels, and buttons.[web:83]
  - Use a CC0 pixel font (e.g., `m5x7`, `monogram`, `Pixeloid`) for headings and labels.[web:85]

---

## 7. Tech Stack

### 7.1 Frontend

- **Framework:** Next.js with TypeScript (App Router).[web:66][web:72][web:78]
- **UI:** Custom pixel UI built with:
  - Tailwind CSS or CSS Modules for layout.
  - Kenney Pixel UI Pack + CC0 icons for panels/buttons.[web:83][web:91]
- **State management:** React Query / TanStack Query + local state.
- **Rendering details:**
  - Integer scaling and `image-rendering: pixelated` for crisp pixel art.[web:11]
  - CSS `steps()` animations for sprite movement.

### 7.2 Backend & Infrastructure

- **Backend platform:** Supabase – Postgres, Auth, Storage, Realtime, Edge Functions.[web:64][web:70][web:76]
- **Database:** Supabase Postgres with tables:
  - `profiles`, `subjects`, `topics`, `study_sessions`.
  - `feynman_explanations`, `cards`, `card_reviews`.
  - `avatars`, `pets`.
  - `papers`, `paper_chunks`.
- **Auth:** Supabase Auth (email/password + optional OAuth).[web:64][web:70]
- **Storage:** Supabase Storage for user PDFs and any custom sprite variants.
- **Vector store:** pgvector inside Supabase (vector columns on `paper_chunks`).[web:65][web:71][web:74][web:77]
- **Serverless / business logic:** Supabase Edge Functions for:
  - SM‑2 review updates.
  - Semantic Scholar API queries.
  - Parsing PDFs and generating embeddings.
  - RAG‑based Research Desk answers.

### 7.3 AI & External APIs

- **LLM provider:** OpenAI / Anthropic / similar (behind Edge Functions).
- **Embedding model:** OpenAI or equivalent; dimension matches `vector(…)` column.[web:71][web:77]
- **Academic search:** Semantic Scholar Academic Graph API for paper search and metadata.[web:37][web:42][web:47]
- **Future parsing stack:** Docling / MinerU / Unstructured for complex PDFs when needed.[web:35][web:40][web:41][web:45]

---

## 8. Data Model (MVP Overview)

- `profiles` – user settings (timezone, ADHD mode, focus audio), XP, coins, level.
- `subjects`, `topics` – what the user is studying.
- `study_sessions` – logs of each session.
- `feynman_explanations` – raw explanations and AI gap analysis.
- `cards` – flashcards with SM‑2 state.
- `card_reviews` – history of card reviews.
- `avatars` – avatar customization.
- `pets` – pet type, mood/state, affinity.
- `papers` – linked or uploaded academic sources.
- `paper_chunks` – parsed and embedded chunks for RAG.

---

## 9. MVP vs Later Versions

### 9.1 MVP (v0)

- Auth and profile settings.
- Subjects, topics, and basic planner.
- Feynman explanation flow with “Inquisitive Student”.
- SM‑2 cards and review queue.
- Pixel room with one avatar and one pet, a few cosmetic unlocks (from LPC + Kenney).
- AI Research Desk (Semantic Scholar search, abstract display, card creation).[web:37][web:42]
- Simple dashboard: weekly stats and consistency heatmap.[web:5][web:15]

### 9.2 v1

- pgvector‑backed RAG for paper chunks in Supabase.[web:65][web:68][web:71][web:74][web:77]
- Party system and cooperative weekly quests.
- Richer pet behaviors and avatar cosmetics.
- Basic PDF parsing pipeline for digital PDFs.

### 9.3 v2+

- Advanced document parsing (Docling, MinerU, Unstructured) for complex PDFs.[web:35][web:40][web:41][web:45]
- Citation network graphs and research journeys.
- Resilience tracking and micro‑quests.
- Deeper analytics and reports.

---

## 10. Asset Licensing & Credits Checklist

To “make no mistake” with assets and licenses, follow this checklist:

1. **Maintain an `ASSETS.md` file** in the repo:
   - List each LPC set (characters, tiles, animals) with URLs, authors, and licenses (CC BY‑SA 3.0 / GPL 3.0).[web:12][web:80][web:82][web:87]
   - Note that all LPC‑derived sprites are share‑alike.
2. **Export credits from Universal LPC generator** (CREDITS.csv / text file) and include in `ASSETS.md`.[web:7][web:86]
3. **In‑app credits screen:**
   - Show LPC artists and links.
   - Mention use of Kenney and CC0 UI assets (even though attribution is not required).[web:83][web:84][web:89][web:91]
4. **Keep LPC and CC0 assets separate** in your folder structure:
   - `assets/lpc/...` (share‑alike / GPL rules apply).
   - `assets/cc0/...` (Kenney, CC0 icons, fonts).[web:83][web:84][web:85][web:91]
5. **Do not encrypt or DRM‑lock LPC art**, and ensure any redistributed LPC art remains under CC BY‑SA 3.0 / GPL 3.0 terms.[web:7][web:12][web:80]
6. **Fonts:** Prefer CC0 or OFL pixel fonts (e.g., m5x7, monogram, Pixeloid) and list them in `ASSETS.md`.[web:85]

Pixel Study OS uses these open assets carefully so you get a unique, cozy aesthetic while staying legally safe and respectful to original artists.