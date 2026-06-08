
CREATE OR REPLACE FUNCTION public.reserve_pending_enrollment(
  _user_id uuid,
  _course_id text,
  _coupon_code text DEFAULT NULL,
  _student_name text DEFAULT NULL,
  _student_email text DEFAULT NULL
)
RETURNS TABLE(enrollment_id uuid, outcome text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  existing record;
  seats_taken int;
  new_id uuid;
BEGIN
  -- Lock the course row for the duration of this transaction.
  -- Any concurrent reserve_pending_enrollment for the same course waits here,
  -- which serializes capacity checks and eliminates the TOCTOU race.
  SELECT id, title, price_eur, capacity, registration_open, is_active,
         start_date, start_time, duration, instructor_name
    INTO c
  FROM public.ssra_courses
  WHERE id = _course_id
  FOR UPDATE;

  IF NOT FOUND OR c.is_active = false THEN
    RETURN QUERY SELECT NULL::uuid, 'error'::text, 'Course not available'::text;
    RETURN;
  END IF;

  IF c.registration_open = false THEN
    RETURN QUERY SELECT NULL::uuid, 'closed'::text, 'Registration is closed'::text;
    RETURN;
  END IF;

  -- Reuse existing enrollment for this user+course (idempotent retries)
  SELECT id, status INTO existing
  FROM public.ssra_enrollments
  WHERE user_id = _user_id AND course_id = _course_id
  LIMIT 1;

  IF FOUND THEN
    IF existing.status = 'active' THEN
      RETURN QUERY SELECT existing.id, 'already_enrolled'::text, NULL::text;
      RETURN;
    END IF;
    -- Pending row exists: refresh coupon and reuse (this user already holds a seat slot)
    UPDATE public.ssra_enrollments
       SET coupon_code = COALESCE(_coupon_code, coupon_code),
           created_at  = now()  -- refresh the 15-min hold window
     WHERE id = existing.id;
    RETURN QUERY SELECT existing.id, 'reused'::text, NULL::text;
    RETURN;
  END IF;

  -- Count active enrollments + recent pending checkouts toward capacity.
  -- Pending older than 15 minutes is treated as abandoned and released.
  SELECT COUNT(*) INTO seats_taken
  FROM public.ssra_enrollments
  WHERE course_id = _course_id
    AND (
      status = 'active'
      OR (status = 'pending' AND created_at > now() - interval '15 minutes')
    );

  IF seats_taken >= COALESCE(c.capacity, 50) THEN
    RETURN QUERY SELECT NULL::uuid, 'full'::text, 'Course is full'::text;
    RETURN;
  END IF;

  INSERT INTO public.ssra_enrollments (
    user_id, course_id, status, amount_eur,
    course_title_snapshot, start_date_snapshot, start_time_snapshot,
    duration_snapshot, instructor_snapshot,
    student_name_snapshot, student_email_snapshot,
    coupon_code
  ) VALUES (
    _user_id, _course_id, 'pending', c.price_eur,
    c.title, c.start_date, c.start_time,
    c.duration, c.instructor_name,
    _student_name, _student_email,
    _coupon_code
  )
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, 'reserved'::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_pending_enrollment(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_pending_enrollment(uuid, text, text, text, text) TO service_role;
