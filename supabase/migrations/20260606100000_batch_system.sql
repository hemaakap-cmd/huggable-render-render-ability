-- ══════════════════════════════════════════════════════
-- Batch / Cohort Management
-- Allows one course to run multiple times with separate
-- student groups, sessions, and capacity per batch.
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ssra_batches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      TEXT        NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,          -- "Batch 1 — Jan 2026", "Spring Cohort"
  start_date     DATE,
  end_date       DATE,
  capacity       INTEGER     NOT NULL DEFAULT 50,
  enrolled_count INTEGER     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('upcoming','active','completed','cancelled')),
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ssra_batches_course ON public.ssra_batches(course_id, status);

ALTER TABLE public.ssra_batches ENABLE ROW LEVEL SECURITY;

-- Public can read non-cancelled batches (for course detail page)
CREATE POLICY "batches_public_read"
  ON public.ssra_batches FOR SELECT
  USING (status <> 'cancelled');

-- Admins manage all batches
CREATE POLICY "batches_admin_manage"
  ON public.ssra_batches FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- Instructors can read batches for their assigned courses
CREATE POLICY "batches_instructor_read"
  ON public.ssra_batches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ssra_instructor_assignments ia
      WHERE ia.instructor_id = auth.uid()
        AND ia.course_id = ssra_batches.course_id
        AND ia.is_active
    )
  );

-- ── Link batches to enrollments and sessions ──────────────────
ALTER TABLE public.ssra_enrollments
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.ssra_batches ON DELETE SET NULL;

ALTER TABLE public.ssra_sessions
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.ssra_batches ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ssra_enrollments_batch ON public.ssra_enrollments(batch_id);
CREATE INDEX IF NOT EXISTS ssra_sessions_batch    ON public.ssra_sessions(batch_id);

-- ── Trigger: sync batch.enrolled_count ───────────────────────
CREATE OR REPLACE FUNCTION public.sync_batch_enrolled_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.batch_id IS NOT NULL AND NEW.status = 'active' THEN
      UPDATE public.ssra_batches SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF OLD.batch_id IS NOT NULL AND OLD.status = 'active' AND (NEW.status != 'active' OR NEW.batch_id IS DISTINCT FROM OLD.batch_id) THEN
      UPDATE public.ssra_batches SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id = OLD.batch_id;
    END IF;
    IF NEW.batch_id IS NOT NULL AND NEW.status = 'active' AND (OLD.status != 'active' OR OLD.batch_id IS DISTINCT FROM NEW.batch_id) THEN
      UPDATE public.ssra_batches SET enrolled_count = enrolled_count + 1 WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.batch_id IS NOT NULL AND OLD.status = 'active' THEN
      UPDATE public.ssra_batches SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id = OLD.batch_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_batch_enrolled ON public.ssra_enrollments;
CREATE TRIGGER trg_sync_batch_enrolled
  AFTER INSERT OR UPDATE OR DELETE ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sync_batch_enrolled_count();

-- ── Helper: check if batch has seats available ────────────────
CREATE OR REPLACE FUNCTION public.batch_has_seats(_batch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    CASE WHEN status NOT IN ('upcoming','active') THEN FALSE
         WHEN enrolled_count >= capacity            THEN FALSE
         ELSE TRUE
    END
  FROM public.ssra_batches
  WHERE id = _batch_id;
$$;

GRANT SELECT ON public.ssra_batches TO authenticated, anon;
GRANT ALL    ON public.ssra_batches TO service_role;
