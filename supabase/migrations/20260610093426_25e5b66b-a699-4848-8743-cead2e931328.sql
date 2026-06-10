
-- 1) Drop sensitive tables from realtime publication (no frontend uses these channels)
ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_enrollments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_homework_submissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_cancellation_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_certificates;
ALTER PUBLICATION supabase_realtime DROP TABLE public.ssra_instructor_assignments;

-- 2) Replace course_materials_write to remove chicken-and-egg dependency on ssra_materials row
DROP POLICY IF EXISTS course_materials_write ON storage.objects;
CREATE POLICY course_materials_write ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[1])
  )
);

-- Also tighten the delete policy so it doesn't require the metadata row to still exist
DROP POLICY IF EXISTS course_materials_delete ON storage.objects;
CREATE POLICY course_materials_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[1])
  )
);
