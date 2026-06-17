# Requirements Document

## Introduction

The University-Aware Onboarding & Personalization feature turns Nora from a subject-agnostic study app into an institution-aware academic study OS. During onboarding, a student declares their academic identity (university, faculty/school, department/major, year of study, current term). The system then gathers **real, official** academic data from that institution's own web domains and documents — academic calendar, semester/registration/add-drop/midterm/final/make-up dates, holidays, curriculum, course lists, course descriptions, and syllabi — and uses it to make the planner, dashboard, and RAG semester-aware.

This feature is built entirely on the existing stack: Next.js 16 server actions + Supabase (Postgres, pgvector, Storage, RLS) + Groq→OpenRouter LLM. It reuses the existing PDF→chunk→embed→`paper_chunks` ingestion pipeline, the `match_paper_chunks` RPC, the dual-mode `queryRag()` engine, and the `lib/ssrf.ts` guard. There is no OCR, no S3, no external worker cluster, and no message broker.

**Hard product rule:** the system uses only real, official data. It never invents dates. When an official date cannot be found, it is stored as NULL and surfaced as "Unreleased" rather than guessed.

## Glossary

- **Academic_Profile**: A user-owned record capturing the student's institution, faculty, program, year, term, locale, and onboarding status.
- **University_Registry**: Curated, admin-maintained reference tables (`universities`, `faculties`, `programs`) seeding launch institutions with verified official domains and known source URLs.
- **Discovery_Engine**: The logic that locates official source URLs for a profile — registry-first, with official-domain web search as fallback.
- **Scrape_Client**: The provider-agnostic client (e.g., Firecrawl/Tavily) that fetches page markdown and PDFs, always through the SSRF guard and a per-university domain allowlist.
- **Ingestion_Pipeline**: The existing parse → chunk → embed → store pipeline (`rag/parser.ts`, `rag/chunker.ts`, `rag/embedder.ts`, `paper_chunks`), reused for academic documents.
- **Academic_Event**: A structured academic date/period (e.g., semester_start, add_drop, final_period) with a confidence score and a status of Verified, Inferred, or Unreleased.
- **Curriculum_Course**: A structured course record (code, title, year level, term, description) extracted from a curriculum or catalog source.
- **Source_Ranker**: Pure logic that performs domain audit, assigns a source tier (1 registrar → 4 syllabus), computes confidence, maps confidence to status, and resolves conflicts.
- **Job_Queue**: The `ingestion_jobs` table holding durable, resumable background work units.
- **Job_Processor**: The `processNextJob()` server action that claims one pending job, performs a bounded unit of work, and enqueues follow-up jobs; driven by client polling and an optional `pg_cron`/`pg_net` sweeper.
- **Confidence_Status**: One of `verified` (≥0.95, Tier-1 official), `inferred` (0.60–0.95, secondary official), or `unreleased` (<0.60 or no official date found; date is NULL).

## Requirements

### Requirement 1: Academic Identity Onboarding

**User Story:** As a new student, I want to declare my university, faculty, department, year, and term during onboarding, so that the app can personalize itself to my real academic context.

#### Acceptance Criteria

1. WHEN a user without an Academic_Profile opens the protected app, THE Onboarding_Wizard SHALL route them to the onboarding flow before the dashboard.
2. THE Onboarding_Wizard SHALL collect, in order, university, faculty/school, department/major, year of study, and current term, with later selections constrained by earlier ones.
3. THE Onboarding_Wizard SHALL allow course codes and syllabus uploads as optional steps that can be skipped.
4. WHEN the user submits the identity steps, THE system SHALL persist an Academic_Profile owned by that user with `onboarding_status = 'discovering'`.
5. IF a required field (university, year, term) is missing or invalid, THEN THE system SHALL reject submission and return a field-level validation message.
6. THE Academic_Profile SHALL store both the matched registry identifiers (when available) and the raw free-text the user entered as a fallback.

### Requirement 2: University Registry and Autocomplete

**User Story:** As a student at a supported university, I want accurate autocomplete for my institution and department, so that the system reliably finds my official sources.

#### Acceptance Criteria

1. THE University_Registry SHALL provide `universities`, `faculties`, and `programs` reference tables readable by any authenticated user and writable only by an administrator.
2. THE University_Registry SHALL be seeded with at least one fully verified institution including its primary domain, registrar URL, and academic calendar URL (initial launch target: Orta Doğu Teknik Üniversitesi / METU, with the Electrical & Electronics Engineering program).
3. WHEN a user types an institution name, THE Onboarding_Wizard SHALL match against registry names and aliases case-insensitively and diacritic-insensitively (e.g., "Orta Doğu", "ODTÜ", "METU" all resolve to the same university).
4. WHEN a registry university is selected, THE Onboarding_Wizard SHALL present only that university's faculties and programs for subsequent selection.
5. IF the typed institution does not match any registry entry, THEN THE Onboarding_Wizard SHALL accept the free-text entry and flag the profile for automated discovery.

### Requirement 3: Non-Blocking Background Start

**User Story:** As a student, I want onboarding to feel fast and never make me wait for scraping, so that I can start using the app immediately.

#### Acceptance Criteria

1. WHEN the identity steps are submitted, THE system SHALL enqueue discovery/ingestion work to the Job_Queue and return control to the user without blocking on network fetches.
2. THE Onboarding_Wizard SHALL allow the user to enter the app while background data collection continues.
3. WHILE background collection is in progress, THE system SHALL expose progress via polling without requiring a persistent connection.
4. WHEN background collection completes, THE system SHALL set the Academic_Profile to `onboarding_status = 'review'`.

### Requirement 4: Official Source Discovery

**User Story:** As a student, I want the system to find my university's official calendar and curriculum pages automatically, so that I don't have to hunt for them.

#### Acceptance Criteria

1. WHEN discovery runs for a registry-matched profile, THE Discovery_Engine SHALL use the registry's known registrar, academic calendar, and curriculum URLs directly.
2. WHEN discovery runs for a non-registry profile, THE Discovery_Engine SHALL issue locale-aware web searches (e.g., Turkish "akademik takvim" and English "academic calendar") scoped to the institution's discovered official domain.
3. THE Discovery_Engine SHALL classify each candidate source by type (registrar_calendar, faculty_page, dept_curriculum, course_catalog, syllabus, announcement) and persist it as an `academic_sources` row.
4. IF no official source can be located for the academic calendar, THEN THE Discovery_Engine SHALL record the gap and trigger the manual-upload fallback (Requirement 18).
5. THE Discovery_Engine SHALL prefer current-academic-year sources and record the source's published year when detectable.

### Requirement 5: Safe Outbound Fetching

**User Story:** As the system owner, I want all outbound fetches to be safe and scoped, so that the scraping feature cannot be abused for SSRF or pull untrusted instructions into the app.

#### Acceptance Criteria

1. THE Scrape_Client SHALL route every outbound URL through `lib/ssrf.ts` and SHALL reject any URL resolving to a private, loopback, link-local, or metadata address.
2. THE Scrape_Client SHALL only treat a source as "official" when its host is on, or a subdomain of, the institution's registry/discovered primary domain.
3. WHEN content is fetched from any external source, THE system SHALL treat that content strictly as data and SHALL NOT execute or follow any instructions contained within it.
4. IF the Scrape_Client has no configured provider/API key, THEN THE system SHALL degrade to the manual-upload path rather than failing onboarding.
5. THE Scrape_Client SHALL apply per-request timeouts and SHALL never transmit user data or secrets to third parties beyond the search/scrape query itself.

### Requirement 6: Academic Document Ingestion

**User Story:** As a student, I want my university's PDFs and pages indexed, so that the app can answer questions grounded in them.

#### Acceptance Criteria

1. WHEN an official PDF is discovered or uploaded, THE system SHALL download it through the SSRF-guarded fetch and store it in the existing `papers` Storage bucket under a user-scoped path.
2. THE system SHALL process academic documents through the existing Ingestion_Pipeline (parse → chunk → embed → `paper_chunks`) without modifying that pipeline's core behavior.
3. THE system SHALL tag each ingested academic document with an `academic_kind` (academic_calendar, curriculum, course_catalog, syllabus, handbook, announcement) and the owning `academic_profile_id`.
4. WHEN a fetched page is HTML rather than PDF, THE system SHALL ingest its cleaned markdown through the same chunker.
5. IF a PDF yields fewer than 20 non-whitespace characters (image-only/scanned), THEN THE system SHALL mark it as requiring manual handling and SHALL NOT attempt OCR.

### Requirement 7: Grounded Academic Date Extraction

**User Story:** As a student, I want extracted dates to be real and traceable, so that I can trust the planner and never act on invented dates.

#### Acceptance Criteria

1. WHEN the Date_Extractor processes a calendar source, THE system SHALL extract only dates explicitly present in the source text and SHALL capture the verbatim source line for each.
2. THE Date_Extractor SHALL normalize Turkish and English month names and term vocabulary (e.g., Güz/Fall, Bahar/Spring, Vize/midterm, Final, Bütünleme/make-up) to canonical event types.
3. IF an extracted date string does not actually appear in the source text or cannot be parsed into a valid calendar date, THEN THE system SHALL discard it rather than store it.
4. THE Date_Extractor SHALL write each surviving date as an Academic_Event with its event type, start/end dates, source reference, and source excerpt.
5. IF no official date is found for an expected event type (e.g., final exam dates), THEN THE system SHALL store the event with NULL dates and `status = 'unreleased'` and SHALL NOT fabricate a date.
6. THE system SHALL reject any extracted date that falls outside the declared term's plausible window unless corroborated by a Tier-1 source.

### Requirement 8: Curriculum and Course Extraction

**User Story:** As a student, I want my department's curriculum and courses captured, so that the app understands what I study each year.

#### Acceptance Criteria

1. WHEN the Curriculum_Extractor processes a curriculum or catalog source, THE system SHALL extract courses with code, title, year level, and term when present.
2. THE system SHALL persist each course as a Curriculum_Course associated with the Academic_Profile, retaining its source reference and confidence.
3. WHEN a course description or syllabus text is available, THE system SHALL index it via the Ingestion_Pipeline so it is retrievable by Academic_RAG.
4. WHEN the user provides explicit course codes during onboarding, THE system SHALL match them against extracted courses and mark matches as enrolled.
5. IF curriculum structure is only partially detectable, THEN THE system SHALL store what is found and mark unverified entries with `status = 'inferred'`.

### Requirement 9: Source Ranking and Confidence States

**User Story:** As a student, I want every academic fact clearly labelled by how trustworthy it is, so that I know what is confirmed versus assumed versus missing.

#### Acceptance Criteria

1. THE Source_Ranker SHALL assign each source a tier: Tier 1 central registrar, Tier 2 faculty, Tier 3 department, Tier 4 syllabus/upload.
2. THE Source_Ranker SHALL compute a confidence score in the range 0.0–1.0 derived from the source tier, optionally boosted when independent official sources agree.
3. THE Source_Ranker SHALL map confidence to Confidence_Status: `verified` when ≥0.95, `inferred` when ≥0.60 and <0.95, and `unreleased`/missing when <0.60 or no official date exists.
4. THE system SHALL display each Academic_Event with its status label and originating source (e.g., "Verified — registrar domain", "Inferred — syllabus upload", "Unreleased").
5. THE Source_Ranker SHALL be implemented as pure functions covered by property-based tests.

### Requirement 10: Conflict Resolution

**User Story:** As a student, I want disagreements between sources resolved sensibly, so that I see the most authoritative date.

#### Acceptance Criteria

1. WHEN multiple sources report different values for the same institution-wide event, THE Source_Ranker SHALL select the value from the highest-tier source.
2. WHEN a course-specific date from a syllabus (Tier 4) conflicts with a general department source, THE system SHALL prefer the syllabus value for that specific course only.
3. IF two sources of equal tier conflict, THEN THE system SHALL prefer the more recent / more central source and retain the alternative for display.
4. THE Review_Screen SHALL surface conflicting alternatives alongside the chosen value.

### Requirement 11: Review and Confirmation

**User Story:** As a student, I want to review and confirm what the system found, so that I stay in control of my academic data.

#### Acceptance Criteria

1. WHEN background collection reaches the review stage, THE Review_Screen SHALL present extracted events and courses grouped by Confidence_Status.
2. THE Review_Screen SHALL allow the user to edit, accept, or remove individual events and courses.
3. WHEN the user confirms, THE system SHALL set the Academic_Profile to `onboarding_status = 'complete'`.
4. THE Review_Screen SHALL clearly distinguish confirmed official data, inferred structure, and missing/unreleased data.

### Requirement 12: Background Job Processing

**User Story:** As a student, I want data collection to run reliably in the background and resume if interrupted, so that closing a tab doesn't lose progress.

#### Acceptance Criteria

1. THE Job_Queue SHALL persist each work unit (discover_sources, fetch_source, parse_document, extract_events, extract_curriculum, embed_chunks) as a user-owned `ingestion_jobs` row with a status of pending, running, succeeded, failed, or skipped.
2. WHEN the Job_Processor runs, THE system SHALL claim a single pending job, perform one bounded unit of work, update its status, and enqueue any follow-up jobs.
3. WHILE the onboarding/review UI is open, THE client SHALL poll the Job_Processor to advance pending jobs.
4. IF a job fails, THEN THE system SHALL record the error and retry up to a maximum attempt count before marking it failed.
5. IF a job is interrupted (e.g., tab closed), THEN the system SHALL resume it on the user's next session and MAY advance it via an optional `pg_cron`/`pg_net` sweeper.
6. THE system SHALL ensure every enqueued job eventually reaches a terminal status (succeeded, skipped, or failed).

### Requirement 13: Semester-Aware Planner Integration

**User Story:** As a student, I want my planner to know my real semester, so that it warns me about institutional deadlines.

#### Acceptance Criteria

1. WHEN building the weekly plan, THE Academic_Planner SHALL merge confirmed Academic_Events (registration, add/drop, midterm, final, make-up, holidays) into the plan view.
2. THE Academic_Planner SHALL display each surfaced academic date with its Confidence_Status badge.
3. WHEN a final exam period is confirmed, THE system SHALL create or update a corresponding subject/topic with an `exam_date` using the existing subjects/topics mechanism.
4. THE Academic_Planner SHALL never surface an `unreleased` event as a concrete date.

### Requirement 14: Cognitive-Load-Aware Scheduling

**User Story:** As a student, I want study intensity to adapt around exams, so that I prepare more as deadlines approach.

#### Acceptance Criteria

1. THE Load_Model SHALL compute a cognitive-load value from active academic events weighted by event type (e.g., final > midterm > homework) and proximity in time.
2. WHEN the computed load is low, THE Academic_Planner SHALL balance study suggestions using standard spacing.
3. WHEN the computed load is elevated, THE Academic_Planner SHALL escalate focus on the imminent assessment and de-prioritize unrelated low-priority tasks.
4. WHEN the computed load is high, THE Academic_Planner SHALL emphasize active test-prep and surface a warning about the upcoming assessment.
5. THE Load_Model SHALL be a pure function covered by property-based tests.

### Requirement 15: Dashboard Academic Timeline

**User Story:** As a student, I want upcoming academic events on my dashboard, so that I see what matters this week at a glance.

#### Acceptance Criteria

1. THE Dashboard_Timeline SHALL display the next confirmed academic events in chronological order with status badges.
2. THE Dashboard_Timeline SHALL show an explicit empty/"Unreleased" state when no confirmed dates exist for an expected category.
3. THE Dashboard_Timeline SHALL read only the current user's confirmed Academic_Events.

### Requirement 16: Academic RAG Querying

**User Story:** As a student, I want to ask questions about my semester and curriculum, so that I get grounded, cited answers.

#### Acceptance Criteria

1. THE Academic_RAG SHALL add an "academic" scope to `queryRag()` that filters `paper_chunks` to the user's academic documents.
2. WHEN the user asks a date question (e.g., "When do finals start?"), THE system SHALL answer from the structured Academic_Events (with status and source) in preference to free-text chunks.
3. WHEN the user asks a curriculum question (e.g., "What's in my first-year curriculum?"), THE system SHALL answer from indexed curriculum chunks with citations.
4. IF the requested information is unreleased or not found, THEN THE system SHALL say so explicitly rather than inventing an answer.

### Requirement 17: Data Isolation and Security

**User Story:** As a user, I want my academic data private to me, so that no other user can read or alter it.

#### Acceptance Criteria

1. THE system SHALL enable row-level security on every new user-owned table (`academic_profiles`, `academic_sources`, `academic_events`, `curriculum_courses`, `ingestion_jobs`) with policies restricting access to `user_id = auth.uid()`.
2. THE system SHALL store ingested academic PDFs only under the authenticated user's storage prefix, consistent with the existing `papers` bucket policy.
3. THE registry reference tables SHALL be world-readable to authenticated users but never user-writable.
4. WHEN any server action runs, THE system SHALL verify an authenticated user before reading or writing academic data.

### Requirement 18: Edge Cases and Graceful Fallbacks

**User Story:** As a student, I want the system to degrade gracefully when official data is protected, scanned, missing, or stale, so that onboarding always completes.

#### Acceptance Criteria

1. IF a source returns 401/403 or presents a login/CAPTCHA wall, THEN THE system SHALL prompt the user to upload the relevant PDF instead.
2. IF a document is scanned/image-only, THEN THE system SHALL inform the user and request a text-based PDF or pasted text (no OCR).
3. IF the scrape/search provider quota is exhausted, THEN THE system SHALL surface a friendly message and fall back to manual upload.
4. IF only a previous academic year's calendar is found, THEN THE system SHALL mark it stale, prefer current-year data, and re-attempt discovery at term boundaries.
5. WHEN the institution uses a non-standard term structure (quarters/blocks), THE system SHALL record the term kind and adapt the planner accordingly.
