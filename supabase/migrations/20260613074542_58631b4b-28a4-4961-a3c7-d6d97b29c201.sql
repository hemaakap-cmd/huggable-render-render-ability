
CREATE INDEX IF NOT EXISTS idx_ssra_enrollments_course_status
  ON public.ssra_enrollments (course_id, status);

CREATE INDEX IF NOT EXISTS idx_ssra_enrollments_status_created
  ON public.ssra_enrollments (status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ssra_homework_user
  ON public.ssra_homework_submissions (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ssra_homework_course_status
  ON public.ssra_homework_submissions (course_id, status);

CREATE INDEX IF NOT EXISTS idx_ssra_session_attendance_user
  ON public.ssra_session_attendance (user_id);

CREATE INDEX IF NOT EXISTS idx_ssra_session_access_log_user_session
  ON public.ssra_session_access_log (user_id, session_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ssra_subscriptions_user_created
  ON public.ssra_subscriptions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ssra_notifications_unread
  ON public.ssra_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_events_env_occurred
  ON public.revenue_events (environment, occurred_at DESC);
