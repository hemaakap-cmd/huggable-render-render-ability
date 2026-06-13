
-- Fix: residual attendance integrity defect.
-- The permissive "Instructor mark assigned attendance" policy allowed instructors
-- to insert attendance rows without verifying the target user has an active
-- enrollment in the session's course. Permissive policies are OR'd, so this
-- bypassed the enrollment-validating "attendance_insert_staff" policy.
--
-- Fix: drop the bypass permissive policy and move enrollment validation into
-- the RESTRICTIVE shield itself, so no future permissive policy can bypass it.

DROP POLICY IF EXISTS "Instructor mark assigned attendance" ON public.ssra_session_attendance;

-- Strengthen INSERT shield: require active enrollment matching session course + row user
DROP POLICY IF EXISTS attendance_shield_insert ON public.ssra_session_attendance;
CREATE POLICY attendance_shield_insert
ON public.ssra_session_attendance
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ssra_sessions s
      WHERE s.id = ssra_session_attendance.session_id
        AND public.is_instructor_for_course(auth.uid(), s.course_id)
    )
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

-- Strengthen UPDATE shield similarly (cannot move a row to a non-enrolled user)
DROP POLICY IF EXISTS attendance_shield_update ON public.ssra_session_attendance;
CREATE POLICY attendance_shield_update
ON public.ssra_session_attendance
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (
  public.is_ssra_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_attendance.session_id
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  )
)
WITH CHECK (
  (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ssra_sessions s
      WHERE s.id = ssra_session_attendance.session_id
        AND public.is_instructor_for_course(auth.uid(), s.course_id)
    )
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
