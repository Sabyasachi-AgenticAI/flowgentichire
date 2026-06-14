-- Enable Supabase Realtime on all tables used by the dashboard live view.
-- Without this, the postgres_changes subscriptions in scout-live-view.tsx
-- will connect but never fire — causing the "status stuck at calling" issue.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'requirement_candidates',
    'requirement_activity',
    'interview_summaries',
    'candidates',
    'job_requirements'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || tbl;
      RAISE NOTICE 'Added % to supabase_realtime publication', tbl;
    ELSE
      RAISE NOTICE '% already in supabase_realtime — skipped', tbl;
    END IF;
  END LOOP;
END $$;
