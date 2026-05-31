-- Allow anonymous (guest) applications: user_id must be NULL when not authenticated
CREATE POLICY "Anon guest verification insert"
  ON public.ssra_verifications
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

GRANT INSERT ON public.ssra_verifications TO anon;