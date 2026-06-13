DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ssra_courses'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_courses;
  END IF;
END $$;