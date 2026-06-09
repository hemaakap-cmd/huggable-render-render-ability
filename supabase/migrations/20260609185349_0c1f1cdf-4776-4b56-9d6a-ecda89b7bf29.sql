
-- 1) Storage: restrict course-materials INSERT to instructors of the specific course
DROP POLICY IF EXISTS course_materials_write ON storage.objects;
CREATE POLICY course_materials_write ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), split_part(name, '/', 1))
  )
);

-- 2) ssra_session_tokens: explicit owner-only SELECT, deny client writes (edge fns use service role)
CREATE POLICY ssra_session_tokens_owner_select ON public.ssra_session_tokens
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_ssra_admin(auth.uid()));

-- 3) realtime.messages: scope subscriptions for authenticated users.
-- Postgres-changes data is still filtered by table-level RLS. This blocks
-- anonymous subscribers and documents intent for broadcast/presence.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated can receive realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can send realtime" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated can send realtime" ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END$$;
