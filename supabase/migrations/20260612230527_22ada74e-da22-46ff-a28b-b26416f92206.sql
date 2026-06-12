
-- 1) Fix SECURITY DEFINER view: enforce security_invoker
ALTER VIEW public.ssra_student_enrollment_stats SET (security_invoker = true);

-- 2) Shield ssra_coupon_uses against non-service writes (defense-in-depth)
CREATE POLICY "coupon_uses_no_client_writes"
  ON public.ssra_coupon_uses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "coupon_uses_no_client_updates"
  ON public.ssra_coupon_uses
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "coupon_uses_no_client_deletes"
  ON public.ssra_coupon_uses
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- 3) Add UPDATE policy on storage.objects for course-materials bucket
--    Mirrors INSERT: admins + instructors of the course can replace files.
CREATE POLICY "course_materials_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (
      public.is_ssra_admin(auth.uid())
      OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[1])
    )
  )
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (
      public.is_ssra_admin(auth.uid())
      OR public.is_instructor_for_course(auth.uid(), (storage.foldername(name))[1])
    )
  );

-- 4) Lock role escalation: only super_admin may set role to admin/super_admin
CREATE POLICY "Only super admin can grant elevated roles"
  ON public.ssra_profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    role NOT IN ('admin','super_admin')
    OR public.is_ssra_super_admin(auth.uid())
  );
