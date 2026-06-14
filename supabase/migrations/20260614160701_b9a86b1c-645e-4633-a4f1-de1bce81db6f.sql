DROP POLICY IF EXISTS "Students read own homework" ON storage.objects;
CREATE POLICY "Students read own homework" ON storage.objects
FOR SELECT USING (
  bucket_id = 'homework-submissions'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR is_ssra_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ssra_homework_submissions s
      WHERE s.storage_path = objects.name
        AND is_instructor_for_course(auth.uid(), s.course_id)
    )
  )
);

DROP POLICY IF EXISTS "Instructors delete assigned course homework" ON storage.objects;
CREATE POLICY "Instructors delete assigned course homework" ON storage.objects
FOR DELETE USING (
  bucket_id = 'homework-submissions'
  AND is_instructor_for_course(auth.uid(), (storage.foldername(name))[2])
  AND EXISTS (
    SELECT 1 FROM public.ssra_homework_submissions s
    WHERE s.storage_path = objects.name
      AND s.course_id = (storage.foldername(objects.name))[2]
  )
);