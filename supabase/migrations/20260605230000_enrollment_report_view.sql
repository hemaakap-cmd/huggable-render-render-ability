-- ══════════════════════════════════════════════════════
-- Enrollment report view — used by AdminReports CSV export
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE VIEW ssra_enrollment_report AS
SELECT
  e.id                                                            AS enrollment_id,
  p.full_name                                                     AS student_name,
  p.email                                                         AS student_email,
  p.phone_number,
  p.country,
  e.status                                                        AS payment_status,
  e.enrolled_at                                                   AS enrollment_date,
  c.title                                                         AS course_name,
  c.id                                                            AS course_id,
  c.start_date                                                    AS batch_date,
  e.coupon_code,
  e.amount_eur                                                    AS amount_paid,
  ROUND(
    COALESCE(att.attended_count, 0)::NUMERIC
      / NULLIF(ses.total_sessions, 0) * 100,
    1
  )                                                               AS attendance_pct,
  CASE
    WHEN cert.id IS NOT NULL THEN 'Issued'
    ELSE 'Not Issued'
  END                                                             AS certificate_status,
  e.stripe_session_id,
  DATE_TRUNC('month', e.enrolled_at)                             AS report_month
FROM ssra_enrollments e
LEFT JOIN ssra_profiles p
  ON p.id = e.user_id
LEFT JOIN ssra_courses c
  ON c.id = e.course_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS attended_count
  FROM   ssra_session_attendance sa
  JOIN   ssra_sessions ss ON ss.id = sa.session_id
  WHERE  sa.user_id = e.user_id
    AND  ss.course_id = e.course_id
) att ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_sessions
  FROM   ssra_sessions ss
  WHERE  ss.course_id = e.course_id
    AND  NOT ss.is_cancelled
) ses ON TRUE
LEFT JOIN ssra_certificates cert
  ON  cert.user_id   = e.user_id
  AND cert.course_id = e.course_id
  AND NOT cert.revoked;

-- Admins query this view directly from the app using service-level access
-- The underlying tables already have RLS; admins bypass via their role check in the query layer
