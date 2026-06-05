-- ══════════════════════════════════════════════════════
-- Instructor role, course assignments, phone number
-- ══════════════════════════════════════════════════════

-- 1. Add phone_number to profiles if not exists
ALTER TABLE ssra_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Widen role constraint to include instructor
ALTER TABLE ssra_profiles DROP CONSTRAINT IF EXISTS ssra_profiles_role_check;
ALTER TABLE ssra_profiles
  ADD CONSTRAINT ssra_profiles_role_check
  CHECK (role IN ('student', 'admin', 'super_admin', 'instructor'));

-- 3. Track which instructor is assigned to a session
ALTER TABLE ssra_sessions ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users;

-- 4. Track coupon code used per enrollment (for reporting)
ALTER TABLE ssra_enrollments ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 5. Instructor ↔ course assignments
CREATE TABLE IF NOT EXISTS ssra_instructor_assignments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id  UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id      TEXT        NOT NULL REFERENCES ssra_courses(id) ON DELETE CASCADE,
  assigned_by    UUID        REFERENCES auth.users,
  assigned_at    TIMESTAMPTZ DEFAULT now(),
  is_active      BOOLEAN     DEFAULT TRUE,
  UNIQUE(instructor_id, course_id)
);

ALTER TABLE ssra_instructor_assignments ENABLE ROW LEVEL SECURITY;

-- Instructors see their own; admins see all
CREATE POLICY "instructor_assignments_select"
  ON ssra_instructor_assignments FOR SELECT TO authenticated
  USING (
    instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ssra_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can insert/update/delete
CREATE POLICY "instructor_assignments_admin"
  ON ssra_instructor_assignments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM ssra_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM ssra_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 6. Allow instructors to read sessions for their assigned courses
-- (Existing session RLS is public-read for non-cancelled; instructors also need to see cancelled)
DROP POLICY IF EXISTS "ssra_sessions_instructor" ON ssra_sessions;
CREATE POLICY "ssra_sessions_instructor"
  ON ssra_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_sessions.course_id
        AND ia.is_active
    )
  );

-- 7. Instructors can update their own sessions (zoom link, notes)
DROP POLICY IF EXISTS "ssra_sessions_instructor_update" ON ssra_sessions;
CREATE POLICY "ssra_sessions_instructor_update"
  ON ssra_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_sessions.course_id
        AND ia.is_active
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_sessions.course_id
        AND ia.is_active
    )
  );
