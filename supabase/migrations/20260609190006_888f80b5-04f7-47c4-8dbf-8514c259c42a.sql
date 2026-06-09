
-- Instructors can read enrollments for their assigned courses
CREATE POLICY "Instructor read assigned enrollments"
ON public.ssra_enrollments
FOR SELECT
TO authenticated
USING (public.is_instructor_for_course(auth.uid(), course_id));

-- Instructors can read profiles of students enrolled in their assigned courses
CREATE POLICY "Instructor read assigned students profiles"
ON public.ssra_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ssra_enrollments e
    JOIN public.ssra_instructor_assignments ia
      ON ia.course_id = e.course_id
    WHERE e.user_id = ssra_profiles.id
      AND ia.instructor_id = auth.uid()
  )
);
