
-- 1. Course scheduling fields
ALTER TABLE public.ssra_courses
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS course_format text
    CHECK (course_format IN ('online','recorded','live'));

-- 2. Validation trigger: cannot activate a course unless all required scheduling fields are set
CREATE OR REPLACE FUNCTION public.validate_ssra_course_publishable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    IF NEW.start_date IS NULL
       OR NEW.start_time IS NULL
       OR NEW.duration IS NULL OR length(trim(NEW.duration)) = 0
       OR NEW.instructor_name IS NULL OR length(trim(NEW.instructor_name)) = 0
       OR NEW.course_format IS NULL THEN
      RAISE EXCEPTION 'Cannot publish course: start_date, start_time, duration, instructor_name, and course_format are all required'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ssra_course_publishable ON public.ssra_courses;
CREATE TRIGGER trg_validate_ssra_course_publishable
BEFORE INSERT OR UPDATE ON public.ssra_courses
FOR EACH ROW EXECUTE FUNCTION public.validate_ssra_course_publishable();

-- 3. Enrollment snapshot + order number
ALTER TABLE public.ssra_enrollments
  ADD COLUMN IF NOT EXISTS order_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS course_title_snapshot text,
  ADD COLUMN IF NOT EXISTS start_date_snapshot date,
  ADD COLUMN IF NOT EXISTS start_time_snapshot time,
  ADD COLUMN IF NOT EXISTS duration_snapshot text,
  ADD COLUMN IF NOT EXISTS instructor_snapshot text,
  ADD COLUMN IF NOT EXISTS student_name_snapshot text,
  ADD COLUMN IF NOT EXISTS student_email_snapshot text;

-- 4. Order number generator
CREATE OR REPLACE FUNCTION public.generate_ssra_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := 'SSRA-ENR-' || to_char(now(), 'YYYY') || '-' ||
            upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.ssra_enrollments WHERE order_number = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ssra_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_ssra_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ssra_order_number ON public.ssra_enrollments;
CREATE TRIGGER trg_set_ssra_order_number
BEFORE INSERT ON public.ssra_enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_ssra_order_number();

-- 5. Unique constraint for upsert in webhook
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ssra_enrollments_user_course_unique'
  ) THEN
    ALTER TABLE public.ssra_enrollments
      ADD CONSTRAINT ssra_enrollments_user_course_unique UNIQUE (user_id, course_id);
  END IF;
END $$;

-- Grants unchanged; pre-existing tables already have correct GRANTs.
