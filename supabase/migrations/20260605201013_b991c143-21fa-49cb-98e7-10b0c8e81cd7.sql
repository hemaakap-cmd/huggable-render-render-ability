
-- 1. Hide stripe_price_id from anonymous catalog viewers
REVOKE SELECT (stripe_price_id) ON public.ssra_courses FROM anon;

-- 2. Explicit deny INSERT/UPDATE/DELETE on enrollments for authenticated + anon
--    (service_role bypasses RLS so edge functions / Stripe webhook still work)
CREATE POLICY "Deny direct enrollment writes" ON public.ssra_enrollments
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 3. Lock search_path on the only function still missing it
ALTER FUNCTION public.assign_waitlist_position() SET search_path = public;
