
CREATE POLICY "Instructors delete assigned course homework"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'homework-submissions'
  AND public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[2])
);
