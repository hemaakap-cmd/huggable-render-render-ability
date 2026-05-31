CREATE TABLE public.auth_otp_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_type text NOT NULL,
  alias_code text NOT NULL,
  original_token text NOT NULL,
  consumed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.auth_otp_aliases TO service_role;

ALTER TABLE public.auth_otp_aliases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_auth_otp_aliases_lookup
ON public.auth_otp_aliases (lower(email), otp_type, alias_code, expires_at DESC)
WHERE consumed_at IS NULL;

CREATE INDEX idx_auth_otp_aliases_cleanup
ON public.auth_otp_aliases (expires_at);