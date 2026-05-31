
-- 1) Drop the unsafe "own profile update" policy that allowed role self-escalation
DROP POLICY IF EXISTS "Own profile update" ON public.ssra_profiles;

-- 2) Users can update their own profile EXCEPT the role column
CREATE POLICY "Own profile update no role"
ON public.ssra_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.ssra_profiles WHERE id = auth.uid()));

-- 3) Super admins can update any profile (including role)
CREATE OR REPLACE FUNCTION public.is_ssra_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.ssra_profiles WHERE id = _uid AND role = 'super_admin')
$$;

CREATE POLICY "Super admin update any profile"
ON public.ssra_profiles
FOR UPDATE
TO authenticated
USING (public.is_ssra_super_admin(auth.uid()))
WITH CHECK (public.is_ssra_super_admin(auth.uid()));

-- 4) Bootstrap: auto-promote the owner's email on signup
CREATE OR REPLACE FUNCTION public.handle_new_ssra_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ssra_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.email,
    CASE WHEN lower(NEW.email) = 'hemaakap@gmail.com' THEN 'super_admin' ELSE 'student' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created_ssra ON auth.users;
CREATE TRIGGER on_auth_user_created_ssra
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_ssra_user();
