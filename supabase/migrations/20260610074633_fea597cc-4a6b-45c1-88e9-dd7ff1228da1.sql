
-- Add storage_path column to homework submissions
ALTER TABLE public.ssra_homework_submissions
  ADD COLUMN IF NOT EXISTS storage_path text;

-- Storage RLS policies on homework-submissions bucket
-- Path convention: {user_id}/{course_id}/{material_id}/{uuid}-{filename}

-- Students manage their own files
CREATE POLICY "Students upload own homework"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students read own homework"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[2])
  )
);

CREATE POLICY "Students update own homework"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'homework-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'homework-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students delete own homework"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework-submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_ssra_admin(auth.uid())
  )
);
