REVOKE ALL ON public.ssra_session_tokens FROM anon;
REVOKE ALL ON public.ssra_session_tokens FROM authenticated;
REVOKE ALL ON public.ssra_session_tokens FROM PUBLIC;
GRANT ALL ON public.ssra_session_tokens TO service_role;