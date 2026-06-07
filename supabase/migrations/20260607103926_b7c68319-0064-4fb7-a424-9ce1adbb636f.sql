CREATE POLICY "Service role inserts audit log"
ON public.ssra_audit_log
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');