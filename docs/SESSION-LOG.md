# Session Log — June 21, 2026

## Summary

Deep codebase audit → bug fixes → Research Desk rebuild → AI voice implementation.

---

## 1. Codebase Audit

Analyzed all 20+ server actions, 16 migrations, UI components, and library modules.

**Findings:**
- 2 critical race conditions (gamification XP + party quest progress)
- 1 streak UX issue (resets mid-day)
- 1 fragile timezone math function
- 2 missing auth checks (deleteSubject/deleteTopic — RLS protected but inconsistent with pattern)
- 1 dead code function
- All major features (university onboarding, FSRS, planner, research, parties, study room) confirmed functionally complete

---

## 2. Bug Fixes Applied

| Fix | File(s) | Severity |
|-----|---------|----------|
| Atomic XP/coins increment (eliminates read-modify-write race) | `gamification.ts`, `017_atomic_reward_rpc.sql` | Critical |
| Atomic quest progress increment (FOR UPDATE locking) | `party-quests.ts` | Critical |
| Streak doesn't break mid-day (counts from yesterday backward) | `analytics.ts` | Moderate |
| Timezone math uses `formatToParts` (not fragile locale parsing) | `party-quests.ts` | Moderate |
| Auth check + user_id filter on delete actions | `subjects.ts` | Low (RLS already covered) |
| Removed dead `extractSearchKeywords` function | `research.ts` | Cleanup |

**New migration:** `supabase/migrations/017_atomic_reward_rpc.sql` — adds `increment_profile_rewards()`, `increment_pet_affinity()`, `increment_quest_progress()` RPCs. Apply to Supabase before deploying.

---

## 3. Research Desk Rebuild

Replaced the old pipeline (OpenAlex + Crossref → single LLM pass, ~3s) with a hybrid academic + web search pipeline:

**New architecture:**
1. Query classification (academic / general / both) — Groq, ~1s
2. Parallel search:
   - Academic: OpenAlex + Crossref + Semantic Scholar (new, with TLDRs)
   - Web: Tavily (new, free 1K queries/month, needs `TAVILY_API_KEY`)
3. Source assembly — deduplicate, cap at 12
4. Synthesis with distinct academic/web citations — Groq/OpenRouter, ~5-15s

**New files:**
- `src/lib/academic-search/semantic-scholar.ts`
- `src/lib/web-search/tavily.ts`

**UI changes:**
- Real progress stages (classifying → searching academic → searching web → reading → synthesizing)
- Cancel button for the 10-25s operation
- Source badges distinguish "Academic" vs web domain
- Pipeline metadata badge (source counts, intent)
- Fixed disclaimer copy (no longer claims "books and Wikipedia")

**New env vars needed:**
- `TAVILY_API_KEY` — get free at https://app.tavily.com (1K/month)
- `SEMANTIC_SCHOLAR_API_KEY` — optional, works without key at 100 req/5min

---

## 4. Study Room Timestamp Validation

Added `validateNoteOffsets()` to `transcript-utils.ts`:
- Clamps LLM-generated offsets to `[startSeconds, endSeconds]` bounds
- Cross-checks citation string ("MM:SS") against numeric offset (10s tolerance)
- Explicit `Number.isFinite()` guard for NaN/garbage values → defaults to segment start
- Prevents hallucinated timestamps from sending students to wrong video positions

---

## 5. Nora Voice Implementation

Created `src/lib/nora-voice.ts` — single shared voice definition for all AI output:

| Fragment | Used By | Style |
|----------|---------|-------|
| `NORA_VOICE_EVALUATOR` | Feynman (grounded + ungrounded), Video Feynman | Direct, specific, reasons with student |
| `NORA_VOICE_RESEARCH` | Research Desk synthesis, RAG paper answers | Clear academic prose, cites everything |
| `NORA_VOICE_NOTES` | Video note generation | Factual density, no filler |
| `NORA_VOICE_UTILITY` | Autocomplete scaffolds, note completion | Minimal — clean and direct |

**Key rule:** "Honest about the CONTENT being wrong, never about the STUDENT."

All 9 LLM features now use the shared voice. Structural rules (JSON format, citation validation, grounding constraints) remain unchanged below a `---` separator in each prompt.

---

## 6. Env Configuration

Full working setup now requires:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
TAVILY_API_KEY=...
YOUTUBE_API_KEY=...
ACADEMIC_API_MAILTO=your@email.com
ACADEMIC_API_EMAIL=your@email.com
FIRECRAWL_API_KEY=... (optional, for university auto-discovery)
```

---

## 7. Verification

- Build: passes (TypeScript + all 23 pages)
- Tests: 332 tests across 22 files, all pass
- No regressions

## Pending Manual Verification

- [ ] Run a grounded Feynman evaluation — confirm "explain why" stays within passage content
- [ ] Run a Research Desk query — confirm `[N]` citation markers parse cleanly with new voice
- [ ] Apply migration 017 to Supabase instance
