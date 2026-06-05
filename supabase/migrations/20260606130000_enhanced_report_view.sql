-- ══════════════════════════════════════════════════════
-- Enhanced Enrollment Report View (with batch support)
-- Replaces 20260605230000 view; now includes batch_name,
-- homework stats, and grade average.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.ssra_enrollment_report AS
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
  b.name                                                          AS batch_name,
  e.batch_id,
  e.coupon_code,
  e.amount_eur                                                    AS amount_paid,
  ROUND(
    COALESCE(att.attended_count, 0)::NUMERIC
      / NULLIF(ses.total_sessions, 0) * 100, 1
  )                                                               AS attendance_pct,
  COALESCE(hw.submitted_count, 0)                                 AS hw_submitted,
  COALESCE(hw.graded_count, 0)                                    AS hw_graded,
  ROUND(COALESCE(hw.avg_grade, 0)::NUMERIC, 1)                   AS hw_avg_grade,
  CASE
    WHEN cert.id IS NOT NULL THEN 'Issued'
    ELSE 'Not Issued'
  END                                                             AS certificate_status,
  cert.certificate_code,
  e.stripe_session_id,
  DATE_TRUNC('month', e.enrolled_at)                             AS report_month
FROM public.ssra_enrollments e
LEFT JOIN public.ssra_profiles p   ON p.id = e.user_id
LEFT JOIN public.ssra_courses c    ON c.id = e.course_id
LEFT JOIN public.ssra_batches b    ON b.id = e.batch_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS attended_count
  FROM   public.ssra_session_attendance sa
  JOIN   public.ssra_sessions ss ON ss.id = sa.session_id
  WHERE  sa.user_id  = e.user_id
    AND  ss.course_id = e.course_id
) att ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total_sessions
  FROM   public.ssra_sessions ss
  WHERE  ss.course_id = e.course_id
    AND  NOT ss.is_cancelled
) ses ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE hs.status NOT IN ('missing'))          AS submitted_count,
    COUNT(*) FILTER (WHERE hs.status = 'graded')                  AS graded_count,
    AVG(hs.grade) FILTER (WHERE hs.grade IS NOT NULL)             AS avg_grade
  FROM public.ssra_homework_submissions hs
  WHERE hs.user_id = e.user_id AND hs.course_id = e.course_id
) hw ON TRUE
LEFT JOIN public.ssra_certificates cert
  ON  cert.user_id   = e.user_id
  AND cert.course_id = e.course_id
  AND NOT cert.revoked;

-- ── Batch report view: one row per batch ──────────────────────
CREATE OR REPLACE VIEW public.ssra_batch_report AS
SELECT
  b.id                                                            AS batch_id,
  b.name                                                          AS batch_name,
  b.status                                                        AS batch_status,
  b.start_date,
  b.end_date,
  b.capacity,
  b.enrolled_count,
  c.id                                                            AS course_id,
  c.title                                                         AS course_name,
  COUNT(e.id)                                                     AS total_enrollments,
  COUNT(e.id) FILTER (WHERE e.status = 'active')                 AS active_enrollments,
  ROUND(AVG(
    COALESCE(att.attended_count, 0)::NUMERIC / NULLIF(ses.total, 0) * 100
  ), 1)                                                           AS avg_attendance_pct,
  SUM(e.amount_eur) FILTER (WHERE e.status = 'active')           AS total_revenue_eur,
  COUNT(cert.id)                                                  AS certificates_issued
FROM public.ssra_batches b
JOIN public.ssra_courses c ON c.id = b.course_id
LEFT JOIN public.ssra_enrollments e ON e.batch_id = b.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS attended_count
  FROM public.ssra_session_attendance sa
  JOIN public.ssra_sessions ss ON ss.id = sa.session_id
  WHERE sa.user_id = e.user_id AND ss.course_id = b.course_id
) att ON e.id IS NOT NULL
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total
  FROM public.ssra_sessions ss
  WHERE ss.batch_id = b.id AND NOT ss.is_cancelled
) ses ON TRUE
LEFT JOIN public.ssra_certificates cert
  ON cert.user_id = e.user_id AND cert.course_id = b.course_id AND NOT cert.revoked
GROUP BY b.id, b.name, b.status, b.start_date, b.end_date, b.capacity, b.enrolled_count,
         c.id, c.title;

-- ── Update the SECURITY DEFINER report function ───────────────
CREATE OR REPLACE FUNCTION public.get_enrollment_report(
  _month       DATE     DEFAULT NULL,
  _course_id   TEXT     DEFAULT NULL,
  _batch_id    UUID     DEFAULT NULL,
  _status      TEXT     DEFAULT NULL
)
RETURNS SETOF public.ssra_enrollment_report
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT *
  FROM public.ssra_enrollment_report
  WHERE
    (_month     IS NULL OR report_month = DATE_TRUNC('month', _month))
    AND (_course_id IS NULL OR course_id  = _course_id)
    AND (_batch_id  IS NULL OR batch_id   = _batch_id)
    AND (_status    IS NULL OR payment_status = _status)
  ORDER BY enrollment_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_enrollment_report TO authenticated;
