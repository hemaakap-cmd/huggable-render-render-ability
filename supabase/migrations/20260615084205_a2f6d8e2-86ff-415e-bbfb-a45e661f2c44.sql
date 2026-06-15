
-- Payment attempts table
CREATE TABLE public.ssra_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  course_id text,
  course_title text,
  enrollment_id uuid,
  amount_eur numeric(10,2),
  coupon_code text,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','processing','succeeded','failed','abandoned')),
  failure_reason text,
  failure_code text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  attempt_number int NOT NULL DEFAULT 1,
  ip_address text,
  user_agent text,
  country text,
  environment text NOT NULL DEFAULT 'live',
  initiated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_attempts_user ON public.ssra_payment_attempts(user_id, created_at DESC);
CREATE INDEX idx_payment_attempts_course ON public.ssra_payment_attempts(course_id, created_at DESC);
CREATE INDEX idx_payment_attempts_status ON public.ssra_payment_attempts(status, created_at DESC);
CREATE INDEX idx_payment_attempts_created ON public.ssra_payment_attempts(created_at DESC);
CREATE INDEX idx_payment_attempts_session ON public.ssra_payment_attempts(stripe_session_id);
CREATE INDEX idx_payment_attempts_email ON public.ssra_payment_attempts(user_email);

GRANT SELECT ON public.ssra_payment_attempts TO authenticated;
GRANT ALL ON public.ssra_payment_attempts TO service_role;

ALTER TABLE public.ssra_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment attempts"
  ON public.ssra_payment_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payment attempts"
  ON public.ssra_payment_attempts FOR SELECT
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Service role manages payment attempts"
  ON public.ssra_payment_attempts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- touch updated_at
CREATE OR REPLACE FUNCTION public.touch_payment_attempts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_touch_payment_attempts
BEFORE UPDATE ON public.ssra_payment_attempts
FOR EACH ROW EXECUTE FUNCTION public.touch_payment_attempts();

-- Record a new payment attempt
CREATE OR REPLACE FUNCTION public.record_payment_attempt(
  _user_id uuid,
  _user_email text,
  _course_id text,
  _course_title text,
  _enrollment_id uuid,
  _amount_eur numeric,
  _coupon_code text,
  _stripe_session_id text,
  _ip_address text,
  _user_agent text,
  _country text,
  _environment text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_attempt_number int;
  v_id uuid;
  v_fail_count int;
BEGIN
  SELECT COALESCE(MAX(attempt_number),0)+1
    INTO v_attempt_number
    FROM public.ssra_payment_attempts
   WHERE user_id = _user_id AND course_id = _course_id;

  INSERT INTO public.ssra_payment_attempts (
    user_id, user_email, course_id, course_title, enrollment_id,
    amount_eur, coupon_code, status, stripe_session_id,
    attempt_number, ip_address, user_agent, country, environment
  ) VALUES (
    _user_id, lower(trim(coalesce(_user_email,''))), _course_id, _course_title, _enrollment_id,
    _amount_eur, _coupon_code, 'initiated', _stripe_session_id,
    v_attempt_number, _ip_address, left(coalesce(_user_agent,''),500), _country, coalesce(_environment,'live')
  ) RETURNING id INTO v_id;

  -- auto fraud flag on 3+ failed attempts in last 24h
  SELECT COUNT(*) INTO v_fail_count
    FROM public.ssra_payment_attempts
   WHERE user_id = _user_id AND status = 'failed'
     AND created_at > now() - interval '24 hours';

  IF v_fail_count >= 3 THEN
    INSERT INTO public.ssra_fraud_flags (user_id, flag_type, severity, details)
    VALUES (_user_id, 'repeated_payment_failure', 'medium',
            jsonb_build_object('failed_attempts_24h', v_fail_count, 'course_id', _course_id));
  END IF;

  RETURN v_id;
END; $$;

-- Update an attempt
CREATE OR REPLACE FUNCTION public.update_payment_attempt(
  _attempt_id uuid,
  _status text,
  _failure_reason text,
  _failure_code text,
  _stripe_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_initiated timestamptz;
BEGIN
  SELECT initiated_at INTO v_initiated FROM public.ssra_payment_attempts WHERE id = _attempt_id;
  UPDATE public.ssra_payment_attempts
     SET status = _status,
         failure_reason = COALESCE(_failure_reason, failure_reason),
         failure_code = COALESCE(_failure_code, failure_code),
         stripe_payment_intent_id = COALESCE(_stripe_payment_intent_id, stripe_payment_intent_id),
         completed_at = CASE WHEN _status IN ('succeeded','failed','abandoned') THEN now() ELSE completed_at END,
         duration_ms = CASE WHEN _status IN ('succeeded','failed','abandoned') AND v_initiated IS NOT NULL
                            THEN EXTRACT(EPOCH FROM (now() - v_initiated))*1000 ELSE duration_ms END
   WHERE id = _attempt_id;
END; $$;

-- Update by Stripe session id (for webhooks)
CREATE OR REPLACE FUNCTION public.update_payment_attempt_by_session(
  _session_id text,
  _status text,
  _failure_reason text,
  _failure_code text,
  _stripe_payment_intent_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.ssra_payment_attempts
   WHERE stripe_session_id = _session_id ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    PERFORM public.update_payment_attempt(v_id, _status, _failure_reason, _failure_code, _stripe_payment_intent_id);
  END IF;
END; $$;

-- Monitor stats
CREATE OR REPLACE FUNCTION public.get_payment_monitor_stats(_hours int DEFAULT 24, _env text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  WITH base AS (
    SELECT * FROM public.ssra_payment_attempts
     WHERE environment = _env
       AND created_at > now() - make_interval(hours => _hours)
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM base),
    'succeeded', (SELECT COUNT(*) FROM base WHERE status='succeeded'),
    'failed', (SELECT COUNT(*) FROM base WHERE status='failed'),
    'initiated', (SELECT COUNT(*) FROM base WHERE status='initiated'),
    'abandoned', (SELECT COUNT(*) FROM base WHERE status='abandoned'),
    'success_rate', CASE WHEN (SELECT COUNT(*) FROM base WHERE status IN ('succeeded','failed')) = 0 THEN 0
                         ELSE round(((SELECT COUNT(*) FROM base WHERE status='succeeded')::numeric
                                     / NULLIF((SELECT COUNT(*) FROM base WHERE status IN ('succeeded','failed')),0))*100, 2) END,
    'avg_duration_ms', COALESCE((SELECT round(AVG(duration_ms)) FROM base WHERE duration_ms IS NOT NULL),0),
    'unique_users', (SELECT COUNT(DISTINCT user_id) FROM base),
    'top_failure_reasons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('reason', reason, 'count', cnt) ORDER BY cnt DESC)
        FROM (SELECT COALESCE(failure_reason,'Unknown') AS reason, COUNT(*) AS cnt
                FROM base WHERE status='failed' GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t
    ), '[]'::jsonb),
    'hourly_buckets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hour', h, 'total', t, 'succeeded', s, 'failed', f) ORDER BY h)
        FROM (SELECT date_trunc('hour', created_at) AS h,
                     COUNT(*) AS t,
                     COUNT(*) FILTER (WHERE status='succeeded') AS s,
                     COUNT(*) FILTER (WHERE status='failed') AS f
                FROM base GROUP BY 1) hb
    ), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.get_top_failed_users(_hours int DEFAULT 168, _env text DEFAULT 'live', _min_fails int DEFAULT 2)
RETURNS TABLE(user_id uuid, user_email text, failed_count bigint, total_attempts bigint, last_attempt_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.user_id,
         MAX(a.user_email) AS user_email,
         COUNT(*) FILTER (WHERE a.status='failed') AS failed_count,
         COUNT(*) AS total_attempts,
         MAX(a.created_at) AS last_attempt_at
    FROM public.ssra_payment_attempts a
   WHERE a.environment = _env
     AND a.created_at > now() - make_interval(hours => _hours)
   GROUP BY a.user_id
  HAVING COUNT(*) FILTER (WHERE a.status='failed') >= _min_fails
   ORDER BY failed_count DESC
   LIMIT 50;
END; $$;
