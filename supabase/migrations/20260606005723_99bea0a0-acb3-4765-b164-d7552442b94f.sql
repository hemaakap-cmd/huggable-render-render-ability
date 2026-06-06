
-- 1) ssra_coupon_uses: drop user read access, keep admin-only
DROP POLICY IF EXISTS "Own coupon uses read" ON public.ssra_coupon_uses;

-- 2) ssra_session_access_log: tighten insert policy
DROP POLICY IF EXISTS "Own session access insert" ON public.ssra_session_access_log;

CREATE POLICY "Own session access insert"
ON public.ssra_session_access_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND session_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.ssra_sessions s
    WHERE s.id = ssra_session_access_log.session_id
      AND (
        EXISTS (
          SELECT 1 FROM public.ssra_enrollments e
          WHERE e.user_id = auth.uid()
            AND e.course_id = s.course_id
            AND e.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.ssra_subscriptions sub
          WHERE sub.user_id = auth.uid()
            AND sub.course_id = s.course_id
            AND sub.status IN ('active','trialing')
        )
      )
  )
);

-- 3) storage.objects: remove broad public listing on ssra-course-images,
--    keep public read of individual objects (no enumeration)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual ILIKE '%ssra-course-images%' OR with_check ILIKE '%ssra-course-images%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "ssra_course_images_public_read_object"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ssra-course-images' AND name IS NOT NULL);

CREATE POLICY "ssra_course_images_admin_write"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'ssra-course-images' AND public.is_ssra_admin(auth.uid()))
WITH CHECK (bucket_id = 'ssra-course-images' AND public.is_ssra_admin(auth.uid()));
