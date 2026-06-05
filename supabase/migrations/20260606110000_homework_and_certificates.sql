-- ══════════════════════════════════════════════════════
-- Homework Submission System + Auto-Certificate Trigger
-- ══════════════════════════════════════════════════════

-- ── Homework submissions ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.ssra_homework_submissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id   UUID        NOT NULL REFERENCES public.ssra_course_materials(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id     TEXT        NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  batch_id      UUID        REFERENCES public.ssra_batches ON DELETE SET NULL,
  -- Submission content (one or both)
  file_url      TEXT,
  text_content  TEXT,
  -- Grading
  grade         SMALLINT    CHECK (grade >= 0 AND grade <= 100),
  feedback      TEXT,
  graded_by     UUID        REFERENCES auth.users,
  graded_at     TIMESTAMPTZ,
  -- Status lifecycle
  status        TEXT        NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted','late','graded','returned','missing')),
  submitted_at  TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate submissions
  UNIQUE(material_id, user_id)
);

CREATE INDEX IF NOT EXISTS ssra_hw_material  ON public.ssra_homework_submissions(material_id, status);
CREATE INDEX IF NOT EXISTS ssra_hw_user      ON public.ssra_homework_submissions(user_id);
CREATE INDEX IF NOT EXISTS ssra_hw_course    ON public.ssra_homework_submissions(course_id);
CREATE INDEX IF NOT EXISTS ssra_hw_ungraded  ON public.ssra_homework_submissions(course_id, status) WHERE status = 'submitted';

ALTER TABLE public.ssra_homework_submissions ENABLE ROW LEVEL SECURITY;

-- Students: read/write own submissions
CREATE POLICY "hw_student_own"
  ON public.ssra_homework_submissions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Instructors assigned to the course: read all + update (grade)
CREATE POLICY "hw_instructor_read"
  ON public.ssra_homework_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_homework_submissions.course_id
        AND ia.is_active
    )
  );

CREATE POLICY "hw_instructor_grade"
  ON public.ssra_homework_submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_homework_submissions.course_id
        AND ia.is_active
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_homework_submissions.course_id
        AND ia.is_active
    )
  );

-- Admins: full access
CREATE POLICY "hw_admin_all"
  ON public.ssra_homework_submissions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT, INSERT, UPDATE ON public.ssra_homework_submissions TO authenticated;
GRANT ALL ON public.ssra_homework_submissions TO service_role;

-- ── Auto-certificate: issue when attendance ≥ 75 % ───────────
CREATE OR REPLACE FUNCTION public.check_auto_certificate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _course_id     TEXT;
  _total_sess    INT;
  _attended      INT;
  _pct           NUMERIC;
  _threshold     CONSTANT INT := 75;
BEGIN
  -- Resolve the course_id from the session
  SELECT s.course_id INTO _course_id
  FROM public.ssra_sessions s
  WHERE s.id = NEW.session_id;

  IF _course_id IS NULL THEN RETURN NEW; END IF;

  -- Verify the student is actively enrolled
  IF NOT EXISTS (
    SELECT 1 FROM public.ssra_enrollments
    WHERE user_id = NEW.user_id AND course_id = _course_id AND status = 'active'
  ) THEN
    -- Also check subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM public.ssra_subscriptions
      WHERE user_id = NEW.user_id AND course_id = _course_id AND status IN ('active','trialing')
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Count total live (non-cancelled) sessions in the course
  SELECT COUNT(*) INTO _total_sess
  FROM public.ssra_sessions
  WHERE course_id = _course_id AND NOT is_cancelled;

  IF _total_sess = 0 THEN RETURN NEW; END IF;

  -- Count sessions this student has attended
  SELECT COUNT(*) INTO _attended
  FROM public.ssra_session_attendance sa
  JOIN public.ssra_sessions s ON s.id = sa.session_id
  WHERE sa.user_id = NEW.user_id AND s.course_id = _course_id;

  _pct := (_attended::NUMERIC / _total_sess) * 100;

  -- Auto-issue if threshold met and no certificate yet
  IF _pct >= _threshold THEN
    INSERT INTO public.ssra_certificates (
      user_id, course_id, student_name, student_email,
      course_title, issued_at, certificate_code
    )
    SELECT
      NEW.user_id,
      _course_id,
      p.full_name,
      p.email,
      c.title,
      now(),
      'SSRA-' || UPPER(REPLACE(gen_random_uuid()::TEXT, '-', ''))::TEXT
    FROM public.ssra_profiles p
    CROSS JOIN public.ssra_courses c
    WHERE p.id = NEW.user_id
      AND c.id = _course_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_certificate ON public.ssra_session_attendance;
CREATE TRIGGER trg_auto_certificate
  AFTER INSERT OR UPDATE ON public.ssra_session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.check_auto_certificate();

-- ── Student progress view ──────────────────────────────────────
-- Gives each student a per-course progress snapshot
CREATE OR REPLACE VIEW public.ssra_student_progress AS
SELECT
  e.user_id,
  e.course_id,
  p.full_name          AS student_name,
  p.email              AS student_email,
  c.title              AS course_name,
  e.enrolled_at,
  e.batch_id,
  b.name               AS batch_name,
  -- Attendance
  COALESCE(att.attended, 0)                            AS sessions_attended,
  COALESCE(ses.total, 0)                               AS sessions_total,
  CASE WHEN COALESCE(ses.total, 0) = 0 THEN 0
       ELSE ROUND(COALESCE(att.attended, 0)::NUMERIC / ses.total * 100, 1)
  END                                                  AS attendance_pct,
  -- Homework
  COALESCE(hw.submitted, 0)                            AS hw_submitted,
  COALESCE(hw.graded, 0)                               AS hw_graded,
  COALESCE(hw.avg_grade, 0)                            AS hw_avg_grade,
  -- Certificate
  CASE WHEN cert.id IS NOT NULL THEN 'Issued' ELSE 'Not Issued' END AS certificate_status,
  cert.certificate_code
FROM public.ssra_enrollments e
JOIN public.ssra_profiles p ON p.id = e.user_id
JOIN public.ssra_courses  c ON c.id = e.course_id
LEFT JOIN public.ssra_batches b ON b.id = e.batch_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS attended
  FROM public.ssra_session_attendance sa
  JOIN public.ssra_sessions ss ON ss.id = sa.session_id
  WHERE sa.user_id = e.user_id AND ss.course_id = e.course_id
) att ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total
  FROM public.ssra_sessions ss
  WHERE ss.course_id = e.course_id AND NOT ss.is_cancelled
) ses ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('missing'))   AS submitted,
    COUNT(*) FILTER (WHERE status = 'graded')           AS graded,
    ROUND(AVG(grade) FILTER (WHERE grade IS NOT NULL), 1) AS avg_grade
  FROM public.ssra_homework_submissions hs
  WHERE hs.user_id = e.user_id AND hs.course_id = e.course_id
) hw ON TRUE
LEFT JOIN public.ssra_certificates cert
  ON cert.user_id = e.user_id AND cert.course_id = e.course_id AND NOT cert.revoked
WHERE e.status = 'active';
