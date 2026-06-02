
-- 1) Unique index on profiles.email (case-insensitive to prevent dupes)
CREATE UNIQUE INDEX IF NOT EXISTS ssra_profiles_email_unique
  ON public.ssra_profiles (lower(email))
  WHERE email IS NOT NULL;

-- 2) Rename existing policies to the canonical names requested
ALTER POLICY "Super admin update any profile" ON public.ssra_profiles RENAME TO "Admins update profiles";
ALTER POLICY "Own subscription read"          ON public.ssra_subscriptions RENAME TO "Users read own subscriptions";

-- 3) Add admin manage policy for subscriptions (was missing — only SELECT existed)
CREATE POLICY "Admins manage subscriptions"
  ON public.ssra_subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));
