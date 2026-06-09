
-- Reports page reads from this view; it was missing, so it always showed 0.
-- Create it so Reports, Enrollments and Revenue dashboards all show the same numbers.

DROP VIEW IF EXISTS public.ssra_enrollment_report;

CREATE VIEW public.ssra_enrollment_report
WITH (security_invoker = on) AS
SELECT
  e.id                                                  AS enrollment_id,
  COALESCE(e.student_name_snapshot, p.full_name)        AS student_name,
  COALESCE(e.student_email_snapshot, p.email)           AS student_email,
  p.phone_number                                        AS phone_number,
  p.country                                             AS country,
  e.status                                              AS payment_status,
  COALESCE(e.paid_at, e.enrolled_at, e.created_at)      AS enrollment_date,
  COALESCE(e.course_title_snapshot, c.title)            AS course_name,
  e.course_id                                           AS course_id,
  COALESCE(e.start_date_snapshot, b.start_date)         AS batch_date,
  e.coupon_code                                         AS coupon_code,
  -- Only count money for non-refunded/cancelled rows so revenue is honest
  CASE
    WHEN e.status IN ('cancelled', 'refunded') THEN 0
    ELSE COALESCE(e.amount_eur, 0)
  END                                                   AS amount_paid,
  -- Attendance % for this enrollment's course
  COALESCE((
    SELECT ROUND(
      100.0 * COUNT(DISTINCT sa.session_id)
      / NULLIF(COUNT(DISTINCT s.id), 0)
    )::int
    FROM public.ssra_sessions s
    LEFT JOIN public.ssra_session_attendance sa
      ON sa.session_id = s.id AND sa.user_id = e.user_id
    WHERE s.course_id = e.course_id
      AND s.is_cancelled = false
      AND s.scheduled_at <= now()
  ), 0)                                                 AS attendance_pct,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.ssra_certificates cert
      WHERE cert.user_id = e.user_id
        AND cert.course_id = e.course_id
        AND cert.revoked = false
    ) THEN 'Issued'
    ELSE 'Not issued'
  END                                                   AS certificate_status,
  to_char(
    COALESCE(e.paid_at, e.enrolled_at, e.created_at),
    'YYYY-MM-DD'
  )                                                     AS report_month
FROM public.ssra_enrollments e
LEFT JOIN public.ssra_profiles  p ON p.id = e.user_id
LEFT JOIN public.ssra_courses   c ON c.id = e.course_id
LEFT JOIN public.ssra_batches   b ON b.id = e.batch_id;

GRANT SELECT ON public.ssra_enrollment_report TO authenticated;
GRANT SELECT ON public.ssra_enrollment_report TO service_role;

COMMENT ON VIEW public.ssra_enrollment_report IS
'Unified, joined view of every enrollment with student, course, batch, attendance and certificate data. Source of truth for the Reports & Export page so admin revenue figures stay consistent with the Enrollments page.';
