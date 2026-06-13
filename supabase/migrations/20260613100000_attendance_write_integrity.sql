-- H1 — ATTENDANCE WRITE INTEGRITY
-- Live authenticated audit (2026-06-13) PROVED a student could INSERT their own
-- ssra_session_attendance row (self-mark present). Attendance feeds
-- attendance_pct in reports and certificate eligibility, so self-inflation
-- corrupts both. The live policies had diverged from the repo, so we DROP every
-- known policy and rebuild a correct, defense-in-depth set:
--   * writes (INSERT/UPDATE/DELETE) only by admins or the session-course's
--     assigned instructor;
--   * every inserted row bound to an ACTIVE enrollment in the session's course;
--   * a RESTRICTIVE per-command shield so a student can never write even if a
--     future permissive policy is added (per-command, never FOR ALL, so reads
--     are unaffected — see scripts/check-migrations.mjs).

ALTER TABLE public.ssra_session_attendance ENABLE ROW LEVEL SECURITY;

-- Clear whatever is currently live (names from repo history + likely variants).
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

-- ── SELECT: student sees own, instructor sees assigned-course, admin sees all ─
CREATE POLICY "attendance_select_student" ON public.ssra_session_attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "attendance_select_instructor" ON public.ssra_session_attendance
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_attendance.session_id
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  ));

CREATE POLICY "attendance_select_admin" ON public.ssra_session_attendance
  FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

-- ── INSERT: only admin / assigned instructor, AND target user actively enrolled
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

-- ── UPDATE / DELETE: only admin / assigned instructor ───────────────────────
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

-- ── RESTRICTIVE shields (defense in depth, per-command) ─────────────────────
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
