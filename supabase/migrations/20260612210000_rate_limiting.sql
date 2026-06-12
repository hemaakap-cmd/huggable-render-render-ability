-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting infrastructure (DB-backed fixed window)
--
-- Edge functions call check_rate_limit() before doing work. The function
-- atomically increments a per-key counter inside the current fixed window
-- and returns whether the request is allowed.
--
-- Why DB-backed: Supabase Edge Functions are stateless and scale to zero —
-- in-memory counters reset on every cold start and don't share state between
-- isolates. A single UPSERT ... RETURNING gives us an atomic, shared counter
-- with one round-trip and no extra infrastructure.
--
-- Protected endpoints (keys are namespaced by the caller):
--   otp:<email>            5 attempts / 15 min — OTP brute-force protection
--   otp-ip:<ip>           20 attempts / 15 min — distributed OTP guessing
--   coupon:<user_id>      20 attempts /  5 min — coupon code enumeration
--   session:<user_id>     30 attempts /  5 min — session link scraping
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

COMMENT ON TABLE public.rate_limit_counters IS
  'Fixed-window rate limit counters used by check_rate_limit(). Rows are transient; old windows are purged daily by pg_cron.';

-- Service-role only — never exposed to clients
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit: service_role only"
  ON public.rate_limit_counters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Atomic check-and-increment ────────────────────────────────────────────────
-- Returns true if the request is ALLOWED (counter after increment <= max).
-- The counter is incremented even when denied, so sustained attacks keep
-- being counted (no sawtooth reset behaviour).
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key            text,
  _max_requests   integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count        integer;
BEGIN
  -- Fixed window aligned to the epoch (all callers in the same window share it)
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds
  );

  INSERT INTO public.rate_limit_counters AS rlc (key, window_start, count)
  VALUES (_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
    DO UPDATE SET count = rlc.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= _max_requests;
END;
$$;

-- Only edge functions (service role) may call this
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- ── Daily cleanup of stale windows (keep 24 h for forensics) ──────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-rate-limit-counters')
      FROM cron.job WHERE jobname = 'purge-rate-limit-counters';

    PERFORM cron.schedule(
      'purge-rate-limit-counters',
      '30 3 * * *',
      $$ DELETE FROM public.rate_limit_counters WHERE window_start < now() - INTERVAL '24 hours'; $$
    );
  END IF;
END;
$$;
