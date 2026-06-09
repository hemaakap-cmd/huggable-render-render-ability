
-- 1. Webhook idempotency table (referenced by payments-webhook but missing)
CREATE TABLE IF NOT EXISTS public.ssra_webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      text UNIQUE,
  event_type    text NOT NULL,
  environment   text NOT NULL,
  status        text NOT NULL CHECK (status IN ('processed','failed','skipped')),
  error_message text,
  payload       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssra_webhook_events_event_id ON public.ssra_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_ssra_webhook_events_created_at ON public.ssra_webhook_events(created_at DESC);

GRANT SELECT ON public.ssra_webhook_events TO authenticated;
GRANT ALL ON public.ssra_webhook_events TO service_role;

ALTER TABLE public.ssra_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read webhook events" ON public.ssra_webhook_events;
CREATE POLICY "Admin read webhook events"
  ON public.ssra_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

-- 2. Self-heal helper: recompute enrolled_count for one course (admin only)
CREATE OR REPLACE FUNCTION public.recompute_course_enrolled_count(_course_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  SELECT COUNT(*) INTO v_count
    FROM public.ssra_enrollments
    WHERE course_id = _course_id AND status = 'active';
  UPDATE public.ssra_courses SET enrolled_count = v_count WHERE id = _course_id;
  RETURN v_count;
END;
$$;

-- 3. Homework submitted -> notify every instructor of the course
CREATE OR REPLACE FUNCTION public.notify_instructors_on_homework_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title text;
  v_student_name text;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status NOT IN ('submitted','late') AND NEW.status IN ('submitted','late')) THEN
    SELECT title INTO v_course_title FROM public.ssra_courses WHERE id = NEW.course_id;
    SELECT full_name INTO v_student_name FROM public.ssra_profiles WHERE id = NEW.user_id;

    -- legacy single instructor
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    SELECT c.instructor_id,
           'homework_submitted',
           'New homework submitted',
           COALESCE(v_student_name,'A student') || ' submitted homework for ' || COALESCE(v_course_title,'your course') || '.',
           '/instructor/homework'
      FROM public.ssra_courses c
      WHERE c.id = NEW.course_id AND c.instructor_id IS NOT NULL;

    -- multi-instructor assignments (dedup against legacy)
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    SELECT a.instructor_id,
           'homework_submitted',
           'New homework submitted',
           COALESCE(v_student_name,'A student') || ' submitted homework for ' || COALESCE(v_course_title,'your course') || '.',
           '/instructor/homework'
      FROM public.ssra_instructor_assignments a
      WHERE a.course_id = NEW.course_id
        AND a.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.ssra_courses c
          WHERE c.id = NEW.course_id AND c.instructor_id = a.instructor_id
        );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_instructors_on_homework_submit ON public.ssra_homework_submissions;
CREATE TRIGGER trg_notify_instructors_on_homework_submit
  AFTER INSERT OR UPDATE OF status ON public.ssra_homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_instructors_on_homework_submit();

-- 4. Homework graded -> notify student
CREATE OR REPLACE FUNCTION public.notify_student_on_homework_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title text;
BEGIN
  IF NEW.status = 'graded' AND (OLD.status IS DISTINCT FROM 'graded' OR OLD.grade IS DISTINCT FROM NEW.grade) THEN
    SELECT title INTO v_course_title FROM public.ssra_courses WHERE id = NEW.course_id;
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'homework_graded',
      'Your homework was graded',
      COALESCE(v_course_title,'Your course') || ' — grade: ' || COALESCE(NEW.grade::text,'—') || '%.',
      '/dashboard/homework'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_on_homework_graded ON public.ssra_homework_submissions;
CREATE TRIGGER trg_notify_student_on_homework_graded
  AFTER UPDATE OF status, grade ON public.ssra_homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_homework_graded();

-- 5. Role change -> audit log
CREATE OR REPLACE FUNCTION public.log_role_change_to_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text;
  v_actor_role  text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT email, role INTO v_actor_email, v_actor_role
      FROM public.ssra_profiles WHERE id = auth.uid();

    INSERT INTO public.ssra_audit_log (
      actor_id, actor_email, actor_role,
      action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(), v_actor_email, v_actor_role,
      'role_changed', 'ssra_profile', NEW.id::text,
      jsonb_build_object(
        'target_email', NEW.email,
        'from_role', OLD.role,
        'to_role',   NEW.role
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_role_change_to_audit ON public.ssra_profiles;
CREATE TRIGGER trg_log_role_change_to_audit
  AFTER UPDATE OF role ON public.ssra_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change_to_audit();

-- 6. Realtime — enable on user-facing tables that drive live dashboards
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ssra_notifications',
    'ssra_enrollments',
    'ssra_profiles',
    'ssra_cancellation_requests',
    'ssra_homework_submissions',
    'ssra_certificates',
    'ssra_instructor_assignments'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- already in publication
    END;
  END LOOP;
END
$$;
