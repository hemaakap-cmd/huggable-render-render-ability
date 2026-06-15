
-- 1) Lock down ssra_profiles for anonymous users; public team data is exposed only via get_public_team() RPC.
DROP POLICY IF EXISTS "Public can read public team members" ON public.ssra_profiles;
REVOKE SELECT ON public.ssra_profiles FROM anon;

-- Recreate restricted public-team policy for authenticated users only (RPC is the canonical path; this keeps any direct queries safe).
CREATE POLICY "Authenticated can read public team rows"
  ON public.ssra_profiles FOR SELECT
  TO authenticated
  USING (is_public_team = true AND role IN ('instructor','admin','super_admin'));

-- Ensure get_public_team is callable by anon
GRANT EXECUTE ON FUNCTION public.get_public_team() TO anon, authenticated;

-- 2) Explicit, auditable policies for ssra_session_credentials (admin-only access; service_role bypasses RLS).
ALTER TABLE public.ssra_session_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage session credentials" ON public.ssra_session_credentials;
CREATE POLICY "Admins manage session credentials"
  ON public.ssra_session_credentials FOR ALL
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

-- Hard shield: explicitly block any non-admin writes from clients (defence in depth)
DROP POLICY IF EXISTS "Block client writes to session credentials INSERT" ON public.ssra_session_credentials;
CREATE POLICY "Block client writes to session credentials INSERT"
  ON public.ssra_session_credentials AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "Block client writes to session credentials UPDATE" ON public.ssra_session_credentials;
CREATE POLICY "Block client writes to session credentials UPDATE"
  ON public.ssra_session_credentials AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "Block client writes to session credentials DELETE" ON public.ssra_session_credentials;
CREATE POLICY "Block client writes to session credentials DELETE"
  ON public.ssra_session_credentials AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

-- 3) Shield ssra_zoom_broadcast_recipients against client-side writes so students cannot self-insert into a broadcast to read its zoom_link/password.
DROP POLICY IF EXISTS "Block client INSERT on broadcast recipients" ON public.ssra_zoom_broadcast_recipients;
CREATE POLICY "Block client INSERT on broadcast recipients"
  ON public.ssra_zoom_broadcast_recipients AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "Block client UPDATE on broadcast recipients" ON public.ssra_zoom_broadcast_recipients;
CREATE POLICY "Block client UPDATE on broadcast recipients"
  ON public.ssra_zoom_broadcast_recipients AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

DROP POLICY IF EXISTS "Block client DELETE on broadcast recipients" ON public.ssra_zoom_broadcast_recipients;
CREATE POLICY "Block client DELETE on broadcast recipients"
  ON public.ssra_zoom_broadcast_recipients AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()));
