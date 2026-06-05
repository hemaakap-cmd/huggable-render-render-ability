-- ============================================================
-- Secure Session Access Tokens
-- Prevents Zoom link sharing. One token per student per session.
-- Token expires and logs all access attempts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssra_session_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  session_id    UUID        NOT NULL REFERENCES public.ssra_sessions(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  accessed_at   TIMESTAMPTZ,
  access_count  INTEGER     NOT NULL DEFAULT 0,
  device_hint   TEXT,       -- browser fingerprint hint for anomaly detection
  revoked       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- Access log: each individual access attempt
CREATE TABLE IF NOT EXISTS public.ssra_session_access_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id   UUID        NOT NULL REFERENCES public.ssra_session_tokens(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID        NOT NULL REFERENCES public.ssra_sessions(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  success    BOOLEAN     NOT NULL DEFAULT TRUE,
  fail_reason TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: students see only their own tokens (never the underlying zoom_link)
ALTER TABLE public.ssra_session_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssra_session_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own token read" ON public.ssra_session_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin read all tokens" ON public.ssra_session_tokens
  FOR SELECT TO authenticated USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Admin manage tokens" ON public.ssra_session_tokens
  FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Admin read access log" ON public.ssra_session_access_log
  FOR SELECT TO authenticated USING (public.is_ssra_admin(auth.uid()));

GRANT SELECT ON public.ssra_session_tokens     TO authenticated;
GRANT SELECT ON public.ssra_session_access_log TO authenticated;
GRANT ALL    ON public.ssra_session_tokens     TO service_role;
GRANT ALL    ON public.ssra_session_access_log TO service_role;

-- Indexes
CREATE INDEX IF NOT EXISTS ssra_session_tokens_token_idx    ON public.ssra_session_tokens(token);
CREATE INDEX IF NOT EXISTS ssra_session_tokens_session_idx  ON public.ssra_session_tokens(session_id);
CREATE INDEX IF NOT EXISTS ssra_session_tokens_user_idx     ON public.ssra_session_tokens(user_id);
CREATE INDEX IF NOT EXISTS ssra_access_log_token_idx        ON public.ssra_session_access_log(token_id);
CREATE INDEX IF NOT EXISTS ssra_access_log_session_idx      ON public.ssra_session_access_log(session_id);
