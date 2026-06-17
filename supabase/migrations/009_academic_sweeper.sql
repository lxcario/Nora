-- ============================================================
-- Pixel Study OS – Academic discovery sweeper (Task 12.1, OPTIONAL)
--
-- Resilience for the durable job queue when no client tab is open to drive
-- processNextJob():
--   1) academic_sweep_stalled_jobs() — release locks leaked by interrupted
--      runs so the next poll (client or cron) can reclaim them.
--   2) academic_reattempt_discovery() — re-enqueue discovery for completed
--      profiles whose sources have gone stale (e.g. a new term began).
--
-- These are plain SQL functions. Job *execution* still happens in the Node
-- server action (processNextJob), driven by the client poller; this migration
-- only keeps the queue advanceable. Scheduling via pg_cron is OPTIONAL and
-- guarded below — skip this whole file if pg_cron is not enabled.
-- ============================================================

-- 1) Release stalled locks (running > 5 minutes ⇒ back to pending).
CREATE OR REPLACE FUNCTION public.academic_sweep_stalled_jobs()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE ingestion_jobs
     SET status = 'pending', locked_at = NULL
   WHERE status = 'running'
     AND locked_at IS NOT NULL
     AND locked_at < now() - interval '5 minutes';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Re-attempt discovery for completed profiles that have a stale source and
--    no discovery job currently in flight (Requirement 18.4).
CREATE OR REPLACE FUNCTION public.academic_reattempt_discovery()
RETURNS INTEGER AS $$
DECLARE
  inserted INTEGER := 0;
  prof RECORD;
BEGIN
  FOR prof IN
    SELECT ap.id AS profile_id, ap.user_id
      FROM academic_profiles ap
     WHERE ap.onboarding_status = 'complete'
       AND EXISTS (
         SELECT 1 FROM academic_sources s
          WHERE s.academic_profile_id = ap.id AND s.is_stale = TRUE
       )
       AND NOT EXISTS (
         SELECT 1 FROM ingestion_jobs j
          WHERE j.academic_profile_id = ap.id
            AND j.job_type = 'discover_sources'
            AND j.status IN ('pending', 'running')
       )
  LOOP
    INSERT INTO ingestion_jobs (user_id, academic_profile_id, job_type, payload, status)
    VALUES (prof.user_id, prof.profile_id, 'discover_sources',
            jsonb_build_object('profileId', prof.profile_id, 'reason', 'stale_refresh'), 'pending');
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) OPTIONAL pg_cron scheduling. Requires the pg_cron extension (enable it in
--    the Supabase dashboard → Database → Extensions). Guarded so this migration
--    still applies cleanly when pg_cron is unavailable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Release stalled locks every 5 minutes.
    PERFORM cron.schedule(
      'academic-sweep-stalled-jobs',
      '*/5 * * * *',
      $cron$ SELECT public.academic_sweep_stalled_jobs(); $cron$
    );
    -- Re-attempt stale discovery daily.
    PERFORM cron.schedule(
      'academic-reattempt-discovery',
      '0 3 * * *',
      $cron$ SELECT public.academic_reattempt_discovery(); $cron$
    );
    RAISE NOTICE 'pg_cron schedules created for academic sweeper.';
  ELSE
    RAISE NOTICE 'pg_cron not installed; sweeper functions created but not scheduled.';
  END IF;
END $$;
