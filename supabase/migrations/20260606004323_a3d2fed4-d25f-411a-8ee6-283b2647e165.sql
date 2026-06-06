-- Explicit public-read policy for the ssra-course-images bucket so access
-- doesn't silently break if the bucket public flag is ever toggled.
DROP POLICY IF EXISTS "Public read ssra-course-images" ON storage.objects;
CREATE POLICY "Public read ssra-course-images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'ssra-course-images');

-- Defense-in-depth: prevent any user from changing their own role on
-- ssra_profiles, regardless of what permissive policies exist now or later.
DROP POLICY IF EXISTS "Prevent self role escalation" ON public.ssra_profiles;
CREATE POLICY "Prevent self role escalation"
  ON public.ssra_profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    auth.uid() <> id
    OR role = public.get_ssra_role(auth.uid())
  );