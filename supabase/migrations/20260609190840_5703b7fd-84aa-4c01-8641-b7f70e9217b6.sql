-- Fix infinite RLS recursion between ssra_profiles and ssra_instructor_assignments

-- 1) Replace assignments policies that query ssra_profiles directly with security-definer helper
DROP POLICY IF EXISTS "Admins manage assignments" ON public.ssra_instructor_assignments;
DROP POLICY IF EXISTS "Admins view all assignments" ON public.ssra_instructor_assignments;

CREATE POLICY "Admins manage assignments"
  ON public.ssra_instructor_assignments
  FOR ALL
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

-- 2) Replace the instructor->student-profiles policy with a security-definer function
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
      AND ia.instructor_id = _instructor_id
  ) OR EXISTS (
    SELECT 1
    FROM public.ssra_enrollments e
    JOIN public.ssra_courses c ON c.id = e.course_id
    WHERE e.user_id = _student_id
      AND c.instructor_id = _instructor_id
  );
$$;

DROP POLICY IF EXISTS "Instructor read assigned students profiles" ON public.ssra_profiles;
CREATE POLICY "Instructor read assigned students profiles"
  ON public.ssra_profiles
  FOR SELECT
  USING (public.instructor_teaches_student(auth.uid(), id));