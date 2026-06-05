-- Tighten ssra_batches SELECT: restrict to admins/instructors only
DROP POLICY IF EXISTS "Authenticated read batches" ON public.ssra_batches;
CREATE POLICY "Staff read batches" ON public.ssra_batches
  FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()) OR public.is_ssra_instructor(auth.uid()));

-- Fix ssra_materials: allow subscribers to read materials for their subscribed courses
DROP POLICY IF EXISTS "Enrolled read materials" ON public.ssra_materials;
CREATE POLICY "Enrolled or subscribed read materials" ON public.ssra_materials
  FOR SELECT TO authenticated
  USING (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ssra_enrollments e
      WHERE e.user_id = auth.uid()
        AND e.course_id = ssra_materials.course_id
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.ssra_subscriptions sub
      WHERE sub.user_id = auth.uid()
        AND sub.course_id = ssra_materials.course_id
        AND sub.status IN ('active','trialing')
    )
  );
