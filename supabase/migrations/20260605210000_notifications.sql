-- ══════════════════════════════════════════════════════
-- In-app notification system
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ssra_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'info',
  -- types: session_reminder | enrollment_confirmed | waitlist_notified
  --        certificate_issued | refund_processed | system
  title       TEXT        NOT NULL,
  body        TEXT,
  data        JSONB,
  action_url  TEXT,
  read        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ssra_notifications_user_read
  ON ssra_notifications(user_id, read, created_at DESC);

ALTER TABLE ssra_notifications ENABLE ROW LEVEL SECURITY;

-- Users read/update their own notifications
CREATE POLICY "notifications_own_select"
  ON ssra_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update"
  ON ssra_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can insert notifications for any user
CREATE POLICY "notifications_admin_insert"
  ON ssra_notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ssra_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can do everything (for edge functions)
-- (service_role bypasses RLS by default)

-- Helper function: create a session reminder notification for all students in a course
CREATE OR REPLACE FUNCTION notify_session_reminder(
  _session_id   UUID,
  _hours_before INT DEFAULT 24
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _session   RECORD;
  _course    RECORD;
  _inserted  INT := 0;
BEGIN
  SELECT * INTO _session FROM ssra_sessions WHERE id = _session_id;
  IF NOT FOUND OR _session.is_cancelled THEN RETURN 0; END IF;

  SELECT title INTO _course FROM ssra_courses WHERE id = _session.course_id;

  -- Insert notification for enrolled students
  INSERT INTO ssra_notifications (user_id, type, title, body, action_url, data)
  SELECT
    e.user_id,
    'session_reminder',
    CASE _hours_before
      WHEN 24 THEN '📅 Session tomorrow: ' || _session.title
      WHEN 1  THEN '⏰ Session starting in 1 hour: ' || _session.title
      ELSE 'Upcoming session: ' || _session.title
    END,
    'Your ' || _course.title || ' live session starts in ' || _hours_before || ' hour(s).',
    '/dashboard/sessions',
    jsonb_build_object('session_id', _session_id, 'scheduled_at', _session.scheduled_at)
  FROM ssra_enrollments e
  WHERE e.course_id = _session.course_id AND e.status = 'active'
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _inserted = ROW_COUNT;

  -- Also insert for active subscribers
  INSERT INTO ssra_notifications (user_id, type, title, body, action_url, data)
  SELECT
    s.user_id,
    'session_reminder',
    CASE _hours_before
      WHEN 24 THEN '📅 Session tomorrow: ' || _session.title
      WHEN 1  THEN '⏰ Session starting in 1 hour: ' || _session.title
      ELSE 'Upcoming session: ' || _session.title
    END,
    'Your ' || _course.title || ' live session starts in ' || _hours_before || ' hour(s).',
    '/dashboard/sessions',
    jsonb_build_object('session_id', _session_id, 'scheduled_at', _session.scheduled_at)
  FROM ssra_subscriptions s
  WHERE s.course_id = _session.course_id AND s.status IN ('active', 'trialing')
    AND NOT EXISTS (
      SELECT 1 FROM ssra_enrollments e
      WHERE e.user_id = s.user_id AND e.course_id = _session.course_id
    )
  ON CONFLICT DO NOTHING;

  RETURN _inserted;
END;
$$;
