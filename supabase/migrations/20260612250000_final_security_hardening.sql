-- ─────────────────────────────────────────────────────────────────────────────
-- FINAL SECURITY HARDENING (pre-launch pass)
--
-- Security-only changes. No business, payment, enrollment or RBAC behaviour
-- changes: all legitimate writes to the protected tables flow through
-- service-role edge functions, SECURITY DEFINER triggers and RPCs, which
-- bypass RLS — verified by grep: zero client-side writes to ssra_enrollments
-- or ssra_session_tokens anywhere in src/.
--
--   1. instructor_teaches_student(): instructors only "teach" students with
--      an ACTIVE enrollment. Cancelled/refunded/pending students disappear
--      from instructor visibility (profiles, attendance, homework joins).
--   2. course_materials_read (storage.objects): the instructor branch used
--      c.instructor_id directly, so instructors assigned via
--      ssra_instructor_assignments (the normal path) could NOT read material
--      files, and authorization logic was duplicated. Now routed through the
--      centralized is_instructor_for_course() helper.
--   3. Defense in depth: RESTRICTIVE write shields on ssra_enrollments and
--      ssra_session_tokens. RESTRICTIVE policies AND with every permissive
--      policy, so regardless of what the 85-migration history left behind
--      (the "Deny direct enrollment writes" policy was dropped in
--      20260607205412), client roles can no longer insert/update/delete
--      except through is_ssra_admin(). service_role is unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════
-- 1. instructor_teaches_student — ACTIVE enrollments only
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.instructor_teaches_student(_instructor_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ssra_enrollments e
    JOIN public.ssra_instructor_assignments ia
      ON ia.course_id = e.course_id AND ia.is_active = true
    WHERE e.user_id = _student_id
      AND e.status = 'active'
      AND ia.instructor_id = _instructor_id
  ) OR EXISTS (
    SELECT 1
    FROM public.ssra_enrollments e
    JOIN public.ssra_courses c ON c.id = e.course_id
    WHERE e.user_id = _student_id
      AND e.status = 'active'
      AND c.instructor_id = _instructor_id
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. course_materials_read — centralize instructor auth on the helper
-- ══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "course_materials_read" ON storage.objects;
CREATE POLICY "course_materials_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (
      public.is_ssra_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.ssra_materials m
        WHERE m.storage_path = storage.objects.name
          AND m.is_visible = TRUE
          AND (
            public.is_instructor_for_course(auth.uid(), m.course_id)
            OR EXISTS (SELECT 1 FROM public.ssra_enrollments e
                       WHERE e.user_id = auth.uid() AND e.course_id = m.course_id AND e.status = 'active')
            OR EXISTS (SELECT 1 FROM public.ssra_subscriptions s
                       WHERE s.user_id = auth.uid() AND s.course_id = m.course_id
                         AND s.status IN ('active','trialing'))
          )
      )
    )
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 3. Defense in depth — RESTRICTIVE write shields
--
-- AS RESTRICTIVE means these AND with all permissive policies: they can only
-- narrow access, never widen it. service_role bypasses RLS entirely, so the
-- payment webhook, reserve_pending_enrollment(), reconcile_system(), the
-- session-token mint in get-session-access and every trigger keep working
-- exactly as before. Admin client paths remain possible IF an existing
-- permissive policy also allows them (RBAC behaviour unchanged).
-- ══════════════════════════════════════════════════════════════════════════

-- ── ssra_enrollments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "shield_enrollments_insert" ON public.ssra_enrollments;
CREATE POLICY "shield_enrollments_insert"
  ON public.ssra_enrollments AS RESTRICTIVE
  FOR INSERT TO authenticated, anon
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "shield_enrollments_update" ON public.ssra_enrollments;
CREATE POLICY "shield_enrollments_update"
  ON public.ssra_enrollments AS RESTRICTIVE
  FOR UPDATE TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "shield_enrollments_delete" ON public.ssra_enrollments;
CREATE POLICY "shield_enrollments_delete"
  ON public.ssra_enrollments AS RESTRICTIVE
  FOR DELETE TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid()));

-- ── ssra_session_tokens ──────────────────────────────────────────────────────
-- Tokens are minted exclusively by the get-session-access edge function
-- (service role). No client role should ever write one.
DROP POLICY IF EXISTS "shield_session_tokens_insert" ON public.ssra_session_tokens;
CREATE POLICY "shield_session_tokens_insert"
  ON public.ssra_session_tokens AS RESTRICTIVE
  FOR INSERT TO authenticated, anon
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "shield_session_tokens_update" ON public.ssra_session_tokens;
CREATE POLICY "shield_session_tokens_update"
  ON public.ssra_session_tokens AS RESTRICTIVE
  FOR UPDATE TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "shield_session_tokens_delete" ON public.ssra_session_tokens;
CREATE POLICY "shield_session_tokens_delete"
  ON public.ssra_session_tokens AS RESTRICTIVE
  FOR DELETE TO authenticated, anon
  USING (public.is_ssra_admin(auth.uid()));

-- ── Audit trail for the hardening itself ─────────────────────────────────────
INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES (
  'system-migration', 'system',
  'security_hardening_applied', 'rls', '20260612250000',
  jsonb_build_object(
    'changes', jsonb_build_array(
      'instructor_teaches_student requires e.status = active',
      'course_materials_read routed through is_instructor_for_course',
      'restrictive write shields on ssra_enrollments + ssra_session_tokens'
    )
  )
);
