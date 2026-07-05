# Design Document: University-Aware Onboarding & Personalization

## Overview

This feature adds an academic-identity onboarding flow and a personalization layer that collects **real, official** university data (academic calendar, registration/add-drop/midterm/final/make-up dates, holidays, curriculum, courses, syllabi) and uses it to make the planner, dashboard, and RAG semester-aware.

It is implemented entirely on the existing stack — Next.js 16 server actions + Supabase (Postgres, pgvector, Storage, RLS) + Groq→OpenRouter — and **reuses** the existing ingestion pipeline (`rag/parser.ts`, `rag/chunker.ts`, `rag/embedder.ts`, `paper_chunks`), the `match_paper_chunks` RPC, the dual-mode `queryRag()` engine, and the `lib/ssrf.ts` guard. The original research brief specified a much heavier architecture (Docling OCR workers, Crawl4AI clusters, AWS S3, an API gateway, message queues, a Bayesian consensus engine); this design deliberately replaces those with in-stack equivalents appropriate to a small (2–3 user) deployment.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Server actions for all backend logic (no Edge Functions, no microservices) | Matches the existing app and the full-rag-research design; pdf-parse and fetch run in the Node runtime |
| Reuse the existing PDF→chunk→embed→`paper_chunks` pipeline for academic docs | Avoids duplicate ingestion code; academic docs are just tagged `papers` rows |
| Durable `ingestion_jobs` table + client-poll-driven `processNextJob()` | "Free 1b" background processing without an always-on worker; reuses the existing parse-status polling pattern; optional `pg_cron`/`pg_net` sweeper for resumption |
| One hosted search/scrape API (Firecrawl/Tavily) behind a provider-agnostic client | Reliable discovery without standing up Crawl4AI/Python; degrades to manual upload when no key/quota |
| Lightweight tiered source ranking instead of Bayesian consensus | Same three states + resolution rules as the spec, but transparent, testable pure functions; Bayesian fusion noted as future work |
| No OCR | Stack has none (no Docling); scanned/image-only PDFs (<20 extracted chars) route to manual fallback |
| Structured `academic_events` table is the source of truth for dates; RAG chunks are backup | Exact, confidence-labelled dates beat free-text retrieval for "when do finals start?" |
| Per-user scoping of discovered academic data | At 2–3 users, cross-user dedup/trust isn't worth the RLS complexity |
| Never invent dates | Missing official dates stored as NULL with `status='unreleased'` |

## Architecture

```mermaid
graph TB
  subgraph Client["Onboarding & App UI (Client Components)"]
    OB[Onboarding Wizard - 5 steps]
    Poll[Progress poller]
    Review[Review & Confirm screen]
    Dash[Dashboard academic timeline]
    Plan[Semester-aware Planner]
  end

  subgraph SA["Server Actions (_actions/academic/*)"]
    Identity[saveAcademicIdentity]
    Enqueue[startAcademicDiscovery]
    ProcJob[processNextJob]
    Extract[extractAcademicEvents / extractCurriculum]
    Confirm[confirmAcademicData]
    AskRag[queryRag - academic scope]
  end

  subgraph Pure["Pure libs (unit + PBT)"]
    Reg[university-registry.ts]
    Norm[academic-extract.ts]
    Rank[source-ranking.ts]
    JobsM[job-state.ts]
    Load[academic-load.ts]
  end

  subgraph Ext["External (SSRF-guarded fetch)"]
    Scrape[Search/Scrape API: Firecrawl/Tavily]
    Site[University official domains + PDFs]
    LLM[Groq -> OpenRouter]
    OAI[OpenAI embeddings - optional]
  end

  subgraph DB["Supabase (Postgres + Storage, RLS user-owned)"]
    RegT[(universities / faculties / programs)]
    Prof[(academic_profiles)]
    Jobs[(ingestion_jobs)]
    Src[(academic_sources)]
    Ev[(academic_events)]
    Cur[(curriculum_courses)]
    Papers[(papers + paper_chunks - reused)]
    Store[(Storage: papers bucket - reused)]
  end

  OB --> Identity --> Prof
  OB -. autocomplete .-> Reg --> RegT
  Identity --> Enqueue --> Jobs
  Poll --> ProcJob --> Jobs
  ProcJob --> JobsM
  ProcJob --> Scrape --> Site
  ProcJob --> Store
  ProcJob -->|reuse parser+chunker+embedder| Papers
  ProcJob --> Extract --> LLM
  Extract --> Norm --> Ev
  Extract --> Cur
  ProcJob --> Rank --> Src
  Review --> Confirm --> Ev
  Plan --> Ev
  Plan --> Load
  Dash --> Ev
  AskRag --> Papers
  AskRag --> Ev
  Papers --> OAI