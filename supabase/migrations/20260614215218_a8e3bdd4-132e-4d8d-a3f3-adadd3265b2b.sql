
-- 1. Hide internal Stripe price IDs from public catalog reads.
REVOKE SELECT (stripe_price_id) ON public.ssra_courses FROM anon, authenticated;

-- 2. Tighten instructor homework storage DELETE policy: rely on the
--    ssra_homework_submissions row join for authorization instead of the
--    foldername[2] heuristic that could be spoofed by crafted object names.
DROP POLICY IF EXISTS "Instructors delete assigned course homework" ON storage.objects;
CREATE POLICY "Instructors delete assigned course homework"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'homework-submissions'
  AND EXISTS (
    SELECT 1
    FROM public.ssra_homework_submissions s
    WHERE s.storage_path = objects.name
      AND public.is_instructor_for_course(auth.uid(), s.course_id)
  )
);

-- 3. Allow instructors to read profile rows for students they teach so
--    grading/attendance views can show student names and emails.
CREATE POLICY "Instructors read their students' profiles"
ON public.ssra_profiles
FOR SELECT
TO authenticated
USING (
  public.is_ssra_instructor(auth.uid())
  AND public.instructor_teaches_student(auth.uid(), id)
);
