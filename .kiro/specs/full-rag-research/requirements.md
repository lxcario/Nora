# Requirements Document

## Introduction

The Full RAG Research Desk upgrades Pixel Study OS's existing AI Research Desk (Phase 8) with retrieval-augmented generation capabilities. Users can upload or download academic PDFs, which are parsed into sectioned text, chunked, and embedded into the existing `paper_chunks` table with pgvector. A RAG question-answering pipeline then searches these embeddings to produce cited, verifiable answers grounded in the actual paper content. Users can convert any part of a RAG answer into flashcards or Feynman prompts, maintaining the app's pedagogical philosophy that AI teaches research rather than replacing it.

**Scope boundary:** The existing Phase 8 general research mode (Wikipedia + Open Library + AI synthesis) remains unchanged and operates as a separate "web sources" mode on the same `/app/research` page. RAG mode queries only the user's indexed PDFs stored in `paper_chunks`. The two modes coexist with distinct UI labels ("From your papers" vs "From web sources") and do not share query pipelines.

## Glossary

- **Ingestion_Pipeline**: The server action responsible for downloading or receiving a PDF, parsing it into text, chunking it, generating embeddings, and storing results in the database.
- **RAG_Engine**: The server action that accepts a user question, generates a query embedding, performs vector similarity search on `paper_chunks`, and synthesizes a cited answer via LLM.
- **Chunk**: A segment of parsed PDF text between 256 and 512 tokens with configurable overlap, stored with its vector embedding in `paper_chunks`.
- **Embedding_Service**: The component responsible for generating vector embeddings (1536 dimensions) from text chunks using an external API (OpenAI or compatible).
- **PDF_Parser**: The component that extracts structured text from a PDF file, preserving section headings and paragraph boundaries.
- **Citation**: A reference in a RAG answer that links back to a specific chunk, including the paper title, section heading, and chunk index.
- **Snippet**: A highlighted passage from a source chunk that directly supports a claim in the RAG answer.
- **Research_Desk_UI**: The `/app/research` page and its client components that display search results, RAG answers, and paper management controls.
- **Paper**: A record in the `papers` table representing an academic source with metadata (title, authors, year, URL, abstract).
- **Topic**: A user-defined study topic that papers and cards can be associated with.

## Requirements

### Requirement 1: PDF Upload Ingestion

**User Story:** As a student, I want to upload a PDF from my computer so that the system can parse and index it for question-answering.

#### Acceptance Criteria

1. WHEN a user uploads a PDF file via the Research_Desk_UI, THE Ingestion_Pipeline SHALL accept files up to 20 MB in size.
2. WHEN a user uploads a PDF file, THE Ingestion_Pipeline SHALL validate that the file has a `.pdf` extension and a MIME type of `application/pdf` before processing.
3. WHEN a valid PDF is uploaded, THE Ingestion_Pipeline SHALL store the file in Supabase Storage under a user-scoped path.
4. IF a PDF file exceeds 20 MB in size, THEN THE Ingestion_Pipeline SHALL reject the upload and return an error message indicating the maximum allowed size of 20 MB.
5. IF a PDF file is corrupted or unreadable, THEN THE Ingestion_Pipeline SHALL return an error message indicating that the file could not be parsed and SHALL NOT create a Paper record.
6. WHEN a PDF is successfully uploaded, THE Ingestion_Pipeline SHALL create a corresponding Paper record in the `papers` table with at minimum a `title` field populated either from extracted PDF metadata or from the original filename (excluding the `.pdf` extension), along with the uploading user's `user_id`.
7. IF the Ingestion_Pipeline cannot extract any metadata fields (authors, year, abstract) from the PDF, THEN THE Ingestion_Pipeline SHALL still create the Paper record with the `title` field populated and leave unextracted optional fields as null.

### Requirement 2: URL-Based PDF Download

**User Story:** As a student, I want to ingest a paper by providing its URL (e.g., from Semantic Scholar open access) so that I don't have to manually download and re-upload it.

#### Acceptance Criteria

1. WHEN a user provides a valid HTTP or HTTPS URL of at most 2048 characters pointing to a PDF, THE Ingestion_Pipeline SHALL download the file from that URL.
2. WHEN the URL download completes successfully and the downloaded file size is at most 50 MB, THE Ingestion_Pipeline SHALL verify the file begins with a valid PDF header and process it through the same parsing pipeline as uploaded files.
3. IF the URL is unreachable, returns a non-2xx HTTP status, or the response content does not begin with a valid PDF header, THEN THE Ingestion_Pipeline SHALL return an error message indicating the download failure reason.
4. IF the URL download exceeds 30 seconds, THEN THE Ingestion_Pipeline SHALL abort the download and return a timeout error.
5. WHEN a Paper record already has a `url` field from Semantic Scholar, THE Research_Desk_UI SHALL display a one-click "Parse & Index" button to trigger URL-based ingestion for that paper.
6. IF the downloaded file exceeds 50 MB, THEN THE Ingestion_Pipeline SHALL abort the download and return an error message indicating the file exceeds the maximum allowed size.
7. IF a user provides a URL with a scheme other than HTTP or HTTPS, or a URL exceeding 2048 characters, THEN THE Ingestion_Pipeline SHALL reject the request and return an error message indicating the URL is invalid.

### Requirement 3: PDF Text Extraction

**User Story:** As a student, I want the system to extract clean, structured text from my PDFs so that the content is accurately indexed for searching.

#### Acceptance Criteria

1. WHEN a PDF is submitted for ingestion, THE PDF_Parser SHALL extract text content preserving section headings as distinct labeled blocks and separating paragraphs at double-newline or explicit paragraph-break boundaries in the source document.
2. THE PDF_Parser SHALL handle standard digital (text-based) PDFs up to 50 MB in file size and up to 500 pages without requiring OCR.
3. WHEN the PDF_Parser extracts text, THE PDF_Parser SHALL associate each text block with its section heading when heading structure is detectable via PDF metadata bookmarks, or font-size differentiation of at least 2 points above body text.
4. IF the PDF_Parser extracts fewer than 20 non-whitespace characters from a PDF (e.g., scanned/image-only PDF), THEN THE Ingestion_Pipeline SHALL mark the Paper record with a `parse_status` of "failed" and inform the user that the document requires a format not yet supported.
5. WHEN text extraction completes successfully, THE PDF_Parser SHALL pass the structured text — consisting of an ordered sequence of sections each containing a heading label and one or more paragraph text blocks — to the chunking stage of the Ingestion_Pipeline.
6. IF the PDF_Parser does not complete text extraction within 60 seconds, THEN THE Ingestion_Pipeline SHALL abort the extraction, mark the Paper record with a `parse_status` of "failed", and inform the user that the document could not be processed within the time limit.

### Requirement 4: Text Chunking

**User Story:** As a student, I want the system to split parsed text into appropriately sized chunks so that vector search returns focused, relevant passages.

#### Acceptance Criteria

1. THE Ingestion_Pipeline SHALL split extracted text into Chunks of 256 to 512 tokens each; IF the final segment of a document contains fewer than 256 tokens, THEN THE Ingestion_Pipeline SHALL merge it with the preceding Chunk rather than storing an undersized Chunk.
2. THE Ingestion_Pipeline SHALL apply an overlap of 10-15% of the chunk size (rounded down to the nearest whole token) between consecutive Chunks to preserve context across boundaries.
3. WHEN section headings are available, THE Ingestion_Pipeline SHALL split at heading boundaries provided the resulting Chunks remain within the 256 to 512 token range; IF splitting at a heading boundary would produce a Chunk below 256 tokens, THEN THE Ingestion_Pipeline SHALL merge that content with the adjacent Chunk.
4. WHEN a paragraph exceeds 512 tokens, THE Ingestion_Pipeline SHALL split that paragraph at sentence boundaries to stay within the 512-token limit; IF a single sentence exceeds 512 tokens, THEN THE Ingestion_Pipeline SHALL split that sentence at the nearest word boundary at or before the 512-token position.
5. THE Ingestion_Pipeline SHALL store each Chunk with a zero-based sequential `chunk_index`, `content`, associated `paper_id`, and `section_heading` metadata; IF no section heading is associated with a Chunk, THEN THE Ingestion_Pipeline SHALL store the `section_heading` value as an empty string.

### Requirement 5: Embedding Generation and Storage

**User Story:** As a student, I want the system to generate vector embeddings for each chunk so that I can search paper content by meaning.

#### Acceptance Criteria

1. WHEN a Chunk is created, THE Embedding_Service SHALL generate a 1536-dimension vector embedding for that Chunk's text content and store the resulting vector in the `paper_chunks.embedding` column for that Chunk.
2. IF the Embedding_Service API call fails, THEN THE Ingestion_Pipeline SHALL retry the embedding generation up to 3 times with exponential backoff starting at 1 second and doubling each attempt (1s, 2s, 4s).
3. IF all retry attempts fail, THEN THE Ingestion_Pipeline SHALL mark the Paper record with a `parse_status` of "partial", store the chunks without embeddings for later retry, and log the failure reason.
4. WHEN all chunks for a paper are successfully embedded, THE Ingestion_Pipeline SHALL update the Paper record `parse_status` to "ready".
5. THE Embedding_Service SHALL process chunks in batches of up to 20 chunks per API call.
6. IF a single embedding API call does not return a response within 30 seconds, THEN THE Embedding_Service SHALL treat the call as failed and apply the retry logic defined in criterion 2.
7. IF a Chunk's text content is empty or contains only whitespace, THEN THE Embedding_Service SHALL skip embedding generation for that Chunk and store the Chunk with a null embedding value.

### Requirement 6: RAG Question-Answering

**User Story:** As a student, I want to ask questions about my papers and get cited answers so that I can understand the content without re-reading entire documents.

#### Acceptance Criteria

1. WHEN a user submits a question of between 3 and 500 characters via the Research_Desk_UI, THE RAG_Engine SHALL generate an embedding for the question text within 2 seconds.
2. WHEN the question embedding is generated, THE RAG_Engine SHALL perform a cosine similarity search on the `paper_chunks` table using the question embedding and return the top 8 Chunks ranked by highest cosine similarity score.
3. WHEN a `paperId` filter is provided, THE RAG_Engine SHALL restrict the similarity search to Chunks belonging to that specific Paper.
4. WHEN no `paperId` filter is provided, THE RAG_Engine SHALL search across all of the user's indexed Chunks.
5. THE RAG_Engine SHALL feed the top 8 retrieved Chunks to the LLM with explicit instructions to cite each claim using the format `[Paper Title, Section]`.
6. THE RAG_Engine SHALL return the answer text (maximum 3000 characters) along with structured Citation metadata including paper_id, chunk_index, section_heading, and a relevant Snippet (maximum 300 characters) for each citation.
7. IF no relevant Chunks are found (all similarity scores below 0.3), THEN THE RAG_Engine SHALL inform the user that no relevant content was found and suggest uploading more papers or rephrasing the question.
8. THE RAG_Engine SHALL instruct the LLM to state when information is insufficient to answer the question rather than fabricating content not present in the source Chunks.
9. IF the user submits a question with fewer than 3 characters or more than 500 characters, THEN THE RAG_Engine SHALL reject the request and return an error message indicating the question must be between 3 and 500 characters.
10. IF the LLM or embedding service is unavailable or fails to respond within 30 seconds, THEN THE RAG_Engine SHALL return an error message indicating the service is temporarily unavailable and the user should retry.

### Requirement 7: RAG Answer Display with Citations

**User Story:** As a student, I want to see AI answers with inline citations and expandable source snippets so that I can verify claims and learn from the original text.

#### Acceptance Criteria

1. WHEN the RAG_Engine returns an answer containing one or more citations, THE Research_Desk_UI SHALL display the answer text with inline citation markers rendered as numbered superscripts (sequential integers starting at 1), each marker styled with a distinct background or underline so it is identifiable as interactive without relying on color alone.
2. WHEN a user clicks a citation marker, THE Research_Desk_UI SHALL expand an inline panel directly below the citation marker (or scroll to the citations panel entry if already visible) showing the corresponding Snippet's chunk text truncated to a maximum of 500 characters with a "show more" control if the full text exceeds that length.
3. WHEN the RAG_Engine returns an answer, THE Research_Desk_UI SHALL display a citations panel listing all referenced Snippets (maximum 20 per answer) with each entry showing the paper title, section heading, and chunk content truncated to 300 characters.
4. THE Research_Desk_UI SHALL visually differentiate RAG answers from general research answers by displaying a persistent label indicating the answer source type (e.g., "From your papers" vs "From web sources") and a distinct border or container style per answer type.
5. IF the RAG_Engine returns an error or fails to respond within 10 seconds, THEN THE Research_Desk_UI SHALL display an error message indicating that paper-based answers are temporarily unavailable and suggest the user retry or use general research.
6. IF the RAG_Engine returns an answer with zero citations, THEN THE Research_Desk_UI SHALL display the answer text without citation markers and show a notice in the citations panel indicating no source snippets are available for this answer.

### Requirement 8: Card Creation from RAG Answers

**User Story:** As a student, I want to turn parts of a RAG answer into flashcards so that I can review key concepts using spaced repetition.

#### Acceptance Criteria

1. WHEN a RAG answer is displayed, THE Research_Desk_UI SHALL allow the user to select a portion of the answer text containing at least 1 non-whitespace character.
2. WHEN a user selects answer text and chooses "Create Card", THE Research_Desk_UI SHALL pre-populate a card creation form with the selected text as the card back and an LLM-generated question based on the selected text as the card front.
3. THE Research_Desk_UI SHALL allow the user to edit both the front (maximum 200 characters) and back (maximum 1000 characters) of the card before saving, and SHALL enforce a minimum of 1 non-whitespace character for each field.
4. WHEN a card is created from a RAG answer, THE Research_Desk_UI SHALL set the card `source_type` to "research" and associate it with the Topic that was selected for the current research query context; IF no Topic is associated with the research context, THEN THE Research_Desk_UI SHALL save the card without a Topic association.
5. WHEN the RAG_Engine generates an answer, THE RAG_Engine SHALL include between 1 and 5 suggested flashcard pairs (question/answer) derived from the RAG answer content.
6. IF a card save operation fails, THEN THE Research_Desk_UI SHALL display an error message indicating the save failure and preserve the user's entered front and back text in the form.
7. IF the selected text exceeds 1000 characters, THEN THE Research_Desk_UI SHALL truncate the pre-populated card back to 1000 characters and allow the user to edit before saving.

### Requirement 9: Feynman Prompt Creation from RAG Answers

**User Story:** As a student, I want to convert parts of a RAG answer into Feynman explanation prompts so that I can practice explaining concepts in my own words.

#### Acceptance Criteria

1. WHEN a RAG answer is displayed and the user selects a text portion between 10 and 500 characters in length within the answer content, THE Research_Desk_UI SHALL display a "Send to Feynman" action adjacent to the selection.
2. IF a user attempts to trigger the "Send to Feynman" action with a selection shorter than 10 characters or longer than 500 characters, THEN THE Research_Desk_UI SHALL disable the action and display a message indicating the required selection length range.
3. WHEN a user selects text within the valid length range and chooses "Send to Feynman", THE Research_Desk_UI SHALL navigate to the Feynman mode with the selected text pre-filled as the explanation topic.
4. WHEN the Research_Desk_UI navigates to Feynman mode via "Send to Feynman", THE Research_Desk_UI SHALL pass the source title from which the answer was derived and the original research question as context to the Feynman mode so the AI evaluator knows the source material.

### Requirement 10: Paper Ingestion Status and Management

**User Story:** As a student, I want to see which of my saved papers have been indexed and manage their ingestion status so that I know what's available for RAG queries.

#### Acceptance Criteria

1. THE Research_Desk_UI SHALL display the `parse_status` of each Paper in the user's library (one of: "pending", "processing", "ready", "partial", "failed").
2. IF a Paper has `parse_status` "ready", THEN THE Research_Desk_UI SHALL display the number of Chunks indexed for that Paper.
3. IF a Paper has `parse_status` "failed" or "partial", THEN THE Research_Desk_UI SHALL display the error reason (truncated to 200 characters if longer) and offer a "Retry" action.
4. WHEN a user triggers the "Retry" action on a Paper with `parse_status` "failed" or "partial", THE Ingestion_Pipeline SHALL set the Paper's `parse_status` to "pending" and re-queue the Paper for ingestion.
5. WHEN a user requests deletion of a Paper, THE Research_Desk_UI SHALL present a confirmation prompt before executing the deletion.
6. WHEN a user confirms deletion of a Paper, THE Ingestion_Pipeline SHALL remove the associated PDF file from Supabase Storage and all chunk records from `paper_chunks`, and delete the Paper record, within 30 seconds.
7. IF the deletion of a Paper's associated PDF or chunk records fails, THEN THE Ingestion_Pipeline SHALL retain the Paper record, report an error message indicating which resource could not be removed, and leave the Paper available for a subsequent deletion attempt.

### Requirement 11: Ingestion Progress Feedback

**User Story:** As a student, I want to see real-time progress when a paper is being parsed and indexed so that I know the system is working and can estimate wait times.

#### Acceptance Criteria

1. WHILE the Ingestion_Pipeline is processing a PDF, THE Research_Desk_UI SHALL display a progress indicator showing the current stage (downloading, parsing, chunking, embedding) and update the displayed stage within 3 seconds of a stage transition occurring in the pipeline.
2. WHILE the Embedding_Service is processing chunks, THE Research_Desk_UI SHALL display the number of chunks processed out of the total, updating the count at least once every 5 seconds.
3. WHEN ingestion completes successfully, THE Research_Desk_UI SHALL update the Paper status to "ready" and display a non-blocking notification indicating the paper is available for questions within 5 seconds of completion.
4. IF the user navigates away during ingestion and later returns to the page where the paper is listed, THEN THE Research_Desk_UI SHALL display the current ingestion stage and progress if ingestion is still in progress, or the final status ("ready" or "failed") if ingestion has completed.
5. IF the Ingestion_Pipeline encounters an error at any stage (downloading, parsing, chunking, or embedding), THEN THE Research_Desk_UI SHALL update the Paper status to "failed", display the stage at which the failure occurred, and present an option to retry ingestion.
6. IF the user navigates away during ingestion, THE Ingestion_Pipeline SHALL continue processing in the background and update the Paper status upon completion or failure.

### Requirement 12: Rate Limiting and API Error Handling

**User Story:** As a student, I want the system to handle API rate limits gracefully so that my ingestion and queries don't fail silently.

#### Acceptance Criteria

1. IF the Embedding_Service encounters a rate limit response (HTTP 429), THEN THE Ingestion_Pipeline SHALL wait for the duration specified in the `Retry-After` header before retrying; IF no `Retry-After` header is present, THEN THE Ingestion_Pipeline SHALL wait 60 seconds before retrying.
2. IF the LLM API encounters a rate limit during RAG answer generation, THEN THE RAG_Engine SHALL fall back to the secondary AI provider (OpenRouter) before returning an error to the user.
3. IF both AI providers are unavailable or return errors, THEN THE RAG_Engine SHALL return an error message indicating temporary unavailability and suggest the user try again in 60 seconds.
4. THE Ingestion_Pipeline SHALL limit concurrent embedding requests to 2 per user to avoid exhausting API quotas; additional requests SHALL be queued and processed in order.
5. IF an embedding API key is not configured or invalid, THEN THE Ingestion_Pipeline SHALL return an error indicating that the embedding service is not available and set the Paper `parse_status` to "failed".

### Requirement 13: Scoped RAG Queries

**User Story:** As a student, I want to ask questions scoped to a specific paper or across all my papers so that I can choose the breadth of my research.

#### Acceptance Criteria

1. THE Research_Desk_UI SHALL provide a paper selector that allows the user to choose between "All papers", a specific paper, or papers within a specific Topic, with "All papers" selected as the default scope.
2. WHEN "All papers" is selected and the user submits a query of 3 to 500 characters, THE RAG_Engine SHALL search across all of the user's indexed Chunks.
3. WHEN a specific Paper is selected and the user submits a query, THE RAG_Engine SHALL restrict the search to Chunks from that Paper only.
4. WHEN a Topic is selected and the user submits a query, THE RAG_Engine SHALL restrict the search to Chunks from Papers associated with that Topic.
5. IF the user submits a query and the selected scope contains no indexed Chunks, THEN THE RAG_Engine SHALL return an empty result set and THE Research_Desk_UI SHALL display a message indicating no indexed content is available for the selected scope.
6. IF the user submits a query shorter than 3 characters or longer than 500 characters, THEN THE Research_Desk_UI SHALL reject the submission and display an error message indicating the query must be between 3 and 500 characters.

### Requirement 14: Schema Extension for Parse Status

**User Story:** As a developer, I want the papers table to track ingestion status so that the UI can display progress and the pipeline can manage retries.

#### Acceptance Criteria

1. THE `papers` table SHALL include a `parse_status` TEXT column with a CHECK constraint restricting values to "pending", "processing", "ready", "partial", "failed".
2. THE `papers` table SHALL include a `parse_error` TEXT column (maximum 2000 characters) that stores error details when `parse_status` is "failed" or "partial", and SHALL be NULL when `parse_status` is "pending", "processing", or "ready".
3. THE `papers` table SHALL include a `chunk_count` INTEGER column with a default value of 0 and a CHECK constraint enforcing a minimum value of 0, reflecting the total number of chunks stored in `paper_chunks` for that paper.
4. THE `paper_chunks` table SHALL include a `section_heading` TEXT column (maximum 500 characters, nullable) to store the heading of the section from which each chunk was extracted.
5. THE `papers` table SHALL default `parse_status` to "pending" for newly created records.
6. WHEN `parse_status` transitions from "failed" or "partial" to "processing" (retry), THE system SHALL set `parse_error` to NULL.
