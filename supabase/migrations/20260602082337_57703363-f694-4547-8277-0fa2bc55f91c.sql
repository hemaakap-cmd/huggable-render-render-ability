
-- 1. Certificates: remove public table read, expose verification via RPC only
DROP POLICY IF EXISTS "Public verify non-revoked certificates" ON public.ssra_certificates;

CREATE OR REPLACE FUNCTION public.verify_ssra_certificate(_code text)
RETURNS TABLE(
  certificate_code text,
  student_name text,
  course_title text,
  grade text,
  issued_at timestamptz,
  revoked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT certificate_code, student_name, course_title, grade, issued_at, revoked
  FROM public.ssra_certificates
  WHERE certificate_code = upper(trim(_code))
    AND revoked = false
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_ssra_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_ssra_certificate(text) TO anon, authenticated;

-- 2. Profile role escalation: use SECURITY DEFINER getter to compare with persisted role
CREATE OR REPLACE FUNCTION public.get_ssra_role(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.ssra_profiles WHERE id = _uid
$$;

REVOKE EXECUTE ON FUNCTION public.get_ssra_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ssra_role(uuid) TO authenticated;

DROP POLICY IF EXISTS "Own profile update no role" ON public.ssra_profiles;
CREATE POLICY "Own profile update no role"
ON public.ssra_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = public.get_ssra_role(auth.uid()));

-- 3. Sessions: also allow active one-time enrollments to read sessions
DROP POLICY IF EXISTS "subscriber_read_sessions" ON public.ssra_sessions;
CREATE POLICY "subscriber_read_sessions"
ON public.ssra_sessions
FOR SELECT
TO authenticated
USING (
  public.is_ssra_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.ssra_subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.course_id = ssra_sessions.course_id
      AND s.status IN ('active','trialing')
  )
  OR EXISTS (
    SELECT 1 FROM public.ssra_enrollments e
    WHERE e.user_id = auth.uid()
      AND e.course_id = ssra_sessions.course_id
      AND e.status = 'active'
  )
);

-- 4. Lock down pgmq email helper functions: service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
