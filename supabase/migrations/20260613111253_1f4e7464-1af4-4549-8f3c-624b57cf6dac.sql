
-- 1. Drop the over-permissive policy that exposed all student PII to instructors
DROP POLICY IF EXISTS "Instructor read assigned students profiles" ON public.ssra_profiles;

-- 2. Provide a safe, column-limited RPC for instructors to list students of a course they teach
CREATE OR REPLACE FUNCTION public.get_instructor_course_students(_course_id text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  country text,
  enrolled_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_ssra_admin(auth.uid())
          OR public.is_instructor_for_course(auth.uid(), _course_id)) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.user_id,
         p.full_name,
         p.country,
         e.enrolled_at,
         e.status
    FROM public.ssra_enrollments e
    LEFT JOIN public.ssra_profiles p ON p.id = e.user_id
   WHERE e.course_id = _course_id
     AND e.status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.get_instructor_course_students(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_instructor_course_students(text) TO authenticated;
