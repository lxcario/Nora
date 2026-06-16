# Implementation Plan: Full RAG Research

## Overview

This plan implements a complete Retrieval-Augmented Generation (RAG) pipeline for the Research Desk. The existing web research mode remains untouched. New infrastructure (database migration, storage bucket, npm dependency) is set up first, followed by the ingestion pipeline internals, server actions, and finally the UI layer with mode toggle, paper management, and RAG query display.

## Tasks

- [x] 1. Install dependencies and environment setup
  - [x] 1.1 Install pdf-parse and set up Vitest + fast-check
    - Run `npm install pdf-parse` and `npm install -D vitest fast-check @types/pdf-parse`
    - Add `"test": "vitest --run"` script to package.json
    - Add `OPENAI_API_KEY` to `.env.local` (empty placeholder) and document it in README or `.env.example`
    - _Requirements: 5.1_

- [x] 2. Database migration and storage setup
  - [x] 2.1 Create migration file `003_rag_extensions.sql`
    - Add `parse_status`, `parse_error`, `chunk_count`, `storage_path` columns to `papers` table
    - Add CHECK constraints for `parse_status` enum, `parse_error` consistency, `chunk_count >= 0`, and `parse_error` max length
    - Add `section_heading` column to `paper_chunks` with 500-char length constraint
    - Create `match_paper_chunks` RPC function for pgvector cosine similarity search
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 2.2 Create Supabase Storage bucket configuration
    - Create SQL or seed script to set up `papers` storage bucket
    - Configure RLS policy so users can only access files under their own `{user_id}/` prefix
    - _Requirements: 1.3, 10.6_

- [x] 3. Checkpoint - Verify migration and storage
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement internal pipeline modules
  - [x] 4.1 Implement PDF parser module
    - Create `src/app/(protected)/app/_actions/rag/parser.ts`
    - Implement `parsePdf(buffer: Buffer)` using pdf-parse to extract text
    - Detect section headings via font-size differentiation or bookmark metadata
    - Return structured `Section[]` array with heading + paragraphs
    - Enforce 60-second timeout with AbortController
    - Return failure if extracted non-whitespace characters < 20
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Implement text chunker module
    - Create `src/app/(protected)/app/_actions/rag/chunker.ts`
    - Implement `chunkText(sections: Section[])` that produces 256-512 token chunks
    - Apply 10-15% overlap between consecutive chunks
    - Split at heading boundaries when within token bounds
    - Split long paragraphs at sentence boundaries; split long sentences at word boundaries
    - Merge final undersized segment with preceding chunk
    - Store zero-based `chunk_index`, `section_heading` (empty string if none)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.3 Write property tests for chunker (Properties 5, 6, 7)
    - **Property 5: Chunk token bounds invariant** — every chunk has 256-512 tokens
    - **Property 6: Consecutive chunk overlap** — overlap between pairs is 10-15% of preceding chunk
    - **Property 7: Chunk schema completeness** — every chunk has chunk_index, content, paper_id, section_heading
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [x] 4.4 Implement embedding service module
    - Create `src/app/(protected)/app/_actions/rag/embedder.ts`
    - Implement `generateEmbeddings(texts: string[])` calling OpenAI text-embedding-ada-002
    - Batch chunks into groups of 20 per API call
    - Implement retry logic: 3 retries with exponential backoff (1s, 2s, 4s)
    - Handle rate limits (HTTP 429) — respect `Retry-After` header or default 60s wait
    - Skip empty/whitespace-only chunks (store null embedding)
    - Enforce 30-second timeout per API call
    - Limit to 2 concurrent embedding requests per user
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 12.1, 12.4_

  - [ ]* 4.5 Write property tests for embedding helpers (Properties 8, 9, 16, 17)
    - **Property 8: Embedding batch sizing** — N chunks produce ceil(N/20) batches, each ≤ 20
    - **Property 9: Empty chunk embedding skip** — empty/whitespace content → null embedding
    - **Property 16: Rate limit wait time calculation** — Retry-After parsed correctly or defaults to 60s
    - **Property 17: Embedding concurrency limit** — never more than 2 concurrent calls per user
    - **Validates: Requirements 5.5, 5.7, 12.1, 12.4**

  - [x] 4.6 Implement validation helpers
    - Create `src/app/(protected)/app/_actions/rag/validation.ts`
    - Implement `validateUploadInput(file)` — checks extension, MIME type, size ≤ 20 MB
    - Implement `validateUrl(url)` — checks http/https scheme, length ≤ 2048
    - Implement `validateQuestion(text)` — checks 3-500 characters
    - Implement `validateCardFields(front, back)` — front 1-200 chars, back 1-1000 chars
    - Implement `validateFeynmanSelection(text)` — checks 10-500 characters
    - Implement `validatePaperState(status, error)` — parse_status/parse_error consistency
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.7, 6.1, 6.9, 8.3, 9.1, 9.2, 13.6, 14.2_

  - [ ]* 4.7 Write property tests for validation helpers (Properties 1, 3, 4, 10, 13, 15, 18)
    - **Property 1: Upload input validation** — accept iff .pdf + application/pdf + ≤ 20 MB
    - **Property 3: URL input validation** — accept iff http/https + ≤ 2048 chars
    - **Property 4: Minimum text extraction threshold** — < 20 non-whitespace → failed
    - **Property 10: Question length validation** — accept iff 3-500 characters
    - **Property 13: Card field length validation** — front 1-200, back 1-1000
    - **Property 15: Feynman selection length validation** — enabled iff 10-500 chars
    - **Property 18: Parse status and error consistency** — error null when status is pending/processing/ready
    - **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.7, 3.4, 6.1, 6.9, 8.3, 9.1, 9.2, 13.6, 14.2, 14.6**

- [x] 5. Checkpoint - Verify pipeline modules and property tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement server actions
  - [x] 6.1 Implement `ingestPdf` server action
    - Create `src/app/(protected)/app/_actions/rag.ts` with `"use server"` directive
    - Implement `ingestPdf(formData: FormData)` — validate file, upload to Supabase Storage, create paper record, run parse → chunk → embed pipeline
    - Set `parse_status` to "processing" during pipeline, "ready" on success, "failed"/"partial" on error
    - Extract title from PDF metadata or filename (sans .pdf extension)
    - Update `chunk_count` on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.3, 5.4_

  - [x] 6.2 Implement `ingestFromUrl` server action
    - Implement `ingestFromUrl(url: string, paperId?: string)` — validate URL, download with 30s timeout, verify PDF header, size ≤ 50 MB
    - Store downloaded PDF in Supabase Storage, then run same ingestion pipeline
    - Handle unreachable URLs, non-2xx responses, non-PDF content, download timeouts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 6.3 Implement `queryRag` server action
    - Implement `queryRag(question: string, scope: RagScope)` — validate question, embed query, call `match_paper_chunks` RPC, synthesize with LLM
    - Support scope: "all", specific paper, or topic filtering
    - Construct LLM prompt with retrieved chunks + citation format instructions
    - Include 1-5 suggested flashcard pairs in response
    - Handle no-results (all similarity < 0.3), LLM fallback (Groq → OpenRouter), timeouts
    - Return structured `RagAnswer` with citations (paperId, chunkIndex, sectionHeading, snippet ≤ 300 chars)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 8.5, 12.2, 12.3, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 6.4 Write property tests for RAG prompt construction and response parsing (Properties 11, 12, 14)
    - **Property 11: RAG prompt includes all retrieved chunks** — prompt contains every chunk's content + citation instructions
    - **Property 12: Answer and citation response structure** — answer ≤ 3000 chars, citation fields valid
    - **Property 14: Suggested cards count bound** — between 1 and 5 inclusive
    - **Validates: Requirements 6.5, 6.6, 8.5**

  - [x] 6.5 Implement `getIngestionStatus`, `retryIngestion`, `deleteFullPaper` server actions
    - `getIngestionStatus(paperId)` — return current parse_status, parse_error, chunk_count, stage info
    - `retryIngestion(paperId)` — set parse_status to "pending", clear parse_error, re-run pipeline
    - `deleteFullPaper(paperId)` — delete PDF from storage, all chunks from paper_chunks, then paper record; handle partial failures gracefully
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.4, 14.6_

  - [ ]* 6.6 Write property test for title extraction (Property 2)
    - **Property 2: Title extraction from metadata or filename** — title = PDF metadata title if present, else filename without .pdf
    - **Validates: Requirements 1.6, 1.7**

- [x] 7. Checkpoint - Verify server actions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI: Mode toggle and paper library
  - [x] 8.1 Create `research-mode-toggle.tsx` component
    - Create `src/app/(protected)/app/research/_components/research-mode-toggle.tsx`
    - Implement tabbed toggle: "From web sources" / "From your papers"
    - Maintain active mode state, pass to parent
    - Style with Tailwind + Lucide icons, matching existing research desk theme
    - _Requirements: 7.4_

  - [x] 8.2 Create `paper-library.tsx` component
    - Create `src/app/(protected)/app/research/_components/paper-library.tsx`
    - Display list of user's papers with status badges (pending, processing, ready, partial, failed)
    - Show chunk count for "ready" papers
    - Show truncated error message (200 chars) for failed/partial with Retry button
    - Show "Parse & Index" button for papers with URL but no indexed chunks
    - Include delete with confirmation prompt
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 2.5_

  - [x] 8.3 Create `paper-upload.tsx` component
    - Create `src/app/(protected)/app/research/_components/paper-upload.tsx`
    - PDF upload form (drag & drop or file picker) with 20 MB size validation on client side
    - URL input form for URL-based ingestion
    - Display inline errors for invalid files/URLs
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.7_

  - [x] 8.4 Create `ingestion-progress.tsx` component
    - Create `src/app/(protected)/app/research/_components/ingestion-progress.tsx`
    - Implement polling for paper status via `getIngestionStatus` (every 3-5 seconds while processing)
    - Display current stage (downloading, parsing, chunking, embedding)
    - Show chunks processed / total during embedding stage
    - Show completion notification when done
    - Update status even after navigation and return
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 9. Implement UI: RAG query and answer display
  - [x] 9.1 Create `rag-query-panel.tsx` component
    - Create `src/app/(protected)/app/research/_components/rag-query-panel.tsx`
    - Query input with 3-500 character validation
    - Paper scope selector: "All papers" (default), specific paper, or specific topic
    - Disable submission when selected scope has no indexed chunks
    - _Requirements: 6.1, 6.9, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 9.2 Create `rag-answer-display.tsx` component
    - Create `src/app/(protected)/app/research/_components/rag-answer-display.tsx`
    - Render answer text with inline citation superscripts (numbered, styled with distinct background)
    - Expand inline citation panel on click showing snippet (max 500 chars, "show more" if longer)
    - Display citations panel below answer (max 20 entries: paper title, section heading, 300-char truncated content)
    - Show "From your papers" label with distinct border styling
    - Handle error states (timeout, service unavailable)
    - Handle zero-citation answers with notice
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 10. Implement UI: Card creation and Feynman integration
  - [x] 10.1 Create `card-from-rag.tsx` component
    - Create `src/app/(protected)/app/research/_components/card-from-rag.tsx`
    - Implement text selection detection on RAG answer content
    - Show "Create Card" action on selection (min 1 non-whitespace char)
    - Pre-populate card form: selected text → back, LLM-generated question → front
    - Allow editing (front max 200 chars, back max 1000 chars, min 1 non-whitespace each)
    - Truncate back to 1000 chars if selection exceeds limit
    - Save card with `source_type: "research"`, associate with current topic
    - Display suggested cards from RAG response with one-click save
    - Handle save failures gracefully (preserve form data)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 10.2 Implement Feynman integration
    - Add "Send to Feynman" action visible when text selection is 10-500 characters
    - Disable action with message when selection is outside valid range
    - Navigate to Feynman mode with selected text as explanation topic
    - Pass source title and original research question as context
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 11. Integrate with existing Research Desk page
  - [x] 11.1 Update `research-desk.tsx` and page layout
    - Modify `research-desk.tsx` to wrap existing content in "From web sources" tab
    - Import and render `research-mode-toggle.tsx` at top
    - Conditionally render existing web research UI or new RAG UI based on active mode
    - Import `paper-library.tsx`, `paper-upload.tsx`, `rag-query-panel.tsx`, `rag-answer-display.tsx`, `card-from-rag.tsx`, `ingestion-progress.tsx`
    - Wire all components together with shared state (selected topic, active mode)
    - Ensure existing web research functionality is completely unchanged
    - _Requirements: 7.4, 13.1_

- [x] 12. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Final property tests
  - [ ]* 13.1 Write remaining integration-level property tests
    - Verify end-to-end data flow: upload validation → paper record → chunks stored
    - Verify scope filtering: paper-scoped vs topic-scoped vs all-papers queries
    - Verify deletion cascade: paper + chunks + storage removed atomically
    - _Requirements: 10.6, 13.2, 13.3, 13.4_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `research.ts` server action and web research UI are NOT modified
- Pipeline modules are split into separate files under `_actions/rag/` for testability
- The main `rag.ts` server action file re-exports and orchestrates the pipeline modules
- Polling-based progress (not WebSocket) matches the server action architecture

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.6"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.7"] },
    { "id": 4, "tasks": ["4.5", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.5", "6.6"] },
    { "id": 6, "tasks": ["6.3"] },
    { "id": 7, "tasks": ["6.4"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 9, "tasks": ["9.1", "9.2"] },
    { "id": 10, "tasks": ["10.1", "10.2"] },
    { "id": 11, "tasks": ["11.1"] },
    { "id": 12, "tasks": ["13.1"] }
  ]
}
```
