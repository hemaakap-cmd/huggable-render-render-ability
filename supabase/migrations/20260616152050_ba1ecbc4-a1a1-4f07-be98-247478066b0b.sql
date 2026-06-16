
-- Create SECURITY DEFINER RPC returning only safe student-facing columns
CREATE OR REPLACE FUNCTION public.get_my_zoom_broadcasts()
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  scheduled_at timestamptz,
  duration_minutes integer,
  zoom_link text,
  zoom_password text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.title, b.description, b.scheduled_at, b.duration_minutes,
         b.zoom_link, b.zoom_password
    FROM public.ssra_zoom_broadcasts b
    JOIN public.ssra_zoom_broadcast_recipients r ON r.broadcast_id = b.id
   WHERE r.user_id = auth.uid()
     AND b.scheduled_at BETWEEN now() - interval '30 days' AND now() + interval '30 days'
   ORDER BY b.scheduled_at DESC
   LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.get_my_zoom_broadcasts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_zoom_broadcasts() TO authenticated;

-- Drop the student-facing SELECT policy that exposed admin/analytics columns
DROP POLICY IF EXISTS "Students read broadcasts they received" ON public.ssra_zoom_broadcasts;
