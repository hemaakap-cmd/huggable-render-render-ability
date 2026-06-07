
-- 1. Instructor read access for homework submissions on their assigned courses
CREATE POLICY "Instructor read assigned homework"
ON public.ssra_homework_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ssra_courses c
    WHERE c.id = ssra_homework_submissions.course_id
      AND c.instructor_id = auth.uid()
  )
);

-- Allow instructors to grade homework on their assigned courses
CREATE POLICY "Instructor grade assigned homework"
ON public.ssra_homework_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ssra_courses c
    WHERE c.id = ssra_homework_submissions.course_id
      AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ssra_courses c
    WHERE c.id = ssra_homework_submissions.course_id
      AND c.instructor_id = auth.uid()
  )
);

-- 2. Exclude cancelled sessions from student/subscriber read access
DROP POLICY IF EXISTS "subscriber_read_sessions" ON public.ssra_sessions;

CREATE POLICY "subscriber_read_sessions"
ON public.ssra_sessions
FOR SELECT
TO authenticated
USING (
  is_ssra_admin(auth.uid())
  OR (
    is_cancelled = false
    AND (
      EXISTS (
        SELECT 1 FROM public.ssra_subscriptions s
        WHERE s.user_id = auth.uid()
          AND s.course_id = ssra_sessions.course_id
          AND s.status = ANY (ARRAY['active','trialing'])
      )
      OR EXISTS (
        SELECT 1 FROM public.ssra_enrollments e
        WHERE e.user_id = auth.uid()
          AND e.course_id = ssra_sessions.course_id
          AND e.status = 'active'
      )
    )
  )
);

-- Nullify Zoom credentials when a session is cancelled
CREATE OR REPLACE FUNCTION public.clear_cancelled_session_credentials()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_cancelled = true AND (OLD.is_cancelled = false OR OLD.is_cancelled IS NULL) THEN
    NEW.zoom_link := '';
    NEW.zoom_password := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_cancelled_session_credentials ON public.ssra_sessions;
CREATE TRIGGER trg_clear_cancelled_session_credentials
BEFORE UPDATE ON public.ssra_sessions
FOR EACH ROW EXECUTE FUNCTION public.clear_cancelled_session_credentials();

-- Clear credentials on already-cancelled sessions
UPDATE public.ssra_sessions
SET zoom_link = '', zoom_password = NULL
WHERE is_cancelled = true AND (zoom_link <> '' OR zoom_password IS NOT NULL);
