CREATE TABLE public.ssra_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT ON public.ssra_feature_flags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ssra_feature_flags TO authenticated;
GRANT ALL ON public.ssra_feature_flags TO service_role;

ALTER TABLE public.ssra_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_public_read" ON public.ssra_feature_flags
  FOR SELECT USING (true);

CREATE POLICY "feature_flags_admin_write" ON public.ssra_feature_flags
  FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

INSERT INTO public.ssra_feature_flags (key, enabled) VALUES ('coupons_enabled', false)
  ON CONFLICT (key) DO NOTHING;