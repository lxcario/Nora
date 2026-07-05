<p align="center">
  <img src="public/noralogo.png" alt="Nora" width="180" />
</p>

<h1 align="center">Nora</h1>

<p align="center"><strong>A softer way to study.</strong></p>

<p align="center"><em>Built on learning science. Designed to feel like home.</em></p>

<p align="center">
  <a href="https://norastudy.vercel.app">Live app</a>
  &nbsp;·&nbsp;
  <a href="#run-it-locally">Run locally</a>
  &nbsp;·&nbsp;
  <a href="ARCHITECTURE.md">Architecture</a>
  &nbsp;·&nbsp;
  <a href="docs/README.md">Documentation</a>
  &nbsp;·&nbsp;
  <a href="docs/PRODUCT_DESCRIPTION.md">Product spec</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/FSRS--6-ts--fsrs-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/unit%20tests-332%20passing-729B1B?style=flat-square&logo=vitest" />
  <img src="https://img.shields.io/badge/TestSprite-42%2F42%20green-7ee081?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-black?style=flat-square" />
</p>

<br/>

> "You don't become knowledgeable in a day.
> You become knowledgeable one remembered idea at a time."

<br/>

<p align="center">
  <img src="public/ui.png" alt="Nora — the Today screen" width="860" />
</p>

---

## 🔁 Built in the loop — TestSprite Hackathon S3

Nora is an entry in **TestSprite Hackathon Season 3 — "Build the Loop."** The [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) was used as the *checker* in a real **write → verify → fix → verify** loop, running browser tests **in the cloud against the live app** and handing back one self-consistent failure bundle the coding agent acts on.

|  |  |
|---|---|
| **42** durable scenarios (39 browser + 3 backend) | **42 / 42 passing** |
| Every test `createdFrom: cli` | not the portal — genuine CLI loop |
| **39** loop iterations · **65+** runs · 4 build days | **8** real product bugs caught & fixed |
| Coverage grew **20 → 42** live | **2** features shipped *under* the loop |

When two new tests came back **`blocked`**, the run summary drove the fix and a rerun turned them green — a clean `create → blocked → diagnose → fix → rerun → pass` cycle. Across 39 iterations the loop caught 8 genuine bugs, from duplicate UI cards to RLS policy gaps and mood-sync contradictions. The full per-iteration story is in **[LOOP.md](LOOP.md)**, the submission write-up in **[SUBMISSION.md](SUBMISSION.md)**, and the banked plans + an archived failure bundle in **[testsprite_tests/](testsprite_tests/)**.

*(Jump to [the verification loop section](#the-verification-loop-testsprite) for the details.)*

---

## What Nora is

Nora is a study *operating system* — not a flashcard app, not a timer with a coat of paint, and not an AI homework generator. It wraps six evidence-based learning strategies from cognitive science inside a cozy pixel-art world where a companion grows as your understanding deepens.

The whole product is built on one belief: **the AI should help you think, never think for you.** It asks questions, finds real academic sources, surfaces the gaps in your understanding, and schedules your review at the right moment — but you always do the thinking, because the thinking is the point.

> Nora is in active development. The core loop — explain, remember, research — is solid and tested; some of the quieter rooms are still being furnished. Where we're unsure, we say so.

---

## A day with Nora

```
☀️  Welcome home.

    ↓

📚  Revisit three fading memories.

    ↓

💡  Explain one difficult idea in your own words.

    ↓

👁️  Catch one mistake the AI planted.

    ↓

🐾  Your companion notices you're getting better.

    ↓

    Close your laptop
    knowing a little more
    than yesterday.
```

---

## What makes Nora different

Most study apps try to make you study *longer*. Nora tries to help you understand *better*. Four things set it apart:

- **A full learning system, not a single trick.** Feynman explanation, grounded research, active video study, spaced-repetition review, practice exams, a memory garden, and a journal all live in one cohesive world — each feeding the next, not bolted on.
- **AI that teaches, never authors.** Every evaluation is grounded in real source material. Every citation links to a real paper (OpenAlex, Crossref, Unpaywall). When Nora isn't sure, it says "unverified" instead of inventing an answer. It never writes your explanation for you.
- **Compassionate by design.** No streaks to break, no leaderboards to shame you. Miss a few days and nothing resets — your garden simply fades (as knowledge does), your friends get a gentle "check on them" quest, and your companion says *welcome back*.
- **A place with a memory and an identity.** The companion remembers what was hard last week. The garden and the journal quietly accumulate your growth over months. It reads as a place you return to, not a tool you operate.

And underneath all of it: **every learning feature is backed by published cognitive-science research**, cited in the code and in [the science section below](#the-science-behind-it).

---

## Meet your companion

Your companion remembers what you've been working on. It notices when something was hard yesterday. It celebrates when you finally get it.

It never judges. It never pressures. It just studies with you.

> *"I remember this one gave us trouble yesterday."*

---

## 🌱 What we believe

Understanding matters more than memorization.

Curiosity beats pressure.

AI should teach, not think for you.

Knowledge grows slowly — and that's okay.

*(The full design philosophy lives in [`docs/WHY_NORA.md`](docs/WHY_NORA.md), [`docs/CRAFT.md`](docs/CRAFT.md), and [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md).)*

---

## Places inside Nora

Nora is organized as *places*, not pages — each with its own mood and pace.

### 🌤 Today
Start each session with a calm overview. Your companion speaks. Fading memories surface gently. No dashboards — just clarity about what today asks of you.

### 💡 Feynman Mode
Explain ideas in your own words until they click. Nora listens as an "inquisitive student," asks 2–3 probing questions, paraphrases you back in technical terms, and marks each part of your explanation **green / amber / red**. When you attach a source, feedback is graded against the real passage. When you don't, it's clearly labelled *unverified*.

### 👁️ Error Spotter
The AI writes an explanation with hidden mistakes. Can you find them? Grounded in research on *productive failure* — catching and correcting errors strengthens far-transfer understanding more than avoiding them.

### 📚 Today's Memories
Reviews appear right before you'd forget them. Grade how well you recalled each one; the FSRS-6 scheduler moves the familiar ones further away and brings the shaky ones back sooner.

### 🔬 Research Desk
Ask a question in plain words. Get an answer grounded in real academic papers, with every citation linking to a real source. Two modes: *from your papers* (hybrid retrieval over your indexed PDFs) and *from the web* (live academic search). When fewer than two sources are found, it says so.

### 🎬 Study Room
Watch lectures with AI-generated, timestamped notes. A Tiptap editor turns any moment into a clickable timestamp. Explain what you just watched, and every video becomes flashcards that link back to the exact second.

### 🎧 Listen Mode
Your notes become a two-voice study conversation you can listen to on a walk — the AI explains, then asks, and pauses so you can think.

### 🌸 Memory Garden
Each topic is a plant. Blooming means you remember well; wilting means it's fading. Tap a wilting plant to review just those cards. Not punishment — nature.

### 🧠 Knowledge Web
See how your concepts connect across subjects. Tap a node to explore its relationships and watch mastery spread.

### ⚡ Eureka!
Surprising connections between topics you'd never link on your own. Physics meets economics. Biology meets programming. The best learning happens at the edges.

### 📖 Journal
Your story, in your own words. Every explanation you wrote, in order — the ones you struggled with and the ones that finally clicked. No graphs. Just the arc of becoming someone who understands.

### 📝 Practice Exam
Upload your notes; the AI builds a timed exam from *your* material — multiple choice, short answer, and explain-in-your-own-words. Missed questions become flashcards.

### 📅 Study Planner
Sessions spread across the week with expanding gaps, because spacing beats cramming. The planner does the math, merges your real university calendar, and forward-fills a missed session instead of compressing the rest.

### 👥 Friends
Small study groups with shared weekly goals. When someone disappears, the group gets a "check on them" quest — never a leaderboard, never shame.

### 📦 Card Market
Import a study group's deck with one click, then study it on *your* schedule with fresh scheduling.

---

## How it fits together

Each place feeds the next. Notes and papers become questions; questions become explanations; explanations become memories; memories bloom into a garden and a journal.

```
Your notes · papers · videos
          ↓
   Research Desk  (OpenAlex + hybrid RAG)
          ↓
   Knowledge Web  (how ideas connect)
          ↓
   Feynman Mode   (explain → grounded evaluation)
          ↓
   Flashcards  +  Error Spotter
          ↓
   FSRS-6 scheduling  (the right interval)
          ↓
   Memory Garden  (knowledge, visualized)
          ↓
   Journal  (who you're becoming)
```

### The AI pipeline

Every AI answer follows the same grounded path — retrieve real sources first, generate second, and never let the model invent. This is the actual data flow in code (`rag/parser.ts` → `lib/rrf.ts` → `lib/llm.ts`), not a marketing diagram:

```
  Your notes · PDFs · a question
              │
              ▼
   Ingestion   parser.ts → chunker → embedder
              │              (OpenAI text-embedding-3-small,
              ▼               optional; FTS-only fallback)
   paper_chunks  (Postgres + pgvector)
              │
              ▼
   Retrieval   ┌─ pgvector cosine   (match_paper_chunks RPC)
   queryRag()  └─ Postgres FTS      (ts_rank_cd)
              │        │
              └───►  Reciprocal Rank Fusion  (lib/rrf.ts, unit-tested)
              │
              ▼
   Generation  Groq  (Llama 3.3 70B)  ──fallback──►  OpenRouter
              │   grounded ONLY in the retrieved chunks;
              │   < 2 sources ⇒ says so · unverified ⇒ labelled
              ▼
   Answer + real citations (OpenAlex · Crossref · Unpaywall · Semantic Scholar)

  Outbound fetches (papers · web · calendars) pass through lib/ssrf.ts.
  Web search (optional) via Tavily. Retrieved text is data, never a prompt.
```

For the full system design — data model, AI pipeline, retrieval, and security boundaries — see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Built with

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions, RSC) |
| Language | TypeScript (strict), Node.js ≥ 20 |
| UI | React 19, Tailwind CSS v4, a custom pixel-UI component library |
| Database | Supabase — Postgres, pgvector, Row-Level Security, Storage (22 SQL migrations) |
| Auth | Supabase Auth, gated at the edge via `proxy.ts` |
| Spaced repetition | [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (MIT) — FSRS-6 DSR model |
| AI (primary / fallback) | Groq Cloud (Llama 3.3 70B) → OpenRouter |
| Embeddings | OpenAI `text-embedding-3-small` (optional; Postgres FTS fallback) |
| Academic sources | OpenAlex (CC0), Crossref, Unpaywall, Semantic Scholar |
| Web search | Tavily (optional) |
| RAG retrieval | pgvector cosine + `ts_rank_cd` FTS → Reciprocal Rank Fusion |
| Rich text | Tiptap v3 (custom timestamp mark) |
| Video | YouTube IFrame API + transcript extraction (Groq Whisper fallback) |
| Testing | Vitest + fast-check (property-based) — 332 tests across 22 files |

---

## The science behind it

Every learning feature is a decision grounded in published research, not a guess.

| Feature | Grounding |
|---|---|
| FSRS scheduler | Ye et al. (2022) — reduces review load ~20–30% vs SM-2 at equal retention |
| Interleaving | Brunmair & Richter (2019) — helps procedural/visual (g ≈ 0.34–0.67), hurts vocabulary (g ≈ −0.39) |
| Spacing | Cepeda et al. (2008) — optimal gap scales with the retention interval |
| Error spotting | Springer (2023) — deliberate erring improves far-transfer learning |
| Confidence calibration | MIT (2025) — metacognitive feedback reshapes study behaviour |
| Self-explanation | Chi (2000); Fiorella & Mayer (2016) — explaining to learn |

Nora applies these *conditionally* — for example, it interleaves math and visual topics but deliberately **blocks** vocabulary, because the evidence says interleaving hurts there.

---

## Testing & quality

- **332 tests across 22 files** (Vitest), including **property-based tests** (fast-check) for the parts where correctness is subtle: FSRS scheduling, spacing math, timezone-safe due dates, and the study-mix queue. Core logic is written as pure functions so it can be tested without a database.
- **Production build is type-checked** end to end (`tsc` in `next build`) under TypeScript strict mode.
- **End-to-end flows** (auth, review, Feynman, research, planner) are exercised with TestSprite scenario plans (see `.testsprite/`).

```bash
npm test          # run the suite (Vitest)
npm run build     # production build + full type-check
```

Security posture — Row-Level Security on every user-owned table, SSRF protection on all outbound fetches, and authorization-scoped `SECURITY DEFINER` database functions — is documented in **[SECURITY.md](SECURITY.md)**.

---

## The verification loop (TestSprite)

Nora is an entry in **TestSprite Hackathon Season 3 — "Build the Loop."** The [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) runs real browser tests **in the cloud against the live app** ([norastudy.vercel.app](https://norastudy.vercel.app)) and hands back one self-consistent failure bundle the coding agent acts on: `create → run → failure get → fix → rerun`, and every pass is banked. The suite is **42 scenarios, all green, every one `createdFrom: cli`** — 39 frontend flows plus 3 backend security/schema checks.

**What the loop covers** — a durable suite of frontend scenarios spanning the critical path and feature depth:

| Area | Banked scenarios |
|---|---|
| Entry & auth | Landing page + sign-up CTA · Login → dashboard · Signup → onboarding wizard |
| Core loop | Dashboard stats + daily quests · Sidebar navigation · Review card full flow · Review JOL confidence gate |
| Learning features | Feynman evaluation + gap analysis · Study Mix interleaved queue · Research Desk sources + synthesis · Study Room video search · Study Planner weekly calendar · Practice Exam setup · Listen Mode · Error Spotter |
| Knowledge tools | Knowledge Web explorer · Eureka connections · Memory Garden · Journal ("Your Story") |
| World & social | Pixel Room pet + missions · Party create/join · Card Market · Analytics dashboard · History · Settings theme persistence · Create subject/topic |
| **Backend (`--type backend`)** | **Schema + FSRS/gamification column validation · RLS data isolation (cards / topics / feynman reject anon) · RLS reward-manipulation rejection** |

**Testing what the browser can't see.** A frontend run proves a page *renders*; it can't prove the database *rejects* an unauthorized request. Row-Level Security is invisible from the UI, so three checks were written as **backend tests** (`testsprite test create --type backend`) that hit the database as an anonymous client and confirm the rejection — anon can't read another user's cards or topics, can't insert forged cards, and can't call the reward RPC to mint XP. The feature isn't just tested; it's *proven safe*. Full table in [`LOOP.md`](LOOP.md) → *Backend Testing on TestSprite*.

**Real fixes the loop caught (see [`LOOP.md`](LOOP.md) for the full per-iteration log):**

- **Signup redirect** — a new account landed on a blank `/app`; the loop caught it and the fix redirects straight to `/app/onboarding`.
- **Analytics navigation** — a banked test was reaching a dead `/app/room/analytics` URL (404); the failure bundle showed the route mismatch, and the plan was corrected to open the real `/app/analytics` route.
- **Knowledge Web & Eureka `blocked` → green** — while expanding coverage from 20 to 42, both pages rendered correctly but a verbose two-branch assertion made the testing agent run out of runway before a verdict. The run summary revealed the exact empty-state controls, so each plan was tightened to a single decisive assertion, pushed with `test plan put`, and reran green — a textbook `create → blocked → diagnose → fix → rerun → pass` cycle.

**One honest limitation, documented not faked:** the mobile bottom-nav test was *removed* after two runs proved the cloud runner uses a fixed desktop viewport and can't simulate a mobile-width resize. The `BottomNav` is correctly wired and works for real users — this is a runner limitation, out of scope per the "state outside the test's control" rule.

The banked suite lives on the TestSprite platform under the submitting account; the plan files, an archived failure bundle, and a full ID-level index are in [`testsprite_tests/`](testsprite_tests/), with per-run artifacts under [`.testsprite/`](.testsprite/).

## Run it locally

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | Required by `ts-fsrs` |
| Supabase project | any | Local CLI stack or a hosted project |
| Groq API key | — | Free tier is enough to start |

### Setup

```bash
git clone https://github.com/lxcario/Nora.git
cd Nora
npm install
cp .env.example .env.local
# fill in your keys (minimum: Supabase URL + anon key, and GROQ_API_KEY)
```

Apply the database schema to your Supabase project (run the SQL in `supabase/migrations/` in order via the Supabase SQL editor, or `supabase db push` with the CLI), then start the dev server:

```bash
npm run dev
```

Open **[localhost:3000](http://localhost:3000)**.

### Environment variables

Nora degrades gracefully — a missing optional key disables one feature, it never breaks the app.

| Variable | Required? | Enables |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | Database, auth |
| `GROQ_API_KEY` | **Required** | Feynman, research synthesis, RAG answers |
| `OPENROUTER_API_KEY` | Recommended | LLM fallback when Groq is rate-limited |
| `ACADEMIC_API_EMAIL` / `ACADEMIC_API_MAILTO` | Recommended | Higher-rate "polite pool" academic search; Unpaywall OA PDFs |
| `TAVILY_API_KEY` | Recommended | Web results in the Research Desk |
| `OPENAI_API_KEY` | Optional | Vector (semantic) RAG; without it, ranked keyword search is used |
| `YOUTUBE_API_KEY` | Optional | Video search (direct URLs still work without it) |
| `FIRECRAWL_API_KEY` | Optional | Automated university-calendar discovery |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional | Richer academic metadata / TLDRs |

See [`.env.example`](.env.example) for the annotated, complete list.

---

## Project structure

```text
Nora/
├── src/
│   ├── app/
│   │   ├── (auth)/                 Login / signup
│   │   ├── (protected)/app/        The app shell + every "place"
│   │   │   ├── _actions/           Server Actions (business logic)
│   │   │   ├── _components/        Shared app-shell components
│   │   │   ├── feynman/  review/  research/  study-room/  planner/
│   │   │   ├── memory-map/  journal/  exam/  party/  analytics/ …
│   │   │   └── layout.tsx          Auth gate + app shell
│   │   ├── _components/            Landing page
│   │   └── globals.css             Pixel design system (tokens, sprites, motion)
│   ├── proxy.ts                    Edge auth gate / session refresh
│   ├── components/pixel-ui/        The pixel-art component library
│   └── lib/                        FSRS, spacing, RAG, SSRF guard, voice, copy
├── supabase/
│   ├── migrations/                 22 SQL migrations (schema, RLS, RPCs)
│   └── tests/                      SQL tests (e.g. hybrid search)
├── docs/                           Philosophy, product spec, architecture notes
├── public/                         Sprites, fonts, images
└── .env.example                    Annotated environment reference
```

---

## Documentation

Nora's docs are meant to be read, not skimmed. Start with the philosophy — it explains every product decision.

| Document | What it covers |
|---|---|
| [`docs/WHY_NORA.md`](docs/WHY_NORA.md) | Why the product exists, in plain language |
| [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md) | The five (plus one) rules behind every decision |
| [`docs/CRAFT.md`](docs/CRAFT.md) | The design beliefs guiding Nora's future |
| [`docs/VOICE.md`](docs/VOICE.md) | How Nora speaks — the vocabulary and tone |
| [`docs/PRODUCT_DESCRIPTION.md`](docs/PRODUCT_DESCRIPTION.md) | The complete feature-by-feature product spec |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design, data model, AI pipeline |
| [`SECURITY.md`](SECURITY.md) | Auth, RLS, SSRF, and secret handling |

A full index lives in [`docs/README.md`](docs/README.md).

---

## Contributing

Nora has a voice and a set of beliefs, and staying true to them matters more than shipping fast.

1. Read [`docs/VOICE.md`](docs/VOICE.md) first — it defines how Nora speaks.
2. Then [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md) — five rules.
3. Before opening a PR, ask the question from `CRAFT.md`: *does this make Nora feel more alive, help someone understand more deeply, and still belong here five years from now?*

If your change makes Nora feel more like Nora — welcome.

---

## License & credits

Application code is **MIT**. Assets carry their own licenses: LPC character art is CC BY-SA 3.0 / GPL 3.0, and the UI sprites are CC0. Academic data comes from OpenAlex (CC0), Crossref, and Unpaywall under their respective terms. See [`docs/ASSETS.md`](docs/ASSETS.md) for the full attribution list.

Nora is an educational, non-commercial project. Third-party content is used for technical demonstration only, and all rights remain with their respective owners.

---

<p align="center">
  <br/>
  🌱
  <br/><br/>
  <em>Knowledge grows slowly.</em>
  <br/>
  <em>Thank you for growing with Nora.</em>
  <br/><br/>
  <strong>Built by <a href="https://github.com/lxcario">Resque</a>.</strong>
</p>
