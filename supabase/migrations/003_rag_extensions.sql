-- ============================================================
-- Pixel Study OS – RAG Extensions Migration
-- Adds parse status tracking, section headings, full-text
-- search support, and the match_paper_chunks RPC function.
-- Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
-- ============================================================

-- 1. Add parse status tracking columns to papers table
ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS parse_status TEXT DEFAULT 'pending'
    CHECK (parse_status IN ('pending', 'processing', 'ready', 'partial', 'failed')),
  ADD COLUMN IF NOT EXISTS parse_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0 CHECK (chunk_count >= 0),
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Add section_heading to paper_chunks
ALTER TABLE paper_chunks
  ADD COLUMN IF NOT EXISTS section_heading TEXT;

ALTER TABLE paper_chunks
  ADD CONSTRAINT paper_chunks_section_heading_length
    CHECK (section_heading IS NULL OR length(section_heading) <= 500);

-- 3. Add full-text search support (free dev mode — used when OPENAI_API_KEY is absent)
ALTER TABLE paper_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_paper_chunks_tsv ON paper_chunks USING GIN (content_tsv);

-- 4. Add parse_error length constraint
ALTER TABLE papers
  ADD CONSTRAINT papers_parse_error_length
    CHECK (parse_error IS NULL OR length(parse_error) <= 2000);

-- 5. Create the match_paper_chunks RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_paper_chunks(
  query_embedding vector(1536),
  match_user_id UUID,
  match_paper_id UUID DEFAULT NULL,
  match_topic_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  paper_id UUID,
  chunk_index INT,
  content TEXT,
  section_heading TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.paper_id,
    pc.chunk_index,
    pc.content,
    pc.section_heading,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM paper_chunks pc
  JOIN papers p ON p.id = pc.paper_id
  WHERE pc.user_id = match_user_id
    AND pc.embedding IS NOT NULL
    AND (match_paper_id IS NULL OR pc.paper_id = match_paper_id)
    AND (match_topic_id IS NULL OR p.topic_id = match_topic_id)
    AND 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
