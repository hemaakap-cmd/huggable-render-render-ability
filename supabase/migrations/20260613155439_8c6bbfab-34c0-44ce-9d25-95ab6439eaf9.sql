
-- 1) Remove instructor direct SELECT on ssra_enrollments.
-- Instructors must use get_instructor_course_students RPC which returns no PII.
DROP POLICY IF EXISTS "Instructor read assigned enrollments" ON public.ssra_enrollments;

-- 2) Tighten homework storage read: require a matching submission row that
--    links this object to a real student in the instructor's course.
DROP POLICY IF EXISTS "Students read own homework" ON storage.objects;
CREATE POLICY "Students read own homework" ON storage.objects
FOR SELECT USING (
  bucket_id = 'homework-submissions'
  AND (
    -- Owner of the file (path prefix = uploader user id)
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_ssra_admin(auth.uid())
    OR (
      -- Instructor: must have an actual submission row tying this object
      -- to a course they teach.
      EXISTS (
        SELECT 1
          FROM public.ssra_homework_submissions s
         WHERE (s.storage_path = objects.name OR s.file_url LIKE '%' || objects.name)
           AND public.is_instructor_for_course(auth.uid(), s.course_id)
      )
    )
  )
);
