
REVOKE EXECUTE ON FUNCTION public.validate_ssra_course_publishable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ssra_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_ssra_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ssra_course_publishable() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_ssra_order_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_ssra_order_number() TO service_role;
