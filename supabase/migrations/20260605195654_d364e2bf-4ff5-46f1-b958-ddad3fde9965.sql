
-- Revoke default PUBLIC execute on all SECURITY DEFINER functions, then grant precisely

-- Email queue: service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Trigger-only functions: revoke from clients (triggers run regardless of grants)
REVOKE EXECUTE ON FUNCTION public.handle_new_ssra_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_ssra_cert_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_ssra_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ssra_course_publishable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_course_enrolled_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_waitlist_position() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ssra_cert_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ssra_order_number() FROM PUBLIC, anon, authenticated;

-- RLS helpers: revoke from anon (anon never triggers admin/instructor checks)
REVOKE EXECUTE ON FUNCTION public.is_ssra_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ssra_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ssra_instructor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ssra_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ssra_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ssra_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ssra_instructor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ssra_role(uuid) TO authenticated;

-- Live visitor stats: admin-only (wrap with admin check)
CREATE OR REPLACE FUNCTION public.get_live_visitor_stats(_window_minutes integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'active_now', (
        SELECT COUNT(*) FROM public.site_visitor_sessions
        WHERE last_seen_at > now() - make_interval(mins => _window_minutes)
      ),
      'today_total', (
        SELECT COUNT(DISTINCT session_id) FROM public.site_visitor_sessions
        WHERE first_seen_at >= date_trunc('day', now())
      ),
      'by_country', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (
          SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS cnt
          FROM public.site_visitor_sessions
          WHERE last_seen_at > now() - make_interval(mins => _window_minutes)
          GROUP BY 1
        ) c
      ),
      'by_page', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('path', path, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (
          SELECT path, COUNT(*) AS cnt
          FROM public.site_visitor_sessions
          WHERE last_seen_at > now() - make_interval(mins => _window_minutes)
          GROUP BY 1
        ) p
      )
    )
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_live_visitor_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_live_visitor_stats(integer) TO authenticated;

-- course_has_seats: keep auth-only
REVOKE EXECUTE ON FUNCTION public.course_has_seats(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_has_seats(text) TO authenticated;

-- Public functions: keep accessible to anon (intentional)
-- verify_ssra_certificate, get_public_home_stats remain open
