
-- Helper to generate a short readable code: SSRA-YYYY-XXXXXXXX
CREATE OR REPLACE FUNCTION public.generate_ssra_cert_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'SSRA-' || to_char(now(), 'YYYY') || '-' ||
            upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.ssra_certificates WHERE certificate_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

CREATE TABLE public.ssra_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_code TEXT NOT NULL UNIQUE,
  user_id UUID,
  course_id TEXT,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  grade TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ssra_certificates_user ON public.ssra_certificates(user_id);
CREATE INDEX idx_ssra_certificates_code ON public.ssra_certificates(certificate_code);

GRANT SELECT ON public.ssra_certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_certificates TO authenticated;
GRANT ALL ON public.ssra_certificates TO service_role;

ALTER TABLE public.ssra_certificates ENABLE ROW LEVEL SECURITY;

-- Public verification: anyone can look up a non-revoked certificate
CREATE POLICY "Public verify non-revoked certificates"
ON public.ssra_certificates
FOR SELECT
TO anon, authenticated
USING (revoked = false);

-- Owners always see their own (even if revoked)
CREATE POLICY "Own certificates read"
ON public.ssra_certificates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin full access
CREATE POLICY "Admin manage certificates"
ON public.ssra_certificates
FOR ALL
TO authenticated
USING (public.is_ssra_admin(auth.uid()))
WITH CHECK (public.is_ssra_admin(auth.uid()));

-- Auto-fill certificate_code if not provided
CREATE OR REPLACE FUNCTION public.set_ssra_cert_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.certificate_code IS NULL OR NEW.certificate_code = '' THEN
    NEW.certificate_code := public.generate_ssra_cert_code();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ssra_cert_code
BEFORE INSERT OR UPDATE ON public.ssra_certificates
FOR EACH ROW
EXECUTE FUNCTION public.set_ssra_cert_code();
