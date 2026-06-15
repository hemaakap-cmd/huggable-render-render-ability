
-- Allow each student to read their own recipient row
CREATE POLICY "Students read own broadcast recipients"
  ON public.ssra_zoom_broadcast_recipients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow students to read broadcasts they are a recipient of
CREATE POLICY "Students read broadcasts they received"
  ON public.ssra_zoom_broadcasts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ssra_zoom_broadcast_recipients r
      WHERE r.broadcast_id = ssra_zoom_broadcasts.id
        AND r.user_id = auth.uid()
    )
  );
