
DROP POLICY IF EXISTS "enrollments_no_client_writes" ON public.ssra_enrollments;
CREATE POLICY "enrollments_no_client_writes"
ON public.ssra_enrollments
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (public.is_ssra_admin(auth.uid()))
WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "session_tokens_no_client_writes" ON public.ssra_session_tokens;
CREATE POLICY "session_tokens_no_client_writes"
ON public.ssra_session_tokens
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
