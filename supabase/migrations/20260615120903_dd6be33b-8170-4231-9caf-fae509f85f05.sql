CREATE POLICY "Public can read site-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Super admin can upload site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.is_ssra_super_admin(auth.uid()));

CREATE POLICY "Super admin can update site-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_ssra_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'site-assets' AND public.is_ssra_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete site-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_ssra_super_admin(auth.uid()));