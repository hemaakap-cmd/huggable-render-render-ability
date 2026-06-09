
-- 1. Drop instructor SELECT policy on session credentials (edge-function-only access intended)
DROP POLICY IF EXISTS "Instructor read assigned session credentials" ON public.ssra_session_credentials;

-- 2. Fix course_materials_write path traversal: require an existing ssra_materials row whose storage_path equals the object name, and that the user is instructor for that course
DROP POLICY IF EXISTS course_materials_write ON storage.objects;
CREATE POLICY course_materials_write ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ssra_materials m
      JOIN public.ssra_courses c ON c.id = m.course_id
      WHERE m.storage_path = storage.objects.name
        AND (
          c.instructor_id = auth.uid()
          OR public.is_instructor_for_course(auth.uid(), m.course_id)
        )
    )
  )
);

-- 3. Lock down realtime.messages: only allow subscriptions to user-scoped topics named "user:<auth.uid()>"
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts"   ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can read"                    ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can insert"                  ON realtime.messages;

CREATE POLICY "Users read own topic only" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() = 'user:' || auth.uid()::text
  OR public.is_ssra_admin(auth.uid())
);

CREATE POLICY "Users send to own topic only" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = 'user:' || auth.uid()::text
);
