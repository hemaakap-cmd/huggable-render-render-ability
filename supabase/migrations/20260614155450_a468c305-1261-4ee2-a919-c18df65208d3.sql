DROP POLICY IF EXISTS "Admin read webhook events" ON public.ssra_webhook_events;
CREATE POLICY "Super admin read webhook events" ON public.ssra_webhook_events
  FOR SELECT USING (public.is_ssra_super_admin(auth.uid()));