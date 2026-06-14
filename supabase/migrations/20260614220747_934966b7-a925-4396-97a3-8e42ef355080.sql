
-- 1) Zoom broadcasts: restrict read to super_admins only
DROP POLICY IF EXISTS "Admins read zoom broadcasts" ON public.ssra_zoom_broadcasts;
CREATE POLICY "Super admins read zoom broadcasts"
  ON public.ssra_zoom_broadcasts
  FOR SELECT
  TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()));

-- 2) Notifications: scope SELECT policy to authenticated role only
DROP POLICY IF EXISTS "Own notifications read" ON public.ssra_notifications;
CREATE POLICY "Own notifications read"
  ON public.ssra_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
