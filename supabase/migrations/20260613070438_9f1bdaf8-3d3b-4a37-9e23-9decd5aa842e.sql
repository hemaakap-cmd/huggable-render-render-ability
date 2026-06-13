
-- =========================================================================
-- H1 — ATTENDANCE WRITE INTEGRITY
-- =========================================================================
ALTER TABLE public.ssra_session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_attendance"      ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "student_view_own_attendance"  ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "instructor_view_attendance"   ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "manage_attendance"            ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_select_student"    ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_select_instructor" ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_select_admin"      ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_insert_staff"      ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_update_staff"      ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_delete_staff"      ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_shield_insert"     ON public.ssra_session_attendance;
DROP POLICY IF EXISTS "attendance_shield_update"     ON public.ssra_session_attendance;

CREATE POLICY "attendance_select_student" ON public.ssra_session_attendance
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "attendance_select_instructor" ON public.ssra_session_attendance
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_attendance.session_id
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  ));

CREATE POLICY "attendance_select_admin" ON public.ssra_session_attendance
  FOR SELECT TO authenticated USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "attendance_insert_staff" ON public.ssra_session_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_ssra_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.ssra_sessions s
                 WHERE s.id = ssra_session_attendance.session_id
                   AND public.is_instructor_for_course(auth.uid(), s.course_id))
    )
    AND EXISTS (
      SELECT 1
      FROM public.ssra_sessions s
      JOIN public.ssra_enrollments e
        ON e.course_id = s.course_id
       AND e.user_id   = ssra_session_attendance.user_id
       AND e.status    = 'active'
      WHERE s.id = ssra_session_attendance.session_id
    )
  );

CREATE POLICY "attendance_update_staff" ON public.ssra_session_attendance
  FOR UPDATE TO authenticated
  USING (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ssra_sessions s
               WHERE s.id = ssra_session_attendance.session_id
                 AND public.is_instructor_for_course(auth.uid(), s.course_id))
  )
  WITH CHECK (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ssra_sessions s
               WHERE s.id = ssra_session_attendance.session_id
                 AND public.is_instructor_for_course(auth.uid(), s.course_id))
  );

CREATE POLICY "attendance_delete_staff" ON public.ssra_session_attendance
  FOR DELETE TO authenticated
  USING (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ssra_sessions s
               WHERE s.id = ssra_session_attendance.session_id
                 AND public.is_instructor_for_course(auth.uid(), s.course_id))
  );

CREATE POLICY "attendance_shield_insert" ON public.ssra_session_attendance
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ssra_sessions s
               WHERE s.id = ssra_session_attendance.session_id
                 AND public.is_instructor_for_course(auth.uid(), s.course_id))
  );

CREATE POLICY "attendance_shield_update" ON public.ssra_session_attendance
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ssra_sessions s
               WHERE s.id = ssra_session_attendance.session_id
                 AND public.is_instructor_for_course(auth.uid(), s.course_id))
  );

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','attendance_write_integrity_applied','rls','20260613100000',
  jsonb_build_object('fix','H1',
    'detail','students can no longer INSERT attendance; writes limited to admin/assigned-instructor and bound to active enrollment'));

-- =========================================================================
-- M2 — FINANCIAL INFORMATION LEAK
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_lead_student_stats()
RETURNS TABLE (
  total_leads bigint, total_students bigint,
  new_leads_this_month bigint, new_students_this_month bigint,
  conversion_rate numeric, total_revenue_eur numeric, revenue_per_student numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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

-- =========================================================================
-- M3 — HOMEWORK SUBMISSION INTEGRITY
-- =========================================================================
DELETE FROM public.ssra_homework_submissions WHERE material_id IS NULL;

DO $$
DECLARE fk_name text;
BEGIN
  SELECT con.conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'ssra_homework_submissions'
    AND con.contype = 'f'
    AND con.conkey = (
      SELECT array_agg(attnum)
      FROM pg_attribute
      WHERE attrelid = rel.oid AND attname = 'material_id'
    );
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ssra_homework_submissions DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.ssra_homework_submissions
  ADD CONSTRAINT ssra_homework_submissions_material_id_fkey
  FOREIGN KEY (material_id) REFERENCES public.ssra_materials(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "homework_delete_own_or_staff" ON public.ssra_homework_submissions;
CREATE POLICY "homework_delete_own_or_staff" ON public.ssra_homework_submissions
  FOR DELETE TO authenticated
  USING (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), course_id)
    OR (user_id = auth.uid() AND status <> 'graded')
  );

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','homework_submission_integrity_applied','rls','20260613120000',
  jsonb_build_object('fix','M3',
    'detail','orphans purged; material_id FK -> ON DELETE CASCADE; DELETE policy added (owner-ungraded / staff)'));
