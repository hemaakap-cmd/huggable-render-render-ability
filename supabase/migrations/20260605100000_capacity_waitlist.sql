-- ============================================================
-- Course Capacity Management + Waitlist System
-- Prevents overselling. Tracks seats. Manages waitlists.
-- ============================================================

-- ── Add capacity columns to ssra_courses ─────────────────────
ALTER TABLE public.ssra_courses
  ADD COLUMN IF NOT EXISTS capacity          INTEGER       NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS enrolled_count    INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_enabled  BOOLEAN       NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN       NOT NULL DEFAULT TRUE;

-- Back-fill enrolled_count from existing active enrollments
UPDATE public.ssra_courses c
SET enrolled_count = (
  SELECT COUNT(*)
  FROM   public.ssra_enrollments e
  WHERE  e.course_id = c.id
  AND    e.status    = 'active'
);

-- ── Trigger: keep enrolled_count in sync with enrollments ────
CREATE OR REPLACE FUNCTION public.sync_course_enrolled_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.ssra_courses
        SET enrolled_count = enrolled_count + 1
        WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE public.ssra_courses
        SET enrolled_count = enrolled_count + 1
        WHERE id = NEW.course_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE public.ssra_courses
        SET enrolled_count = GREATEST(enrolled_count - 1, 0)
        WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.ssra_courses
        SET enrolled_count = GREATEST(enrolled_count - 1, 0)
        WHERE id = OLD.course_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_enrolled_count ON public.ssra_enrollments;
CREATE TRIGGER trg_sync_enrolled_count
  AFTER INSERT OR UPDATE OR DELETE ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_enrolled_count();

-- ── Waitlist table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ssra_waitlist (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    TEXT        NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  position     INTEGER     NOT NULL DEFAULT 999,
  status       TEXT        NOT NULL DEFAULT 'waiting'
                           CHECK (status IN ('waiting','notified','converted','expired','removed')),
  notified_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ, -- if set, student must act before this time
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- Auto-assign position on insert
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.position := COALESCE(
    (SELECT MAX(position) + 1 FROM public.ssra_waitlist
     WHERE course_id = NEW.course_id AND status = 'waiting'),
    1
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_waitlist_position ON public.ssra_waitlist;
CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON public.ssra_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.assign_waitlist_position();

-- ── Helper: check if a course has seats ──────────────────────
CREATE OR REPLACE FUNCTION public.course_has_seats(_course_id TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    CASE WHEN NOT registration_open THEN FALSE
         WHEN enrolled_count >= capacity THEN FALSE
         ELSE TRUE
    END
  FROM public.ssra_courses
  WHERE id = _course_id;
$$;

-- ── RLS for waitlist ─────────────────────────────────────────
ALTER TABLE public.ssra_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own waitlist read" ON public.ssra_waitlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Own waitlist insert" ON public.ssra_waitlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own waitlist delete" ON public.ssra_waitlist
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin manage waitlist" ON public.ssra_waitlist
  FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

GRANT SELECT, INSERT, DELETE, UPDATE ON public.ssra_waitlist TO authenticated;
GRANT ALL ON public.ssra_waitlist TO service_role;

-- Indexes
CREATE INDEX IF NOT EXISTS ssra_waitlist_course_idx ON public.ssra_waitlist(course_id, status, position);
CREATE INDEX IF NOT EXISTS ssra_waitlist_user_idx   ON public.ssra_waitlist(user_id);
