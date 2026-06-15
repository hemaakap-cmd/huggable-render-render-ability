CREATE TABLE public.ssra_site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ssra_site_settings TO anon, authenticated;
GRANT ALL ON public.ssra_site_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.ssra_site_settings TO authenticated;

ALTER TABLE public.ssra_site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings"
  ON public.ssra_site_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admin can insert site settings"
  ON public.ssra_site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ssra_super_admin(auth.uid()));

CREATE POLICY "Super admin can update site settings"
  ON public.ssra_site_settings FOR UPDATE
  TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()))
  WITH CHECK (public.is_ssra_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete site settings"
  ON public.ssra_site_settings FOR DELETE
  TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_ssra_site_settings()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_touch_ssra_site_settings
  BEFORE UPDATE ON public.ssra_site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_ssra_site_settings();