-- ══════════════════════════════════════════════════════
-- Course materials & homework
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ssra_course_materials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     TEXT        NOT NULL REFERENCES ssra_courses(id) ON DELETE CASCADE,
  session_id    UUID        REFERENCES ssra_sessions ON DELETE SET NULL,
  uploaded_by   UUID        REFERENCES auth.users,
  title         TEXT        NOT NULL,
  description   TEXT,
  file_url      TEXT,
  external_link TEXT,
  material_type TEXT        NOT NULL DEFAULT 'document'
                CHECK (material_type IN ('document', 'video', 'homework', 'link', 'slides')),
  is_visible    BOOLEAN     DEFAULT TRUE,
  due_date      TIMESTAMPTZ,
  sort_order    INT         DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ssra_course_materials_course
  ON ssra_course_materials(course_id, is_visible, sort_order);

ALTER TABLE ssra_course_materials ENABLE ROW LEVEL SECURITY;

-- Enrolled students and subscribers read visible materials
CREATE POLICY "materials_student_read"
  ON ssra_course_materials FOR SELECT TO authenticated
  USING (
    is_visible = TRUE
    AND (
      EXISTS (
        SELECT 1 FROM ssra_enrollments e
        WHERE e.user_id = auth.uid()
          AND e.course_id = ssra_course_materials.course_id
          AND e.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM ssra_subscriptions s
        WHERE s.user_id = auth.uid()
          AND s.course_id = ssra_course_materials.course_id
          AND s.status IN ('active', 'trialing')
      )
      OR EXISTS (
        SELECT 1 FROM ssra_instructor_assignments ia
        WHERE ia.instructor_id = auth.uid()
          AND ia.course_id = ssra_course_materials.course_id
          AND ia.is_active
      )
      OR EXISTS (
        SELECT 1 FROM ssra_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    )
  );

-- Instructors assigned to course + admins can manage materials
CREATE POLICY "materials_instructor_manage"
  ON ssra_course_materials FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_course_materials.course_id
        AND ia.is_active
    )
    OR EXISTS (
      SELECT 1 FROM ssra_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_course_materials.course_id
        AND ia.is_active
    )
    OR EXISTS (
      SELECT 1 FROM ssra_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
