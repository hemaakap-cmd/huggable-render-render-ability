
CREATE TABLE public.ssra_zoom_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  zoom_link TEXT NOT NULL,
  zoom_password TEXT,
  audience TEXT NOT NULL DEFAULT 'all_students',
  status TEXT NOT NULL DEFAULT 'queued',
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ssra_zoom_broadcasts TO authenticated;
GRANT ALL ON public.ssra_zoom_broadcasts TO service_role;
ALTER TABLE public.ssra_zoom_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read zoom broadcasts" ON public.ssra_zoom_broadcasts
  FOR SELECT TO authenticated USING (public.is_ssra_admin(auth.uid()));
CREATE POLICY "Admins insert zoom broadcasts" ON public.ssra_zoom_broadcasts
  FOR INSERT TO authenticated WITH CHECK (public.is_ssra_admin(auth.uid()));
CREATE POLICY "Admins update zoom broadcasts" ON public.ssra_zoom_broadcasts
  FOR UPDATE TO authenticated USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE TABLE public.ssra_zoom_broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.ssra_zoom_broadcasts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zoom_broadcast_recipients_broadcast ON public.ssra_zoom_broadcast_recipients(broadcast_id);
CREATE INDEX idx_zoom_broadcasts_created ON public.ssra_zoom_broadcasts(created_at DESC);

GRANT SELECT ON public.ssra_zoom_broadcast_recipients TO authenticated;
GRANT ALL ON public.ssra_zoom_broadcast_recipients TO service_role;
ALTER TABLE public.ssra_zoom_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read broadcast recipients" ON public.ssra_zoom_broadcast_recipients
  FOR SELECT TO authenticated USING (public.is_ssra_admin(auth.uid()));

CREATE TRIGGER touch_zoom_broadcasts_updated_at
  BEFORE UPDATE ON public.ssra_zoom_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.touch_ssra_session_credentials();
