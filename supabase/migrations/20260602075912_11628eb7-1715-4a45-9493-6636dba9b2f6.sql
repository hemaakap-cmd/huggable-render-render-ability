
-- 1) Defensive: ensure students cannot insert/update/delete enrollments directly
DROP POLICY IF EXISTS "Users insert own enrollments" ON public.ssra_enrollments;
DROP POLICY IF EXISTS "Users update own enrollments" ON public.ssra_enrollments;
DROP POLICY IF EXISTS "Users delete own enrollments" ON public.ssra_enrollments;

-- 2) Revenue summary view (admin-only aggregation)
DROP VIEW IF EXISTS public.ssra_revenue_summary;

CREATE VIEW public.ssra_revenue_summary
WITH (security_invoker = true)
AS
SELECT
  to_char(date_trunc('month', e.enrolled_at), 'YYYY-MM') AS month,
  e.course_id,
  c.title AS course_title,
  count(*)::int        AS enrollments,
  coalesce(sum(e.amount_eur), 0)::numeric AS revenue_eur
FROM public.ssra_enrollments e
LEFT JOIN public.ssra_courses c ON c.id = e.course_id
WHERE e.status = 'active' AND e.enrolled_at IS NOT NULL
GROUP BY 1, 2, 3;

GRANT SELECT ON public.ssra_revenue_summary TO authenticated;
GRANT ALL    ON public.ssra_revenue_summary TO service_role;
