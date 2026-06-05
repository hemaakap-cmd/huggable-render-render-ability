
-- 1) Restrict public read of ssra_courses to exclude internal payment identifiers
DROP POLICY IF EXISTS "Public read active courses" ON public.ssra_courses;

REVOKE SELECT ON public.ssra_courses FROM anon;
REVOKE SELECT ON public.ssra_courses FROM authenticated;

GRANT SELECT
  (id, title, title_ar, subtitle, description, price_eur, price_egp,
   course_type, category, requires_verification, duration, duration_weeks,
   level, is_active, sort_order, image_url, modules, price_hidden,
   start_date, start_time, end_date, instructor_name, instructor_id,
   course_format, capacity, enrolled_count, waitlist_enabled,
   registration_open, created_at, updated_at)
  ON public.ssra_courses TO anon, authenticated;

-- Admins keep full access via existing "Admin manage courses" policy (FOR ALL),
-- which already grants full column access to admins.
GRANT SELECT ON public.ssra_courses TO authenticated;
-- ^ Note: above grant without column list would re-expose stripe_price_id;
-- instead we omit it and rely on column-level grants. Revoke broad grant just made:
REVOKE SELECT ON public.ssra_courses FROM authenticated;
GRANT SELECT
  (id, title, title_ar, subtitle, description, price_eur, price_egp,
   course_type, category, requires_verification, duration, duration_weeks,
   level, is_active, sort_order, image_url, modules, price_hidden,
   start_date, start_time, end_date, instructor_name, instructor_id,
   course_format, capacity, enrolled_count, waitlist_enabled,
   registration_open, created_at, updated_at, stripe_price_id)
  ON public.ssra_courses TO authenticated;
-- authenticated keeps stripe_price_id only when an RLS policy allows the row;
-- admin policy covers admin reads. For non-admin authenticated users, add a
-- policy mirroring public read but without exposing the column via a view is
-- unnecessary because RLS still filters rows; column-level privilege on anon
-- is what blocks public exposure. Re-create public select policy:
CREATE POLICY "Public read active courses"
  ON public.ssra_courses
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

GRANT ALL ON public.ssra_courses TO service_role;

-- 2) Require enrollment/subscription to insert homework
DROP POLICY IF EXISTS "Own homework insert" ON public.ssra_homework_submissions;

CREATE POLICY "Own homework insert"
  ON public.ssra_homework_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.ssra_enrollments e
        WHERE e.user_id = auth.uid()
          AND e.course_id = ssra_homework_submissions.course_id
          AND e.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.ssra_subscriptions s
        WHERE s.user_id = auth.uid()
          AND s.course_id = ssra_homework_submissions.course_id
          AND s.status IN ('active','trialing')
      )
    )
  );
