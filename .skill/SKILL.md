---
name: pixel-study-os
description: >
  Build and maintain the Pixel Study OS web app (Next.js + Supabase) using the
  provided specs. Focus on evidence-based learning features, pixel-art UI, and
  respectful use of LPC/CC0 assets. Never turn this into an AI homework
  generator.
version: 1.0.0
author: Pixel Study OS
tags:
  - nextjs
  - supabase
  - typescript
  - postgres
  - ai
  - rag
  - pixel-art
license: MIT
---

# Pixel Study OS – Build Skill

## Overview

This skill is for coding agents working on **Pixel Study OS**, a study web app that combines:

- Evidence-based learning workflows (Feynman explanations, spaced repetition, planner).
- An AI Research Desk that *teaches research* instead of doing homework.
- A cozy pixel-art world with avatars, pets, and a study room, using LPC + CC0 assets.
- A Supabase backend (Postgres, Auth, Storage, Edge Functions, pgvector) and Next.js frontend.[web:64][web:66][web:71][web:74][web:77]

The skill tells the agent how to read the project docs, what tech stack to assume, how to structure code, and what **not** to do.

## When to Use

Use this skill whenever the user asks to:

- Implement or modify **Pixel Study OS** features.
- Work on the **Next.js + Supabase** codebase for this project.
- Change or extend the **schema**, **Edge Functions**, or **RAG pipeline**.
- Add or adjust **pixel-art UI**, sprites, or asset handling.
- Update documentation related to Pixel Study OS (README, specs, etc.).

Do **not** use this skill for unrelated projects or generic coding tasks.

## Project Context

### Core documents

Before making changes, always consult these files in the repo if available:

- `docs/study-os-spec.md` – main product + architecture spec.
- `docs/ASSETS.md` – art/sprite sources and licensing rules.
- `docs/build-plan.md` – phase‑by‑phase implementation roadmap.

Treat these docs as the **source of truth** for:

- Features and flows.
- Data model and Supabase schema.
- Asset choices (LPC, Kenney, CC0) and licensing constraints.[web:12][web:80][web:82][web:83][web:84][web:87][web:88][web:91]

If the repo doesn’t have them yet but the user provides them inline, follow the inline versions.

### Tech stack

Assume:

- **Frontend:** Next.js (TypeScript, App Router), Tailwind or CSS Modules.
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).
- **Vector / AI:** pgvector in Supabase; external LLM + embeddings via Edge Functions.
- **Art:** LPC sprites & tiles for characters, pets, environments; Kenney + CC0 packs for UI.

## Core Principles (Must Respect)

1. **Learning-first, not AI slop**
   - Never turn features into automatic homework solvers or essay generators.
   - AI should:
     - Ask questions (Feynman “Inquisitive Student”).
     - Help users research, explain, and detect gaps.
     - Generate prompts for cards and practice—not final assignments.

2. **Evidence-based study design**
   - Features should support:
     - Spaced practice, retrieval practice, interleaving, elaboration, concrete examples, dual coding.[web:3][web:8][web:21][web:24]
   - When creating new study features, align them with these strategies instead of random gamification.

3. **Gentle gamification**
   - Pets and streaks should motivate without punishing:
     - No hard permadeath or brutal streak resets.
     - Missed days lead to restorative quests, not “game over.”[web:23][web:29][web:32]

4. **Asset licensing**
   - LPC assets → CC BY‑SA / GPL (share‑alike).[web:12][web:80][web:82][web:87][web:88]
     - Keep them in `assets/lpc/...`.
     - Do not DRM‑lock or relicense them in incompatible ways.
   - Kenney & other CC0 assets → no attribution required, but keep them in `assets/cc0/...` and respect their intended use.[web:83][web:84][web:89][web:91]
   - Always update `docs/ASSETS.md` if adding new external art.

5. **Monolith-first architecture**
   - Keep everything in a single Next.js + Supabase project.
   - Use Supabase Postgres + Edge Functions rather than splitting into multiple microservices unless the user explicitly asks for it.[web:51][web:57][web:61]

## Instructions for the Agent

### 1. Before Writing Any Code

1. Locate and read:
   - `docs/study-os-spec.md`
   - `docs/build-plan.md`
   - `docs/ASSETS.md` (if the task touches assets)
2. Identify which **Phase** in `build-plan.md` the user is targeting (e.g., Phase 4 – Feynman Mode, Phase 7 – Pixel Room).
3. Confirm:
   - The relevant database tables/columns.
   - The routes/pages under `/app/...` that should be affected.
   - Any constraints from ASSETS.md (LPC vs CC0).

If docs and code disagree, prefer the **docs**, and flag divergences in comments or commit messages.

### 2. Implementing Features

When the user asks for a feature or change:

1. **Clarify scope** based on `build-plan.md`:
   - Determine whether this is a frontend page, backend logic, Edge Function, schema change, or all of the above.
2. **Respect the stack:**
   - Use Supabase JS client for data access wherever possible.
   - Use Edge Functions for:
     - LLM calls.
     - Semantic Scholar API access.
     - Embedding generation and RAG logic.
3. **Follow architectural patterns:**
   - For SM‑2: keep algorithm in a single, well‑tested module used by Edge Functions and any server actions.
   - For RAG: use pgvector and chunking strategies aligned with industry best practices (structured chunks, ~256–512 tokens, small overlap).[web:50][web:52][web:56][web:62]
   - For pixel UI: centralize sprite paths and animation logic; avoid scattering hard‑coded coordinates.

Always:
- Write typed, idiomatic TypeScript.
- Add minimal but clear comments when handling non‑obvious logic (e.g., SM‑2 math, chunking).
- Keep functions small and focused.

### 3. Database & Supabase Changes

When altering the schema:

1. Edit SQL migrations or Supabase SQL in a way that:
   - Preserves existing data when possible.
   - Adds/updates RLS policies for new tables.
2. Ensure all user‑owned tables have RLS policies that limit access to `auth.uid()` rows.
3. If adding tables for new features (e.g., `parties`, `party_members`), also:
   - Update `docs/study-os-spec.md` (Data Model section).
   - Update `docs/build-plan.md` if the roadmap changes.

### 4. Pixel Art & Asset Usage

When adding or changing sprites:

1. Only pull new LPC assets from:
   - The LPC GitHub repo.
   - OpenGameArt LPC collections listed in ASSETS.md.[web:12][web:80][web:82][web:87][web:88]
2. Place them under `assets/lpc/...` and update ASSETS.md with:
   - Name, URL, author(s), license.
3. For UI:
   - Prefer Kenney Pixel UI Pack and other CC0 UI/icon sets.[web:83][web:84][web:91]
   - Place under `assets/cc0/...` and record them in ASSETS.md.
4. Never:
   - Merge LPC and CC0 art into a single raster asset that confuses licensing.
   - Strip attribution from LPC assets.

### 5. AI / LLM Integration

When adding LLM calls:

1. Keep all keys and secrets **server-side** (Edge Functions, not frontend).
2. Use RAG for research answers when papers and embeddings are available; otherwise:
   - Clearly label responses as general guidance.
3. For the Feynman “Inquisitive Student” agent:
   - Avoid giving full expert explanations immediately.
   - Ask clarifying questions.
   - Help the user identify gaps and then summarize.

### 6. Output Format for Responses

When responding to the user (in chat or comments):

- Be concise but precise.
- Reference relevant sections of `study-os-spec.md` or `build-plan.md` where helpful.
- When presenting code, use fenced blocks with language tags (`ts`, `tsx`, `sql`, `bash`, etc.).
- Avoid changing the product’s core philosophy unless the user explicitly requests it.

## Examples

### Example 1 – Implement Feynman Mode Page

**User request:**  
“Implement the Feynman Mode page for Pixel Study OS.”

**Agent approach:**

1. Read `docs/study-os-spec.md` → Feynman Dialogue Engine section.
2. Read `docs/build-plan.md` → Phase 4.
3. Implement:
   - `/app/feynman/page.tsx` with:
     - Topic selector.
     - Explanation textarea.
     - Button to call `feynman-evaluate` Edge Function.
   - Edge Function `feynman-evaluate` using the described prompt style.
   - Card creation dialog from AI suggestions.

### Example 2 – Add New Pet Type

**User request:**  
“Add a frog pet type from LPC assets.”

**Agent approach:**

1. Check `docs/ASSETS.md` for animals section.
2. Find or add an LPC frog sprite from OpenGameArt LPC collections.[web:82][web:88]
3. Put the sprite in `assets/lpc/animals/frog/...`.
4. Update:
   - `ASSETS.md` – add frog sprite details.
   - `pets` logic and UI – allow selecting `pet_type = 'frog'` and linking to correct sprite.

## Notes

- If the user deviates from the spec (e.g., wants a new feature), you may adapt, but:
  - Keep consistency with the existing architecture when possible.
  - Update docs accordingly.
- If anything is unclear, prefer asking for clarification over guessing, especially around:
  - Licensing.
  - Schema changes.
  - AI behavior (to avoid drifting into cheating/hw‑solver territory).

This skill exists to keep Pixel Study OS coherent, legally safe, and true to its learning‑first vision while multiple AI agents and humans work on it together.