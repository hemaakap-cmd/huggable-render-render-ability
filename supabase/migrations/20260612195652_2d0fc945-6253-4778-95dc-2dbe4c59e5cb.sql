
CREATE OR REPLACE FUNCTION public.instructor_teaches_student(_instructor_id uuid, _student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.ssra_enrollments e
    JOIN public.ssra_instructor_assignments ia
      ON ia.course_id = e.course_id AND ia.is_active = true
    WHERE e.user_id = _student_id
      AND e.status = 'active'
      AND ia.instructor_id = _instructor_id
  ) OR EXISTS (
    SELECT 1
    FROM public.ssra_enrollments e
    JOIN public.ssra_courses c ON c.id = e.course_id
    WHERE e.user_id = _student_id
      AND e.status = 'active'
      AND c.instructor_id = _instructor_id
  );
$function$;

DROP POLICY IF EXISTS "course_materials_read" ON storage.objects;
CREATE POLICY "course_materials_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[1])
    OR EXISTS (
      SELECT 1 FROM public.ssra_enrollments e
      WHERE e.user_id = auth.uid()
        AND e.course_id = (storage.foldername(name))[1]
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.ssra_subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.course_id = (storage.foldername(name))[1]
        AND s.status IN ('active','trialing')
    )
  )
);
