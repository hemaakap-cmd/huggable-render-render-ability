-- Restore SELECT access to ssra_courses for authenticated and anon users on all
-- non-sensitive columns. The previous security migration revoked all SELECT but
-- the column-level re-grant did not persist, breaking dashboard queries like
-- ssra_enrollments(*, ssra_courses(*)) which now return no data.
-- stripe_price_id remains excluded (admin/service_role only).

GRANT SELECT (
  id, title, title_ar, subtitle, description, price_eur, course_type, category,
  requires_verification, duration_weeks, level, is_active, sort_order, image_url,
  price_egp, modules, created_at, updated_at, price_hidden, start_date, start_time,
  duration, end_date, instructor_name, course_format, capacity, enrolled_count,
  waitlist_enabled, registration_open, instructor_id, is_subscription
) ON public.ssra_courses TO authenticated;

GRANT SELECT (
  id, title, title_ar, subtitle, description, price_eur, course_type, category,
  requires_verification, duration_weeks, level, is_active, sort_order, image_url,
  price_egp, modules, created_at, updated_at, price_hidden, start_date, start_time,
  duration, end_date, instructor_name, course_format, capacity, enrolled_count,
  waitlist_enabled, registration_open, instructor_id, is_subscription
) ON public.ssra_courses TO anon;

GRANT ALL ON public.ssra_courses TO service_role;