
CREATE TABLE IF NOT EXISTS public.ssra_instructor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (instructor_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_ssra_instructor_assignments_instructor ON public.ssra_instructor_assignments(instructor_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_ssra_instructor_assignments_course ON public.ssra_instructor_assignments(course_id) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_instructor_assignments TO authenticated;
GRANT ALL ON public.ssra_instructor_assignments TO service_role;

ALTER TABLE public.ssra_instructor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors view own assignments"
  ON public.ssra_instructor_assignments
  FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid());

CREATE POLICY "Admins view all assignments"
  ON public.ssra_instructor_assignments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ssra_profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')
  ));

CREATE POLICY "Admins manage assignments"
  ON public.ssra_instructor_assignments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ssra_profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ssra_profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')
  ));
