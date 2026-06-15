-- Hide stripe_price_id column from public/auth roles via column-level grants.
-- Only service_role (used by edge functions) needs it.
REVOKE SELECT ON public.ssra_courses FROM anon, authenticated;

-- Re-grant column-level SELECT on every non-sensitive column.
GRANT SELECT (
  id, title, title_ar, subtitle, description, price_eur, course_type, category,
  requires_verification, duration_weeks, level, is_active, sort_order, image_url,
  price_egp, modules, created_at, updated_at, price_hidden, start_date, start_time,
  duration, end_date, instructor_name, course_format, capacity, enrolled_count,
  waitlist_enabled, registration_open, instructor_id, is_subscription
) ON public.ssra_courses TO anon, authenticated;

-- Admins (service role bypasses RLS) keep full access for back-office UI via edge functions.
GRANT ALL ON public.ssra_courses TO service_role;