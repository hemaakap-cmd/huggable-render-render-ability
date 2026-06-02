
-- 1. Fix search_path on SECURITY DEFINER functions missing it
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 2. Revoke EXECUTE from anon/public on SECURITY DEFINER functions (keep authenticated/service_role)
REVOKE EXECUTE ON FUNCTION public.is_ssra_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_ssra_super_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_ssra_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.is_ssra_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ssra_super_admin(uuid) TO authenticated;

-- 3. Storage: remove broad SELECT on public bucket to block listing (public URLs still work)
DROP POLICY IF EXISTS "Public read course images" ON storage.objects;

-- 4. auth_otp_aliases: lock down with service_role-only policy
ALTER TABLE public.auth_otp_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages otp aliases" ON public.auth_otp_aliases;
CREATE POLICY "Service role manages otp aliases"
  ON public.auth_otp_aliases
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
