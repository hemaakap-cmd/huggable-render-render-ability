-- M2 — FINANCIAL INFORMATION LEAK
-- Live audit (2026-06-13) PROVED get_lead_student_stats() returns revenue,
-- conversion rate and student counts to ANY caller holding the public anon key
-- (it is SECURITY DEFINER with no caller-auth check, and EXECUTE was granted to
-- anon). Add an internal admin gate AND revoke anon execution. Signature is
-- preserved so the admin dashboard keeps working unchanged.

CREATE OR REPLACE FUNCTION public.get_lead_student_stats()
RETURNS TABLE (
  total_leads bigint, total_students bigint,
  new_leads_this_month bigint, new_students_this_month bigint,
  conversion_rate numeric, total_revenue_eur numeric, revenue_per_student numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Financial metrics are admin-only. Anonymous and non-admin callers denied.
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_lead_student_stats() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_lead_student_stats() TO authenticated, service_role;

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','financial_leak_closed','rpc','get_lead_student_stats',
  jsonb_build_object('fix','M2','detail','admin gate added + EXECUTE revoked from anon/PUBLIC'));
