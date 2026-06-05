
-- 1) Remove visitor sessions from realtime publication (admin page polls via REST, doesn't need realtime)
ALTER PUBLICATION supabase_realtime DROP TABLE public.site_visitor_sessions;

-- 2) Tighten ssra_session_attendance insert: require active enrollment or subscription for the session's course
DROP POLICY IF EXISTS student_insert_own_attendance ON public.ssra_session_attendance;
CREATE POLICY student_insert_own_attendance
ON public.ssra_session_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.ssra_sessions s
    WHERE s.id = ssra_session_attendance.session_id
      AND (
        EXISTS (
          SELECT 1 FROM public.ssra_enrollments e
          WHERE e.user_id = auth.uid()
            AND e.course_id = s.course_id
            AND e.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.ssra_subscriptions sub
          WHERE sub.user_id = auth.uid()
            AND sub.course_id = s.course_id
            AND sub.status IN ('active','trialing')
        )
      )
  )
);

-- 3) Tighten ssra_session_access_log insert with the same enrollment/subscription requirement
DROP POLICY IF EXISTS "Own session access insert" ON public.ssra_session_access_log;
CREATE POLICY "Own session access insert"
ON public.ssra_session_access_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    session_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.ssra_sessions s
      WHERE s.id = ssra_session_access_log.session_id
        AND (
          EXISTS (
            SELECT 1 FROM public.ssra_enrollments e
            WHERE e.user_id = auth.uid()
              AND e.course_id = s.course_id
              AND e.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.ssra_subscriptions sub
            WHERE sub.user_id = auth.uid()
              AND sub.course_id = s.course_id
              AND sub.status IN ('active','trialing')
          )
        )
    )
  )
);
