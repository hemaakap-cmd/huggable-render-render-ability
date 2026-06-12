-- ─────────────────────────────────────────────────────────────────────────────
-- ssra_student_enrollment_stats — server-side aggregation view
--
-- Problem: useAdminStudents and useAdminLeads in the frontend were fetching
-- the ENTIRE ssra_enrollments table into the browser to build Maps of per-user
-- counts. At 100 k students with multiple enrollments each this becomes a
-- multi-MB payload that blocks the JS thread and hammers Supabase bandwidth.
--
-- Fix: push the GROUP BY into the database. The hook now joins this view
-- instead of doing client-side aggregation.
--
-- Also creates ssra_lead_stats RPC to replace the parallel full-table reads
-- in useLeadStudentStats().
-- ─────────────────────────────────────────────────────────────────────────────

-- ── View: per-student enrollment summary ─────────────────────────────────────
CREATE OR REPLACE VIEW public.ssra_student_enrollment_stats AS
SELECT
  e.user_id,
  COUNT(*)                                                          AS total_enrollments,
  COUNT(*) FILTER (WHERE e.status = 'active')                      AS active_enrollments,
  COUNT(DISTINCT e.course_id)                                       AS unique_courses,
  array_agg(DISTINCT e.course_id)
    FILTER (WHERE e.course_id IS NOT NULL)                         AS course_ids,
  MIN(COALESCE(e.enrolled_at, e.created_at))                       AS first_enrolled_at
FROM public.ssra_enrollments e
GROUP BY e.user_id;

-- Grant read to authenticated role (RLS on the underlying table already
-- controls which rows are visible; views inherit those policies only when
-- SECURITY INVOKER is used — here we expose the aggregated summary to
-- authenticated admins via is_ssra_admin() check at the API layer).
GRANT SELECT ON public.ssra_student_enrollment_stats TO authenticated, service_role;

-- ── RPC: aggregate lead + student stats in one round-trip ────────────────────
CREATE OR REPLACE FUNCTION public.get_lead_student_stats()
RETURNS TABLE (
  total_leads              bigint,
  total_students           bigint,
  new_leads_this_month     bigint,
  new_students_this_month  bigint,
  conversion_rate          numeric,
  total_revenue_eur        numeric,
  revenue_per_student      numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    profiles AS (
      SELECT id, created_at FROM public.ssra_profiles WHERE role = 'student'
    ),
    enrollments AS (
      SELECT user_id, amount_eur, created_at, status FROM public.ssra_enrollments
    ),
    paying_users AS (
      SELECT DISTINCT user_id FROM enrollments
    ),
    month_start AS (
      SELECT date_trunc('month', now()) AS ts
    )
  SELECT
    -- leads = profiles with no enrollment
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS (
       SELECT 1 FROM paying_users pu WHERE pu.user_id = p.id
    ))::bigint                                                        AS total_leads,
    (SELECT COUNT(*) FROM paying_users)::bigint                       AS total_students,
    -- new leads this month
    (SELECT COUNT(*) FROM profiles p
       CROSS JOIN month_start ms
       WHERE p.created_at >= ms.ts
         AND NOT EXISTS (SELECT 1 FROM paying_users pu WHERE pu.user_id = p.id)
    )::bigint                                                         AS new_leads_this_month,
    -- new students this month (first enrollment)
    (SELECT COUNT(DISTINCT user_id) FROM enrollments e
       CROSS JOIN month_start ms
       WHERE e.created_at >= ms.ts
    )::bigint                                                         AS new_students_this_month,
    -- conversion rate (%)
    CASE WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 0
         ELSE ROUND(
           (SELECT COUNT(*) FROM paying_users)::numeric * 100 /
           (SELECT COUNT(*) FROM profiles)::numeric,
         2) END                                                        AS conversion_rate,
    -- revenue from active enrollments
    COALESCE((
      SELECT SUM(amount_eur) FROM enrollments WHERE status = 'active'
    ), 0)                                                             AS total_revenue_eur,
    -- revenue per student
    CASE WHEN (SELECT COUNT(*) FROM paying_users) = 0 THEN 0
         ELSE ROUND(
           COALESCE((SELECT SUM(amount_eur) FROM enrollments WHERE status='active'), 0) /
           (SELECT COUNT(*) FROM paying_users)::numeric,
         2) END                                                        AS revenue_per_student;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_student_stats() TO authenticated, service_role;

-- ── Comment: index that makes the view fast ──────────────────────────────────
-- The existing ssra_enrollments table should already have:
--   idx on (user_id) and (course_id, status)
-- If not, add:
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status
  ON public.ssra_enrollments (user_id, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status
  ON public.ssra_enrollments (course_id, status);
