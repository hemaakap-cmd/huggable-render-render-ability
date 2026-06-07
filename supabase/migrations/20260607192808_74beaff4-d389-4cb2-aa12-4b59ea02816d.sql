CREATE OR REPLACE FUNCTION public.get_ssra_email_status(_email text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text := lower(trim(coalesce(_email, '')));
  profile_row public.ssra_profiles%ROWTYPE;
BEGIN
  IF normalized_email = '' OR normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RETURN 'invalid';
  END IF;

  SELECT *
  INTO profile_row
  FROM public.ssra_profiles
  WHERE lower(email) = normalized_email
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'available';
  END IF;

  IF coalesce(trim(profile_row.full_name), '') <> ''
    AND coalesce(trim(profile_row.phone_number), '') <> ''
    AND coalesce(trim(profile_row.country), '') <> ''
    AND coalesce(trim(profile_row.city), '') <> ''
    AND coalesce(trim(profile_row.address), '') <> ''
    AND coalesce(trim(profile_row.degree), '') <> ''
    AND coalesce(trim(profile_row.german_level), '') <> '' THEN
    RETURN 'registered';
  END IF;

  RETURN 'incomplete';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ssra_email_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ssra_email_status(text) TO anon, authenticated, service_role;

UPDATE public.ssra_profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

CREATE OR REPLACE FUNCTION public.handle_new_ssra_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ssra_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    lower(trim(NEW.email)),
    CASE WHEN lower(NEW.email) = 'hemaakap@gmail.com' THEN 'super_admin' ELSE 'student' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;