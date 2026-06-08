
-- 1. Isolated credentials table — service_role only.
CREATE TABLE IF NOT EXISTS public.ssra_session_credentials (
  session_id    uuid PRIMARY KEY REFERENCES public.ssra_sessions(id) ON DELETE CASCADE,
  zoom_link     text NOT NULL,
  zoom_password text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.ssra_session_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ssra_session_credentials TO service_role;
ALTER TABLE public.ssra_session_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssra_session_credentials FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_ssra_session_credentials()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;$$;

DROP TRIGGER IF EXISTS trg_touch_ssra_session_credentials ON public.ssra_session_credentials;
CREATE TRIGGER trg_touch_ssra_session_credentials
  BEFORE UPDATE ON public.ssra_session_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_ssra_session_credentials();

-- 2. Backfill.
INSERT INTO public.ssra_session_credentials (session_id, zoom_link, zoom_password)
SELECT id, zoom_link, zoom_password
FROM public.ssra_sessions
WHERE zoom_link IS NOT NULL AND zoom_link <> ''
ON CONFLICT (session_id) DO NOTHING;

-- 3. Replace cancellation trigger.
DROP TRIGGER IF EXISTS trg_clear_cancelled_session_credentials ON public.ssra_sessions;
CREATE OR REPLACE FUNCTION public.clear_cancelled_session_credentials()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_cancelled = true AND (OLD.is_cancelled = false OR OLD.is_cancelled IS NULL) THEN
    DELETE FROM public.ssra_session_credentials WHERE session_id = NEW.id;
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_clear_cancelled_session_credentials
  AFTER UPDATE OF is_cancelled ON public.ssra_sessions
  FOR EACH ROW EXECUTE FUNCTION public.clear_cancelled_session_credentials();

-- 4. Drop credential columns from ssra_sessions.
ALTER TABLE public.ssra_sessions DROP COLUMN IF EXISTS zoom_link;
ALTER TABLE public.ssra_sessions DROP COLUMN IF EXISTS zoom_password;

CREATE OR REPLACE FUNCTION public.session_has_credentials(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.ssra_session_credentials WHERE session_id = _session_id);
$$;
GRANT EXECUTE ON FUNCTION public.session_has_credentials(uuid) TO authenticated;

-- 5. Latin-only CHECK constraints (NOT VALID preserves existing rows).
ALTER TABLE public.ssra_profiles
  ADD CONSTRAINT ssra_profiles_full_name_latin
  CHECK (full_name IS NULL OR full_name = '' OR full_name ~ E'^[A-Za-z][A-Za-z \\-\\.\u0027]*$')
  NOT VALID;

ALTER TABLE public.ssra_profiles
  ADD CONSTRAINT ssra_profiles_country_latin
  CHECK (country IS NULL OR country = '' OR country ~ E'^[A-Za-z][A-Za-z \\-\\.\u0027]*$')
  NOT VALID;

ALTER TABLE public.ssra_profiles
  ADD CONSTRAINT ssra_profiles_degree_latin
  CHECK (degree IS NULL OR degree = '' OR degree ~ E'^[A-Za-z][A-Za-z0-9 \\-\\.,/()\u0027]*$')
  NOT VALID;

CREATE OR REPLACE FUNCTION public.report_profile_charset_violations()
RETURNS TABLE(id uuid, email text, field text, value text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id, p.email, 'full_name'::text, p.full_name FROM public.ssra_profiles p
    WHERE p.full_name IS NOT NULL AND p.full_name <> ''
      AND p.full_name !~ E'^[A-Za-z][A-Za-z \\-\\.\u0027]*$'
  UNION ALL
  SELECT p.id, p.email, 'country'::text, p.country FROM public.ssra_profiles p
    WHERE p.country IS NOT NULL AND p.country <> ''
      AND p.country !~ E'^[A-Za-z][A-Za-z \\-\\.\u0027]*$'
  UNION ALL
  SELECT p.id, p.email, 'degree'::text, p.degree FROM public.ssra_profiles p
    WHERE p.degree IS NOT NULL AND p.degree <> ''
      AND p.degree !~ E'^[A-Za-z][A-Za-z0-9 \\-\\.,/()\u0027]*$';
END;$$;
GRANT EXECUTE ON FUNCTION public.report_profile_charset_violations() TO authenticated;
