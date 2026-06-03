
CREATE TABLE public.site_visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid,
  path text NOT NULL DEFAULT '/',
  country text,
  country_code text,
  city text,
  region text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  device_type text,
  ip_hash text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  page_views int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_last_seen ON public.site_visitor_sessions(last_seen_at DESC);
CREATE INDEX idx_visitor_country ON public.site_visitor_sessions(country);

GRANT SELECT ON public.site_visitor_sessions TO authenticated;
GRANT ALL ON public.site_visitor_sessions TO service_role;

ALTER TABLE public.site_visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all visitors"
  ON public.site_visitor_sessions FOR SELECT
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Service role manages visitors"
  ON public.site_visitor_sessions FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_visitor_sessions;
ALTER TABLE public.site_visitor_sessions REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.get_live_visitor_stats(_window_minutes int DEFAULT 5)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_live_visitor_stats(int) TO authenticated;
