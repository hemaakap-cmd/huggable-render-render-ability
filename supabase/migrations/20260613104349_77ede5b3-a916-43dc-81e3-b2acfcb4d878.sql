
-- Allow enrolled students to read their batch row
CREATE POLICY "Enrolled students read their batch"
ON public.ssra_batches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ssra_enrollments e
    WHERE e.batch_id = ssra_batches.id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
  )
);

-- Tighten instructor delete on homework storage: require existing submission row
DROP POLICY IF EXISTS "Instructors delete assigned course homework" ON storage.objects;
CREATE POLICY "Instructors delete assigned course homework"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'homework-submissions'
  AND public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[2])
  AND EXISTS (
    SELECT 1 FROM public.ssra_homework_submissions s
    WHERE s.file_url LIKE '%' || storage.objects.name
      AND s.course_id = (storage.foldername(storage.objects.name))[2]
  )
);
