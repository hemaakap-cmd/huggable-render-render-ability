
ALTER FUNCTION public.generate_ssra_cert_code() SET search_path = public;
ALTER FUNCTION public.set_ssra_cert_code() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.generate_ssra_cert_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_ssra_cert_code() FROM PUBLIC, anon, authenticated;
