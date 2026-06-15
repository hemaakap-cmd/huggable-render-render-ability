ALTER TABLE public.ssra_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public_team BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT ON public.ssra_profiles TO anon;

CREATE POLICY "Public can read public team members"
  ON public.ssra_profiles FOR SELECT
  TO anon, authenticated
  USING (is_public_team = true AND role IN ('instructor','admin','super_admin'));

CREATE OR REPLACE FUNCTION public.get_public_team()
RETURNS TABLE(
  id UUID, full_name TEXT, role TEXT, title TEXT, bio TEXT,
  photo_url TEXT, country TEXT, social_links JSONB, team_display_order INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, role::text, title, bio, photo_url, country, social_links, team_display_order
    FROM public.ssra_profiles
   WHERE is_public_team = true
     AND role IN ('instructor','admin','super_admin')
   ORDER BY team_display_order ASC, full_name ASC
$$;