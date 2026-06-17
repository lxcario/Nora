-- ============================================================
-- Pixel Study OS – Academic discovery job queue (Task 7.1)
--
-- Durable, resumable background work units for autonomous source
-- discovery and ingestion. Driven by the client-poll `processNextJob()`
-- server action and (optionally) a pg_cron/pg_net sweeper (migration 009).
--
-- Every job is user-owned with RLS `user_id = auth.uid()` (Requirement 17.1).
-- ============================================================

CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_profile_id UUID REFERENCES academic_profiles(id) ON DELETE CASCADE,

  job_type TEXT NOT NULL CHECK (job_type IN (
    'discover_sources',
    'fetch_source',
    'parse_document',
    'extract_events',
    'extract_curriculum',
    'embed_chunks'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'succeeded', 'failed', 'skipped'
  )),

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,

  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),

  -- Earliest time the job may run (used for backoff scheduling).
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set when a worker claims the job; cleared/ignored once stale.
  locked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- attempts may reach but never exceed max_attempts
  CONSTRAINT ingestion_jobs_attempts_bound CHECK (attempts <= max_attempts)
);

ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ingestion jobs"
  ON ingestion_jobs FOR ALL USING (user_id = auth.uid());

-- Claim index: find the next runnable job for a user quickly.
CREATE INDEX idx_ingestion_jobs_claim
  ON ingestion_jobs (user_id, status, next_run_at);

CREATE INDEX idx_ingestion_jobs_profile
  ON ingestion_jobs (academic_profile_id);

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_ingestion_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ingestion_jobs_updated_at
  BEFORE UPDATE ON ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_ingestion_job_updated_at();
