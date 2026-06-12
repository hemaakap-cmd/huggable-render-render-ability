-- emit_event no-op stub (system_events bus not provisioned here)
CREATE OR REPLACE FUNCTION public.emit_event(
  _event_type text, _resource_type text, _resource_id text, _payload jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN; END; $$;

-- ── 100000: waitlist auto-promotion ─────────────────────────────────────────
ALTER TABLE public.ssra_waitlist
  ADD COLUMN IF NOT EXISTS email_sent     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_waitlist_unsent_notifications
  ON public.ssra_waitlist (status, email_sent, notified_at)
  WHERE status = 'notified' AND email_sent = false;

CREATE OR REPLACE FUNCTION public.promote_next_waitlist_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_next_waiter RECORD; v_course_title TEXT; v_has_seat BOOLEAN;
BEGIN
  IF OLD.status != 'active' OR NEW.status NOT IN ('cancelled','refunded') THEN RETURN NEW; END IF;
  SELECT c.registration_open
         AND (SELECT COUNT(*) FROM public.ssra_enrollments e
              WHERE e.course_id = c.id AND e.status = 'active') < c.capacity
  INTO v_has_seat FROM public.ssra_courses c WHERE c.id = NEW.course_id;
  IF NOT COALESCE(v_has_seat, false) THEN RETURN NEW; END IF;
  SELECT * INTO v_next_waiter FROM public.ssra_waitlist
   WHERE course_id = NEW.course_id AND status = 'waiting' ORDER BY position ASC LIMIT 1;
  IF v_next_waiter IS NULL THEN RETURN NEW; END IF;
  SELECT title INTO v_course_title FROM public.ssra_courses WHERE id = NEW.course_id;
  UPDATE public.ssra_waitlist
     SET status='notified', notified_at=now(),
         expires_at=now()+INTERVAL '48 hours', updated_at=now()
   WHERE id = v_next_waiter.id;
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  VALUES (v_next_waiter.user_id, 'waitlist_promoted',
    'A seat is available: ' || COALESCE(v_course_title,'your waitlisted course'),
    'Good news! A seat has opened up. You have 48 hours to complete your enrollment before it is offered to the next person on the list.',
    '/courses/' || NEW.course_id)
  ON CONFLICT DO NOTHING;
  PERFORM public.emit_event('WaitlistPromoted','waitlist', v_next_waiter.id::text,
    jsonb_build_object('user_id', v_next_waiter.user_id, 'course_id', NEW.course_id,
                       'position', v_next_waiter.position,
                       'expires_at', (now()+INTERVAL '48 hours')::text));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_next_waitlist ON public.ssra_enrollments;
CREATE TRIGGER trg_promote_next_waitlist
  AFTER UPDATE OF status ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.promote_next_waitlist_entry();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('notify-waitlist-promotion')
      FROM cron.job WHERE jobname = 'notify-waitlist-promotion';
    PERFORM cron.schedule('notify-waitlist-promotion','*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/notify-waitlist-promotion',
        headers := jsonb_build_object('Content-Type','application/json',
          'Authorization','Bearer ' || current_setting('app.service_role_key', true)),
        body := '{}'::jsonb);
      $cron$);
  END IF;
END; $$;

-- ── 110000: enrollment stats view + lead/student stats RPC ──────────────────
CREATE OR REPLACE VIEW public.ssra_student_enrollment_stats AS
SELECT e.user_id,
  COUNT(*)                                          AS total_enrollments,
  COUNT(*) FILTER (WHERE e.status = 'active')       AS active_enrollments,
  COUNT(DISTINCT e.course_id)                       AS unique_courses,
  array_agg(DISTINCT e.course_id) FILTER (WHERE e.course_id IS NOT NULL) AS course_ids,
  MIN(COALESCE(e.enrolled_at, e.created_at))        AS first_enrolled_at
FROM public.ssra_enrollments e GROUP BY e.user_id;

GRANT SELECT ON public.ssra_student_enrollment_stats TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_lead_student_stats()
RETURNS TABLE (total_leads bigint, total_students bigint,
  new_leads_this_month bigint, new_students_this_month bigint,
  conversion_rate numeric, total_revenue_eur numeric, revenue_per_student numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH
    profiles AS (SELECT id, created_at FROM public.ssra_profiles WHERE role='student'),
    enrollments AS (SELECT user_id, amount_eur, created_at, status FROM public.ssra_enrollments),
    paying_users AS (SELECT DISTINCT user_id FROM enrollments),
    month_start AS (SELECT date_trunc('month', now()) AS ts)
  SELECT
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM paying_users pu WHERE pu.user_id = p.id))::bigint,
    (SELECT COUNT(*) FROM paying_users)::bigint,
    (SELECT COUNT(*) FROM profiles p CROSS JOIN month_start ms
       WHERE p.created_at >= ms.ts AND NOT EXISTS (SELECT 1 FROM paying_users pu WHERE pu.user_id = p.id))::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM enrollments e CROSS JOIN month_start ms WHERE e.created_at >= ms.ts)::bigint,
    CASE WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 0
         ELSE round(((SELECT COUNT(*) FROM paying_users)::numeric
                     / NULLIF((SELECT COUNT(*) FROM profiles),0)) * 100, 2) END,
    COALESCE((SELECT SUM(amount_eur) FROM enrollments WHERE status IN ('active','completed')),0)::numeric,
    CASE WHEN (SELECT COUNT(*) FROM paying_users) = 0 THEN 0
         ELSE round(COALESCE((SELECT SUM(amount_eur) FROM enrollments WHERE status IN ('active','completed')),0)::numeric
                    / NULLIF((SELECT COUNT(*) FROM paying_users),0), 2) END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_student_stats() TO authenticated, service_role;

-- ── 195635: over-broad shields (DROPPED by 260000 below) ────────────────────
DROP POLICY IF EXISTS "enrollments_no_client_writes" ON public.ssra_enrollments;
CREATE POLICY "enrollments_no_client_writes" ON public.ssra_enrollments
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "session_tokens_no_client_writes" ON public.ssra_session_tokens;
CREATE POLICY "session_tokens_no_client_writes" ON public.ssra_session_tokens
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── 195652: instructor_teaches_student active filter + materials storage ────
CREATE OR REPLACE FUNCTION public.instructor_teaches_student(_instructor_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ssra_enrollments e
    JOIN public.ssra_instructor_assignments ia ON ia.course_id = e.course_id AND ia.is_active = true
    WHERE e.user_id = _student_id AND e.status = 'active' AND ia.instructor_id = _instructor_id
  ) OR EXISTS (
    SELECT 1 FROM public.ssra_enrollments e
    JOIN public.ssra_courses c ON c.id = e.course_id
    WHERE e.user_id = _student_id AND e.status = 'active' AND c.instructor_id = _instructor_id
  );
$$;

DROP POLICY IF EXISTS "course_materials_read" ON storage.objects;
CREATE POLICY "course_materials_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[1])
    OR EXISTS (SELECT 1 FROM public.ssra_enrollments e
               WHERE e.user_id = auth.uid() AND e.course_id = (storage.foldername(name))[1]
                 AND e.status = 'active')
    OR EXISTS (SELECT 1 FROM public.ssra_subscriptions s
               WHERE s.user_id = auth.uid() AND s.course_id = (storage.foldername(name))[1]
                 AND s.status IN ('active','trialing'))
  )
);

-- ── 200000: ssra_courses.is_subscription ────────────────────────────────────
ALTER TABLE public.ssra_courses
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ssra_courses.is_subscription IS
  'Authoritative billing model flag. true = recurring monthly subscription via Paddle, false = one-time purchase.';

-- Backfill — temporarily bypass validate_ssra_course_publishable (medical-german
-- has incomplete metadata but is_active=true; we're only setting is_subscription).
DO $$
BEGIN
  ALTER TABLE public.ssra_courses DISABLE TRIGGER USER;
  UPDATE public.ssra_courses SET is_subscription = true
   WHERE id IN ('medical-german','test-course');
  ALTER TABLE public.ssra_courses ENABLE TRIGGER USER;
END; $$;

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','course_billing_model_centralized','ssra_course','medical-german,test-course',
  jsonb_build_object('migration','20260612200000','is_subscription', true));

-- ── 210000: rate limiting ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key text NOT NULL, window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

COMMENT ON TABLE public.rate_limit_counters IS
  'Fixed-window rate limit counters used by check_rate_limit(). Service-role only.';

GRANT ALL ON public.rate_limit_counters TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limit: service_role only" ON public.rate_limit_counters;
CREATE POLICY "rate_limit: service_role only"
  ON public.rate_limit_counters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text, _max_requests integer, _window_seconds integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_window_start timestamptz; v_count integer;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.rate_limit_counters AS rlc (key, window_start, count)
  VALUES (_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
    DO UPDATE SET count = rlc.count + 1
  RETURNING count INTO v_count;
  RETURN v_count <= _max_requests;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(text,integer,integer) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-rate-limit-counters')
      FROM cron.job WHERE jobname = 'purge-rate-limit-counters';
    PERFORM cron.schedule('purge-rate-limit-counters','30 3 * * *',
      $purge$ DELETE FROM public.rate_limit_counters WHERE window_start < now() - INTERVAL '24 hours'; $purge$);
  END IF;
END; $$;

-- ── 220000: role-change audit trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor_email text; v_actor_role text; v_is_escalation boolean;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN RETURN NEW; END IF;
  SELECT email, role INTO v_actor_email, v_actor_role
    FROM public.ssra_profiles WHERE id = auth.uid();
  v_is_escalation := NEW.role IN ('admin','super_admin')
                     AND OLD.role NOT IN ('admin','super_admin');
  INSERT INTO public.ssra_audit_log (actor_id, actor_email, actor_role,
    action, resource_type, resource_id, details)
  VALUES (auth.uid(), v_actor_email, v_actor_role,
    'role_changed','ssra_profile', NEW.id::text,
    jsonb_build_object('target_email', NEW.email, 'target_name', NEW.full_name,
      'from_role', OLD.role, 'to_role', NEW.role, 'escalation', v_is_escalation));
  PERFORM public.emit_event('RoleChanged','profile', NEW.id::text,
    jsonb_build_object('from_role', OLD.role, 'to_role', NEW.role,
      'escalation', v_is_escalation, 'changed_by', auth.uid()));
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  SELECT p.id, 'role_changed',
    CASE WHEN v_is_escalation THEN '⚠ Privilege escalation: ' ELSE 'Role changed: ' END
      || COALESCE(NEW.full_name, NEW.email, NEW.id::text),
    COALESCE(NEW.email,'User') || ' changed from ' || OLD.role || ' to ' || NEW.role
      || ' by ' || COALESCE(v_actor_email,'system'),
    '/ssra-admin/admins'
  FROM public.ssra_profiles p
  WHERE p.role = 'super_admin' AND p.id IS DISTINCT FROM auth.uid()
  ON CONFLICT DO NOTHING;
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  VALUES (NEW.id, 'role_changed','Your account role has changed',
    'Your role is now: ' || NEW.role || '. Sign out and back in to refresh your access.',
    '/dashboard')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_role_change ON public.ssra_profiles;
CREATE TRIGGER trg_handle_role_change
  AFTER UPDATE OF role ON public.ssra_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_role_change();

-- ── 230000: get_admin_students RPC ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_students(
  _search text DEFAULT NULL, _page integer DEFAULT 0, _page_size integer DEFAULT 25
) RETURNS TABLE (
  id uuid, full_name text, email text, role text, country text, city text,
  phone_number text, created_at timestamptz,
  total_enrollments bigint, active_enrollments bigint, unique_courses bigint,
  course_ids text[], first_enrolled_at timestamptz, latest_sub_status text,
  total_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH stats AS (
    SELECT e.user_id,
      COUNT(*) AS total_enrollments,
      COUNT(*) FILTER (WHERE e.status='active') AS active_enrollments,
      COUNT(DISTINCT e.course_id) AS unique_courses,
      array_agg(DISTINCT e.course_id) FILTER (WHERE e.course_id IS NOT NULL) AS course_ids,
      MIN(COALESCE(e.enrolled_at, e.created_at)) AS first_enrolled_at
    FROM public.ssra_enrollments e GROUP BY e.user_id
  ),
  latest_sub AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.status
    FROM public.ssra_subscriptions s ORDER BY s.user_id, s.created_at DESC
  ),
  filtered AS (
    SELECT p.*, st.total_enrollments, st.active_enrollments, st.unique_courses,
           st.course_ids, st.first_enrolled_at, ls.status AS latest_sub_status
    FROM public.ssra_profiles p
    JOIN stats st ON st.user_id = p.id
    LEFT JOIN latest_sub ls ON ls.user_id = p.id
    WHERE p.role = 'student'
      AND public.is_ssra_admin(auth.uid())
      AND (_search IS NULL OR _search = ''
           OR p.full_name ILIKE '%' || _search || '%'
           OR p.email     ILIKE '%' || _search || '%')
  )
  SELECT f.id, f.full_name, f.email, f.role, f.country, f.city, f.phone_number,
    f.created_at, f.total_enrollments, f.active_enrollments, f.unique_courses,
    f.course_ids, f.first_enrolled_at, f.latest_sub_status,
    (COUNT(*) OVER ())::bigint AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_page_size, 1)
  OFFSET GREATEST(_page, 0) * GREATEST(_page_size, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_students(text, integer, integer)
  TO authenticated, service_role;

-- ── 250000: final security hardening (per-action shields + storage policy) ──
DROP POLICY IF EXISTS "course_materials_read" ON storage.objects;
CREATE POLICY "course_materials_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ssra_materials m
      WHERE m.storage_path = storage.objects.name AND m.is_visible = TRUE
        AND (
          public.is_instructor_for_course(auth.uid(), m.course_id)
          OR EXISTS (SELECT 1 FROM public.ssra_enrollments e
                     WHERE e.user_id = auth.uid() AND e.course_id = m.course_id AND e.status='active')
          OR EXISTS (SELECT 1 FROM public.ssra_subscriptions s
                     WHERE s.user_id = auth.uid() AND s.course_id = m.course_id
                       AND s.status IN ('active','trialing'))
        )
    )
  )
);

DROP POLICY IF EXISTS "shield_enrollments_insert" ON public.ssra_enrollments;
CREATE POLICY "shield_enrollments_insert" ON public.ssra_enrollments AS RESTRICTIVE
  FOR INSERT TO authenticated, anon WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "shield_enrollments_update" ON public.ssra_enrollments;
CREATE POLICY "shield_enrollments_update" ON public.ssra_enrollments AS RESTRICTIVE
  FOR UPDATE TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "shield_enrollments_delete" ON public.ssra_enrollments;
CREATE POLICY "shield_enrollments_delete" ON public.ssra_enrollments AS RESTRICTIVE
  FOR DELETE TO authenticated, anon USING (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "shield_session_tokens_insert" ON public.ssra_session_tokens;
CREATE POLICY "shield_session_tokens_insert" ON public.ssra_session_tokens AS RESTRICTIVE
  FOR INSERT TO authenticated, anon WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "shield_session_tokens_update" ON public.ssra_session_tokens;
CREATE POLICY "shield_session_tokens_update" ON public.ssra_session_tokens AS RESTRICTIVE
  FOR UPDATE TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "shield_session_tokens_delete" ON public.ssra_session_tokens;
CREATE POLICY "shield_session_tokens_delete" ON public.ssra_session_tokens AS RESTRICTIVE
  FOR DELETE TO authenticated, anon USING (public.is_ssra_admin(auth.uid()));

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','security_hardening_applied','rls','20260612250000',
  jsonb_build_object('changes', jsonb_build_array(
    'instructor_teaches_student requires e.status = active',
    'course_materials_read routed through is_instructor_for_course',
    'per-action write shields on ssra_enrollments + ssra_session_tokens')));

-- ── 260000: drop the over-broad FOR ALL shields ─────────────────────────────
DROP POLICY IF EXISTS "enrollments_no_client_writes"    ON public.ssra_enrollments;
DROP POLICY IF EXISTS "session_tokens_no_client_writes" ON public.ssra_session_tokens;

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','rls_overbroad_shields_dropped','rls','20260612260000',
  jsonb_build_object('dropped', jsonb_build_array(
    'enrollments_no_client_writes','session_tokens_no_client_writes'),
    'reason','FOR ALL RESTRICTIVE included SELECT and blocked student own-row reads. Per-action shields from 250000 remain in force.'));
