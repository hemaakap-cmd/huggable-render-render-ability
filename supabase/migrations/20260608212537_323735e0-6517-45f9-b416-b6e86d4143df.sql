CREATE TABLE IF NOT EXISTS public.ssra_session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ssra_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL,
  device_hint text,
  accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT ALL ON public.ssra_session_tokens TO service_role;

ALTER TABLE public.ssra_session_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_ssra_session_tokens()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_ssra_session_tokens ON public.ssra_session_tokens;
CREATE TRIGGER touch_ssra_session_tokens
BEFORE UPDATE ON public.ssra_session_tokens
FOR EACH ROW EXECUTE FUNCTION public.touch_ssra_session_tokens();

CREATE INDEX IF NOT EXISTS idx_ssra_session_tokens_user_session
  ON public.ssra_session_tokens(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ssra_session_tokens_expires_at
  ON public.ssra_session_tokens(expires_at);

CREATE OR REPLACE FUNCTION public.check_concurrent_session_access(
  _user_id uuid,
  _session_id uuid,
  _token_hash text,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS TABLE(concurrent boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_concurrent boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.ssra_session_access_log l
    WHERE l.user_id = _user_id
      AND l.session_id = _session_id
      AND l.device_fingerprint IS NOT NULL
      AND l.device_fingerprint <> _token_hash
      AND l.accessed_at > now() - interval '4 hours'
  ) INTO is_concurrent;

  INSERT INTO public.ssra_session_access_log (
    user_id,
    session_id,
    ip_address,
    user_agent,
    device_fingerprint
  ) VALUES (
    _user_id,
    _session_id,
    _ip_address,
    left(coalesce(_user_agent, ''), 300),
    _token_hash
  );

  IF is_concurrent THEN
    INSERT INTO public.ssra_fraud_flags (
      user_id,
      flag_type,
      severity,
      details
    ) VALUES (
      _user_id,
      'concurrent_session_access',
      'high',
      jsonb_build_object(
        'session_id', _session_id,
        'ip_address', _ip_address,
        'user_agent', left(coalesce(_user_agent, ''), 300),
        'device_fingerprint', _token_hash
      )
    );
  END IF;

  RETURN QUERY SELECT is_concurrent;
END;
$$;

REVOKE ALL ON FUNCTION public.check_concurrent_session_access(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_concurrent_session_access(uuid, uuid, text, text, text) TO service_role;