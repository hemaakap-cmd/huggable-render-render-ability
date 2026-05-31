-- ssra_sessions (adapted: course_id is text to match ssra_courses.id)
CREATE TABLE IF NOT EXISTS public.ssra_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        text REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  zoom_link        text NOT NULL,
  zoom_password    text,
  scheduled_at     timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  recording_url    text,
  is_cancelled     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_sessions TO authenticated;
GRANT ALL ON public.ssra_sessions TO service_role;

ALTER TABLE public.ssra_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_sessions" ON public.ssra_sessions
  FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE POLICY "subscriber_read_sessions" ON public.ssra_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ssra_subscriptions
      WHERE user_id = auth.uid()
        AND course_id = ssra_sessions.course_id
        AND status IN ('active', 'trialing')
    )
    OR public.is_ssra_admin(auth.uid())
  );

CREATE INDEX IF NOT EXISTS ssra_sessions_scheduled_at ON public.ssra_sessions (scheduled_at);
CREATE INDEX IF NOT EXISTS ssra_sessions_course_id ON public.ssra_sessions (course_id);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS public.ssra_session_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.ssra_sessions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  attended_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_session_attendance TO authenticated;
GRANT ALL ON public.ssra_session_attendance TO service_role;

ALTER TABLE public.ssra_session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_attendance" ON public.ssra_session_attendance
  FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE POLICY "student_view_own_attendance" ON public.ssra_session_attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "student_insert_own_attendance" ON public.ssra_session_attendance
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());