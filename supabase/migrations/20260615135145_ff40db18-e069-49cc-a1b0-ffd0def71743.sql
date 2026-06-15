-- Don't populate full_name from auth metadata at signup time.
-- The client UPDATE after OTP verification fills all required fields together,
-- which satisfies the validate_ssra_profile_fields trigger atomically.
CREATE OR REPLACE FUNCTION public.handle_new_ssra_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.ssra_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    '',
    lower(trim(NEW.email)),
    CASE WHEN lower(NEW.email) = 'hemaakap@gmail.com' THEN 'super_admin' ELSE 'student' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;