-- Session attendance tracking table
CREATE TABLE IF NOT EXISTS ssra_session_attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES ssra_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE ssra_session_attendance ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all attendance records
CREATE POLICY "admin_manage_attendance" ON ssra_session_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ssra_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Students can view their own attendance
CREATE POLICY "student_view_own_attendance" ON ssra_session_attendance
  FOR SELECT USING (user_id = auth.uid());
