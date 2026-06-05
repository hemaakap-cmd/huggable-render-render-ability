-- ══════════════════════════════════════════════════════
-- Patch: enrollment report access, notification delete,
--        and session-reminder cron documentation
-- ══════════════════════════════════════════════════════

-- 1. Allow users to delete their own notifications (mark as dismissed)
CREATE POLICY IF NOT EXISTS "notifications_own_delete"
  ON ssra_notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2. Grant admin read on ssra_certificates so the enrollment report view works
--    (if RLS exists on this table, ensure admins can read all rows)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ssra_certificates'
  ) THEN
    -- Only add if not already present
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'ssra_certificates'
        AND policyname = 'certificates_admin_read'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "certificates_admin_read"
          ON ssra_certificates FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM ssra_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
      $pol$;
    END IF;
  END IF;
END $$;

-- 3. Grant admin read on ssra_session_attendance for the report view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ssra_session_attendance'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'ssra_session_attendance'
        AND policyname = 'attendance_admin_read'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "attendance_admin_read"
          ON ssra_session_attendance FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM ssra_profiles
              WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            )
          )
      $pol$;
    END IF;
  END IF;
END $$;

-- 4. Helper view for admin: enrollment report with RLS bypass via security definer function
CREATE OR REPLACE FUNCTION get_enrollment_report(
  _month       DATE     DEFAULT NULL,
  _course_id   TEXT     DEFAULT NULL,
  _status      TEXT     DEFAULT NULL
)
RETURNS SETOF ssra_enrollment_report
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT *
  FROM ssra_enrollment_report
  WHERE
    (_month    IS NULL OR report_month = DATE_TRUNC('month', _month))
    AND (_course_id IS NULL OR course_id = _course_id)
    AND (_status   IS NULL OR payment_status = _status)
  ORDER BY enrollment_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_enrollment_report TO authenticated;

-- ══════════════════════════════════════════════════════
-- CRON SETUP DOCUMENTATION
-- ══════════════════════════════════════════════════════
-- To automate session reminder emails and in-app notifications,
-- set up a Supabase Edge Function cron via pg_cron or external scheduler:
--
-- Option A: pg_cron (if enabled in your Supabase project)
--   SELECT cron.schedule(
--     'session-reminders',
--     '0 * * * *',   -- every hour
--     $$
--       SELECT net.http_post(
--         url := current_setting('app.supabase_url') || '/functions/v1/send-session-reminders',
--         headers := jsonb_build_object(
--           'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--           'Content-Type', 'application/json'
--         ),
--         body := '{}'::jsonb
--       )
--     $$
--   );
--
-- Option B: External cron (GitHub Actions, Render cron, etc.)
--   POST /functions/v1/send-session-reminders
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--   Schedule: every hour (0 * * * *)
-- ══════════════════════════════════════════════════════
