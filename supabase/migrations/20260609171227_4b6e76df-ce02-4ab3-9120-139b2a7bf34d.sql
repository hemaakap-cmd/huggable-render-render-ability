
ALTER TABLE public.ssra_materials
  ADD COLUMN IF NOT EXISTS storage_path   TEXT,
  ADD COLUMN IF NOT EXISTS file_name      TEXT,
  ADD COLUMN IF NOT EXISTS file_size      BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type      TEXT,
  ADD COLUMN IF NOT EXISTS material_type  TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS external_link  TEXT,
  ADD COLUMN IF NOT EXISTS is_visible     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allow_download BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Allow assigned instructors (ssra_courses.instructor_id) to manage their own materials
DROP POLICY IF EXISTS "Instructor manage own course materials" ON public.ssra_materials;
CREATE POLICY "Instructor manage own course materials"
  ON public.ssra_materials FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ssra_courses c
            WHERE c.id = ssra_materials.course_id AND c.instructor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ssra_courses c
            WHERE c.id = ssra_materials.course_id AND c.instructor_id = auth.uid())
  );

-- Storage policies for the course-materials bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_materials_read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "course_materials_read"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'course-materials'
        AND (
          public.is_ssra_admin(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.ssra_materials m
            WHERE m.storage_path = storage.objects.name
              AND m.is_visible = TRUE
              AND (
                EXISTS (SELECT 1 FROM public.ssra_courses c
                        WHERE c.id = m.course_id AND c.instructor_id = auth.uid())
                OR EXISTS (SELECT 1 FROM public.ssra_enrollments e
                           WHERE e.user_id = auth.uid() AND e.course_id = m.course_id AND e.status = 'active')
                OR EXISTS (SELECT 1 FROM public.ssra_subscriptions s
                           WHERE s.user_id = auth.uid() AND s.course_id = m.course_id
                             AND s.status IN ('active','trialing'))
              )
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_materials_write' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "course_materials_write"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'course-materials'
        AND (
          public.is_ssra_admin(auth.uid())
          OR EXISTS (SELECT 1 FROM public.ssra_courses c WHERE c.instructor_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_materials_delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "course_materials_delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'course-materials'
        AND (
          public.is_ssra_admin(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.ssra_materials m
            WHERE m.storage_path = storage.objects.name
              AND EXISTS (SELECT 1 FROM public.ssra_courses c
                          WHERE c.id = m.course_id AND c.instructor_id = auth.uid())
          )
        )
      );
  END IF;
END $$;
