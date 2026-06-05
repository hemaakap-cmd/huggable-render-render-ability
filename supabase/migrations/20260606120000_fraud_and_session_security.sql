-- ══════════════════════════════════════════════════════
-- Fraud Detection + Session Security
-- Prevents link sharing, tracks access, flags anomalies.
-- ══════════════════════════════════════════════════════

-- ── 1. Fraud flags ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ssra_fraud_flags (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users ON DELETE CASCADE,
  flag_type        TEXT        NOT NULL,
  -- flag_type values:
  --   concurrent_session   — accessed same session from 2+ devices simultaneously
  --   chargeback_risk      — payment reversed / dispute opened
  --   rapid_enrollment     — multiple courses enrolled in <5 min (card testing)
  --   link_sharing         — session token used from unexpected IP
  --   refund_abuse         — multiple refund requests for same course
  --   suspicious_pattern   — catch-all for manual flags
  severity         TEXT        NOT NULL DEFAULT 'low'
                   CHECK (severity IN ('low','medium','high','critical')),
  description      TEXT,
  data             JSONB,           -- raw evidence (IPs, timestamps, etc.)
  auto_detected    BOOLEAN     DEFAULT TRUE,
  resolved         BOOLEAN     DEFAULT FALSE,
  resolved_by      UUID        REFERENCES auth.users,
  resolved_at      TIMESTAMPTZ,
  resolution_note  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ssra_fraud_user     ON public.ssra_fraud_flags(user_id, resolved);
CREATE INDEX IF NOT EXISTS ssra_fraud_type     ON public.ssra_fraud_flags(flag_type, resolved);
CREATE INDEX IF NOT EXISTS ssra_fraud_severity ON public.ssra_fraud_flags(severity, resolved);

ALTER TABLE public.ssra_fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fraud_admin_all"
  ON public.ssra_fraud_flags FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT, UPDATE ON public.ssra_fraud_flags TO authenticated;
GRANT ALL ON public.ssra_fraud_flags TO service_role;

-- ── 2. Session access log ─────────────────────────────
-- Tracks every time get-session-access is called.
-- Used to detect concurrent / multi-device access.
CREATE TABLE IF NOT EXISTS public.ssra_session_access_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id     UUID        NOT NULL REFERENCES public.ssra_sessions ON DELETE CASCADE,
  -- Hashed token issued (first 16 chars of SHA-256 hex)
  token_hash     TEXT        NOT NULL,
  ip_address     TEXT,
  user_agent     TEXT,
  -- Lifecycle
  accessed_at    TIMESTAMPTZ DEFAULT now(),
  last_seen_at   TIMESTAMPTZ DEFAULT now(),
  is_active      BOOLEAN     DEFAULT TRUE,
  revoked        BOOLEAN     DEFAULT FALSE,
  revoked_reason TEXT        -- 'concurrent_access', 'expired', 'admin_revoked'
);

CREATE INDEX IF NOT EXISTS ssra_sal_user_session
  ON public.ssra_session_access_log(user_id, session_id, is_active);
CREATE INDEX IF NOT EXISTS ssra_sal_token
  ON public.ssra_session_access_log(token_hash);
CREATE INDEX IF NOT EXISTS ssra_sal_accessed
  ON public.ssra_session_access_log(accessed_at DESC);

ALTER TABLE public.ssra_session_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the access log (edge functions use service role)
CREATE POLICY "sal_admin_read"
  ON public.ssra_session_access_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT ALL ON public.ssra_session_access_log TO service_role;

-- ── 3. PL/pgSQL: detect concurrent session access ─────────────
-- Called by edge function after issuing a token.
-- If the same user already has an active token for this session
-- from a different device (ip), revoke the old one and raise a fraud flag.
CREATE OR REPLACE FUNCTION public.check_concurrent_session_access(
  _user_id    UUID,
  _session_id UUID,
  _token_hash TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _active_count INT;
  _result       JSONB;
BEGIN
  -- Count active (non-revoked) tokens for this user+session in the last 2 hours
  SELECT COUNT(*) INTO _active_count
  FROM public.ssra_session_access_log
  WHERE user_id    = _user_id
    AND session_id = _session_id
    AND is_active  = TRUE
    AND revoked    = FALSE
    AND accessed_at > now() - INTERVAL '2 hours'
    AND token_hash <> _token_hash;  -- different token = different device

  -- Revoke all old active tokens for this user+session
  UPDATE public.ssra_session_access_log
  SET    is_active      = FALSE,
         revoked        = TRUE,
         revoked_reason = 'concurrent_access'
  WHERE  user_id    = _user_id
    AND  session_id = _session_id
    AND  is_active  = TRUE
    AND  token_hash <> _token_hash;

  -- Insert this new access record
  INSERT INTO public.ssra_session_access_log
    (user_id, session_id, token_hash, ip_address, user_agent)
  VALUES
    (_user_id, _session_id, _token_hash, _ip_address, _user_agent);

  -- If concurrent access detected, raise a fraud flag
  IF _active_count > 0 THEN
    INSERT INTO public.ssra_fraud_flags
      (user_id, flag_type, severity, description, data)
    VALUES (
      _user_id,
      'concurrent_session',
      'medium',
      'Student accessed the same session from multiple devices simultaneously.',
      jsonb_build_object(
        'session_id',  _session_id,
        'ip_address',  _ip_address,
        'user_agent',  _user_agent,
        'detected_at', now()
      )
    );

    _result := jsonb_build_object('concurrent', TRUE, 'revoked_count', _active_count);
  ELSE
    _result := jsonb_build_object('concurrent', FALSE, 'revoked_count', 0);
  END IF;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_concurrent_session_access TO service_role;

-- ── 4. PL/pgSQL: rapid enrollment detection ───────────────────
-- Called after each enrollment. Flags if user enrolled in 3+
-- courses within 5 minutes (card testing pattern).
CREATE OR REPLACE FUNCTION public.check_rapid_enrollment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _recent_count INT;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO _recent_count
  FROM public.ssra_enrollments
  WHERE user_id    = NEW.user_id
    AND enrolled_at > now() - INTERVAL '5 minutes'
    AND status = 'active';

  IF _recent_count >= 3 THEN
    INSERT INTO public.ssra_fraud_flags
      (user_id, flag_type, severity, description, data)
    VALUES (
      NEW.user_id,
      'rapid_enrollment',
      'high',
      'User enrolled in 3 or more courses within 5 minutes — possible card testing.',
      jsonb_build_object(
        'enrollments_in_window', _recent_count,
        'new_course_id', NEW.course_id,
        'enrolled_at', NEW.enrolled_at
      )
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_rapid_enrollment ON public.ssra_enrollments;
CREATE TRIGGER trg_check_rapid_enrollment
  AFTER INSERT OR UPDATE ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.check_rapid_enrollment();
