
-- Helper: instructor for a course via legacy column OR active assignment
CREATE OR REPLACE FUNCTION public.is_instructor_for_course(_uid uuid, _course_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ssra_courses c
    WHERE c.id = _course_id AND c.instructor_id = _uid
  ) OR EXISTS (
    SELECT 1 FROM public.ssra_instructor_assignments a
    WHERE a.course_id = _course_id
      AND a.instructor_id = _uid
      AND a.is_active = true
  );
$$;

-- ssra_materials: replace instructor policy
DROP POLICY IF EXISTS "Instructor manage own course materials" ON public.ssra_materials;
CREATE POLICY "Instructor manage assigned course materials"
  ON public.ssra_materials
  FOR ALL
  TO authenticated
  USING (public.is_instructor_for_course(auth.uid(), course_id))
  WITH CHECK (public.is_instructor_for_course(auth.uid(), course_id));

-- ssra_homework_submissions: replace instructor read + grade policies
DROP POLICY IF EXISTS "Instructor read assigned homework" ON public.ssra_homework_submissions;
DROP POLICY IF EXISTS "Instructor grade assigned homework" ON public.ssra_homework_submissions;

CREATE POLICY "Instructor read assigned homework"
  ON public.ssra_homework_submissions
  FOR SELECT
  TO authenticated
  USING (public.is_instructor_for_course(auth.uid(), course_id));

CREATE POLICY "Instructor grade assigned homework"
  ON public.ssra_homework_submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_instructor_for_course(auth.uid(), course_id))
  WITH CHECK (public.is_instructor_for_course(auth.uid(), course_id));

-- ssra_sessions: instructors can read sessions of their assigned courses
DROP POLICY IF EXISTS "Instructor read assigned sessions" ON public.ssra_sessions;
CREATE POLICY "Instructor read assigned sessions"
  ON public.ssra_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_instructor_for_course(auth.uid(), course_id));

-- ssra_session_credentials: instructors can read credentials of their assigned sessions
DROP POLICY IF EXISTS "Instructor read assigned session credentials" ON public.ssra_session_credentials;
CREATE POLICY "Instructor read assigned session credentials"
  ON public.ssra_session_credentials
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_credentials.session_id
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  ));

-- ssra_session_attendance: instructors can read + mark attendance for their sessions
DROP POLICY IF EXISTS "Instructor read assigned attendance" ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "Instructor mark assigned attendance" ON public.ssra_session_attendance;

CREATE POLICY "Instructor read assigned attendance"
  ON public.ssra_session_attendance
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_attendance.session_id
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  ));

CREATE POLICY "Instructor mark assigned attendance"
  ON public.ssra_session_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_attendance.session_id
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  ));
