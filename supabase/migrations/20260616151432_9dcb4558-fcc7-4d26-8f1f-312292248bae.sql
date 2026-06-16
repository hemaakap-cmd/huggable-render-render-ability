
-- 1. Extend broadcasts
ALTER TABLE public.ssra_zoom_broadcasts
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'all_students',
  ADD COLUMN IF NOT EXISTS audience_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS opened_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joined_count int NOT NULL DEFAULT 0;

-- Backfill audience_type from legacy audience column
UPDATE public.ssra_zoom_broadcasts
   SET audience_type = audience
 WHERE audience_type = 'all_students' AND audience IS NOT NULL AND audience <> 'all_students';

-- 2. Extend recipients
ALTER TABLE public.ssra_zoom_broadcast_recipients
  ADD COLUMN IF NOT EXISTS email_opened boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS joined_session boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_zoom_recipients_user ON public.ssra_zoom_broadcast_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_recipients_token ON public.ssra_zoom_broadcast_recipients(unsubscribe_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_zoom_recipients_broadcast_user
  ON public.ssra_zoom_broadcast_recipients(broadcast_id, user_id)
  WHERE user_id IS NOT NULL;

-- 3. Resolve audience function (admin-only)
CREATE OR REPLACE FUNCTION public.resolve_broadcast_audience(
  _audience_type text,
  _filters jsonb DEFAULT '{}'::jsonb,
  _exclude_prior boolean DEFAULT false
)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id text := _filters->>'course_id';
  v_batch_id  uuid := NULLIF(_filters->>'batch_id','')::uuid;
  v_date      timestamptz := NULLIF(_filters->>'date','')::timestamptz;
  v_prior_id  uuid := NULLIF(_filters->>'prior_broadcast_id','')::uuid;
  v_emails    text[] := COALESCE(
    (SELECT array_agg(lower(trim(x))) FROM jsonb_array_elements_text(COALESCE(_filters->'emails','[]'::jsonb)) x),
    ARRAY[]::text[]
  );
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT p.id, p.email, p.full_name, p.created_at
      FROM public.ssra_profiles p
     WHERE p.role = 'student'
       AND p.email IS NOT NULL
       AND p.email <> ''
  ),
  filtered AS (
    SELECT b.id, b.email, b.full_name
      FROM base b
     WHERE
       CASE _audience_type
         WHEN 'all_students' THEN TRUE

         WHEN 'enrolled_after' THEN EXISTS (
           SELECT 1 FROM public.ssra_enrollments e
            WHERE e.user_id = b.id
              AND e.status = 'active'
              AND COALESCE(e.enrolled_at, e.created_at) >= COALESCE(v_date, '-infinity'::timestamptz)
         )

         WHEN 'enrolled_before' THEN EXISTS (
           SELECT 1 FROM public.ssra_enrollments e
            WHERE e.user_id = b.id
              AND e.status = 'active'
              AND COALESCE(e.enrolled_at, e.created_at) <  COALESCE(v_date, 'infinity'::timestamptz)
         )

         WHEN 'course' THEN EXISTS (
           SELECT 1 FROM public.ssra_enrollments e
            WHERE e.user_id = b.id
              AND e.status = 'active'
              AND e.course_id = v_course_id
         )

         WHEN 'cohort' THEN EXISTS (
           SELECT 1 FROM public.ssra_enrollments e
            WHERE e.user_id = b.id
              AND e.status = 'active'
              AND e.batch_id = v_batch_id
         )

         WHEN 'active_subscribers' THEN EXISTS (
           SELECT 1 FROM public.ssra_subscriptions s
            WHERE s.user_id = b.id
              AND s.status IN ('active','trialing','past_due')
         )

         WHEN 'custom' THEN lower(b.email) = ANY (v_emails)

         WHEN 'not_previously_invited' THEN NOT EXISTS (
           SELECT 1 FROM public.ssra_zoom_broadcast_recipients r
            WHERE r.user_id = b.id
         )

         WHEN 'unattended_previous' THEN EXISTS (
           SELECT 1 FROM public.ssra_zoom_broadcast_recipients r
            WHERE r.user_id = b.id
              AND (v_prior_id IS NULL OR r.broadcast_id = v_prior_id)
              AND r.joined_session = false
         )

         ELSE FALSE
       END
  )
  SELECT f.id, f.email, f.full_name
    FROM filtered f
   WHERE NOT _exclude_prior
      OR NOT EXISTS (
        SELECT 1 FROM public.ssra_zoom_broadcast_recipients r
         WHERE r.user_id = f.id
      );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_broadcast_audience(text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_broadcast_audience(text, jsonb, boolean) TO authenticated, service_role;

-- 4. Student broadcast history
CREATE OR REPLACE FUNCTION public.get_student_broadcast_history(_user_id uuid)
RETURNS TABLE(
  broadcast_id uuid,
  title text,
  scheduled_at timestamptz,
  duration_minutes int,
  status text,
  email_opened boolean,
  joined_session boolean,
  sent_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> _user_id AND NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT b.id, b.title, b.scheduled_at, b.duration_minutes,
         r.status, r.email_opened, r.joined_session, r.sent_at
    FROM public.ssra_zoom_broadcast_recipients r
    JOIN public.ssra_zoom_broadcasts b ON b.id = r.broadcast_id
   WHERE r.user_id = _user_id
   ORDER BY b.scheduled_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_broadcast_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_broadcast_history(uuid) TO authenticated, service_role;
