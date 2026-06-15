
CREATE OR REPLACE FUNCTION public.validate_ssra_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_full_name  text := COALESCE(NEW.full_name, '');
  v_phone      text := COALESCE(NEW.phone_number, '');
  v_city       text := COALESCE(NEW.city, '');
  v_address    text := COALESCE(NEW.address, '');
  v_phone_digits text;
  v_words      int;
BEGIN
  -- Only enforce on STUDENT rows. Admin/instructor profiles are created internally.
  IF COALESCE(NEW.role::text, 'student') <> 'student' THEN
    RETURN NEW;
  END IF;

  -- Allow empty profile right after auth signup trigger creates the row.
  -- Validation kicks in only once the user starts filling required fields:
  --   any non-null required field => ALL required fields must pass strict checks.
  IF v_full_name = '' AND v_phone = '' AND v_city = '' AND v_address = ''
     AND COALESCE(NEW.country,'') = '' AND COALESCE(NEW.degree,'') = ''
     AND COALESCE(NEW.german_level,'') = '' THEN
    RETURN NEW;
  END IF;

  -- ── Full name ──
  v_full_name := btrim(v_full_name);
  IF length(v_full_name) < 4 THEN
    RAISE EXCEPTION 'Full name must be at least 4 characters' USING ERRCODE='23514';
  END IF;
  IF v_full_name ~ '[\u0600-\u06FF]' THEN
    RAISE EXCEPTION 'Full name must be in English (Latin) letters only' USING ERRCODE='23514';
  END IF;
  IF v_full_name !~ '^[A-Za-z][A-Za-z\s''\-\.]*$' THEN
    RAISE EXCEPTION 'Full name may only contain English letters, spaces, hyphens, apostrophes' USING ERRCODE='23514';
  END IF;
  v_words := array_length(regexp_split_to_array(v_full_name, '\s+'), 1);
  IF v_words IS NULL OR v_words < 2 THEN
    RAISE EXCEPTION 'Please enter your full name (first and last name)' USING ERRCODE='23514';
  END IF;

  -- ── Phone ──
  IF v_phone = '' THEN
    RAISE EXCEPTION 'Phone number is required' USING ERRCODE='23514';
  END IF;
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF length(v_phone_digits) < 8 OR length(v_phone_digits) > 15 THEN
    RAISE EXCEPTION 'Phone number must contain 8 to 15 digits' USING ERRCODE='23514';
  END IF;
  IF v_phone_digits ~ '^(.)\1+$' THEN
    RAISE EXCEPTION 'Please enter a real phone number' USING ERRCODE='23514';
  END IF;

  -- ── Country ──
  IF COALESCE(NEW.country,'') = '' THEN
    RAISE EXCEPTION 'Country is required' USING ERRCODE='23514';
  END IF;

  -- ── City ──
  v_city := btrim(v_city);
  IF length(v_city) < 2 THEN
    RAISE EXCEPTION 'City must be at least 2 characters' USING ERRCODE='23514';
  END IF;
  IF v_city ~ '[\u0600-\u06FF]' OR v_city !~ '^[A-Za-z][A-Za-z\s''\-\.]*$' THEN
    RAISE EXCEPTION 'City must be in English letters only' USING ERRCODE='23514';
  END IF;

  -- ── Address ──
  v_address := btrim(v_address);
  IF length(v_address) < 10 THEN
    RAISE EXCEPTION 'Address must be at least 10 characters' USING ERRCODE='23514';
  END IF;
  IF v_address ~ '[\u0600-\u06FF]' THEN
    RAISE EXCEPTION 'Address must be in English letters only' USING ERRCODE='23514';
  END IF;

  -- ── Degree & German level ──
  IF COALESCE(NEW.degree,'') = '' THEN
    RAISE EXCEPTION 'Degree is required' USING ERRCODE='23514';
  END IF;
  IF COALESCE(NEW.german_level,'') = '' THEN
    RAISE EXCEPTION 'German level is required' USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ssra_profile_fields ON public.ssra_profiles;
CREATE TRIGGER trg_validate_ssra_profile_fields
BEFORE INSERT OR UPDATE ON public.ssra_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_ssra_profile_fields();
