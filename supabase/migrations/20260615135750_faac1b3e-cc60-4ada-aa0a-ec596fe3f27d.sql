
-- 1) Remove broad authenticated SELECT on ssra_profiles for public team rows.
DROP POLICY IF EXISTS "Authenticated can read public team rows" ON public.ssra_profiles;

-- 2) Lock down ssra_site_settings: only super admin can read.
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.ssra_site_settings;
CREATE POLICY "Super admin can read site settings"
  ON public.ssra_site_settings FOR SELECT
  TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()));
REVOKE SELECT ON public.ssra_site_settings FROM anon;

-- 3) Restrict student access to zoom broadcasts to recent scheduled ones.
DROP POLICY IF EXISTS "Students read broadcasts they received" ON public.ssra_zoom_broadcasts;
CREATE POLICY "Students read broadcasts they received"
  ON public.ssra_zoom_broadcasts FOR SELECT
  TO authenticated
  USING (
    scheduled_at > now() - interval '1 day'
    AND scheduled_at < now() + interval '30 days'
    AND EXISTS (
      SELECT 1 FROM public.ssra_zoom_broadcast_recipients r
      WHERE r.broadcast_id = ssra_zoom_broadcasts.id
        AND r.user_id = auth.uid()
    )
  );
