
-- Drop the super-admin-only update policy and replace with tiered policies
DROP POLICY IF EXISTS "Admins update profiles" ON public.ssra_profiles;

-- Super admins can update any profile to any role
CREATE POLICY "Super admins update any profile"
ON public.ssra_profiles
FOR UPDATE
TO authenticated
USING (public.is_ssra_super_admin(auth.uid()))
WITH CHECK (public.is_ssra_super_admin(auth.uid()));

-- Regular admins can update profiles ONLY between student <-> instructor roles
-- (cannot touch admins/super_admins, cannot grant admin/super_admin)
CREATE POLICY "Admins manage instructor role"
ON public.ssra_profiles
FOR UPDATE
TO authenticated
USING (
  public.is_ssra_admin(auth.uid())
  AND role IN ('student', 'instructor')
)
WITH CHECK (
  public.is_ssra_admin(auth.uid())
  AND role IN ('student', 'instructor')
);
