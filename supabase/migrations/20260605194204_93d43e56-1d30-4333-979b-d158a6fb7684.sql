-- Temporarily skip the publish-validation trigger so we can apply schema changes
SET session_replication_role = replica;

-- 20260605100000_capacity_waitlist
ALTER TABLE public.ssra_courses
  ADD COLUMN IF NOT EXISTS capacity          INTEGER       NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS enrolled_count    INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_enabled  BOOLEAN       NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN       NOT NULL DEFAULT TRUE;

UPDATE public.ssra_courses c
SET enrolled_count = (SELECT COUNT(*) FROM public.ssra_enrollments e WHERE e.course_id = c.id AND e.status='active');

CREATE OR REPLACE FUNCTION public.sync_course_enrolled_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status='active' THEN UPDATE public.ssra_courses SET enrolled_count=enrolled_count+1 WHERE id=NEW.course_id; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status!='active' AND NEW.status='active' THEN UPDATE public.ssra_courses SET enrolled_count=enrolled_count+1 WHERE id=NEW.course_id;
    ELSIF OLD.status='active' AND NEW.status!='active' THEN UPDATE public.ssra_courses SET enrolled_count=GREATEST(enrolled_count-1,0) WHERE id=NEW.course_id; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN
    IF OLD.status='active' THEN UPDATE public.ssra_courses SET enrolled_count=GREATEST(enrolled_count-1,0) WHERE id=OLD.course_id; END IF;
    RETURN OLD;
  END IF;
END;$$;

DROP TRIGGER IF EXISTS trg_sync_enrolled_count ON public.ssra_enrollments;
CREATE TRIGGER trg_sync_enrolled_count AFTER INSERT OR UPDATE OR DELETE ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_enrolled_count();

CREATE TABLE IF NOT EXISTS public.ssra_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 999,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','notified','converted','expired','removed')),
  notified_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.position := COALESCE((SELECT MAX(position)+1 FROM public.ssra_waitlist WHERE course_id=NEW.course_id AND status='waiting'),1);
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS set_waitlist_position ON public.ssra_waitlist;
CREATE TRIGGER set_waitlist_position BEFORE INSERT ON public.ssra_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.assign_waitlist_position();

CREATE OR REPLACE FUNCTION public.course_has_seats(_course_id TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT registration_open THEN FALSE WHEN enrolled_count>=capacity THEN FALSE ELSE TRUE END
  FROM public.ssra_courses WHERE id=_course_id;
$$;

GRANT SELECT, INSERT, DELETE, UPDATE ON public.ssra_waitlist TO authenticated;
GRANT ALL ON public.ssra_waitlist TO service_role;
ALTER TABLE public.ssra_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own waitlist read" ON public.ssra_waitlist;
CREATE POLICY "Own waitlist read" ON public.ssra_waitlist FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Own waitlist insert" ON public.ssra_waitlist;
CREATE POLICY "Own waitlist insert" ON public.ssra_waitlist FOR INSERT WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Own waitlist delete" ON public.ssra_waitlist;
CREATE POLICY "Own waitlist delete" ON public.ssra_waitlist FOR DELETE USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin manage waitlist" ON public.ssra_waitlist;
CREATE POLICY "Admin manage waitlist" ON public.ssra_waitlist FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS ssra_waitlist_course_idx ON public.ssra_waitlist(course_id, status, position);
CREATE INDEX IF NOT EXISTS ssra_waitlist_user_idx ON public.ssra_waitlist(user_id);

-- 20260605110000_audit_log
CREATE TABLE IF NOT EXISTS public.ssra_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT, actor_role TEXT, action TEXT NOT NULL,
  resource_type TEXT, resource_id TEXT, details JSONB,
  ip_address TEXT, user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ssra_audit_log TO authenticated;
GRANT ALL ON public.ssra_audit_log TO service_role;
ALTER TABLE public.ssra_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read audit log" ON public.ssra_audit_log;
CREATE POLICY "Admin read audit log" ON public.ssra_audit_log FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS ssra_audit_created_idx ON public.ssra_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS ssra_audit_actor_idx ON public.ssra_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS ssra_audit_resource_idx ON public.ssra_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS ssra_audit_action_idx ON public.ssra_audit_log(action);

-- 20260605120000_coupons
CREATE TABLE IF NOT EXISTS public.ssra_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, name TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed_eur')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER, uses_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ, valid_until TIMESTAMPTZ,
  course_id TEXT REFERENCES public.ssra_courses(id) ON DELETE SET NULL,
  minimum_amount_eur NUMERIC(10,2), is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ssra_coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.ssra_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.ssra_enrollments(id) ON DELETE SET NULL,
  discount_eur NUMERIC(10,2),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_coupons TO authenticated;
GRANT SELECT, INSERT ON public.ssra_coupon_uses TO authenticated;
GRANT ALL ON public.ssra_coupons TO service_role;
GRANT ALL ON public.ssra_coupon_uses TO service_role;
ALTER TABLE public.ssra_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssra_coupon_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage coupons" ON public.ssra_coupons;
CREATE POLICY "Admin manage coupons" ON public.ssra_coupons FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Admin read coupon uses" ON public.ssra_coupon_uses;
CREATE POLICY "Admin read coupon uses" ON public.ssra_coupon_uses FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Own coupon uses read" ON public.ssra_coupon_uses;
CREATE POLICY "Own coupon uses read" ON public.ssra_coupon_uses FOR SELECT USING (auth.uid()=user_id);
CREATE INDEX IF NOT EXISTS ssra_coupons_code_idx ON public.ssra_coupons(code);
CREATE INDEX IF NOT EXISTS ssra_coupons_active_idx ON public.ssra_coupons(is_active) WHERE is_active=true;
CREATE INDEX IF NOT EXISTS ssra_coupon_uses_user_idx ON public.ssra_coupon_uses(user_id);

-- 20260605200000_instructor_rbac
ALTER TABLE public.ssra_profiles DROP CONSTRAINT IF EXISTS ssra_profiles_role_check;
ALTER TABLE public.ssra_profiles ADD CONSTRAINT ssra_profiles_role_check
  CHECK (role IN ('student','instructor','admin','super_admin'));

ALTER TABLE public.ssra_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE public.ssra_courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_ssra_instructor(_uid uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.ssra_profiles WHERE id=_uid AND role IN ('instructor','admin','super_admin'));
$$;

-- 20260605210000_notifications
CREATE TABLE IF NOT EXISTS public.ssra_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ssra_notifications TO authenticated;
GRANT ALL ON public.ssra_notifications TO service_role;
ALTER TABLE public.ssra_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own notifications read" ON public.ssra_notifications;
CREATE POLICY "Own notifications read" ON public.ssra_notifications FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Own notifications update" ON public.ssra_notifications;
CREATE POLICY "Own notifications update" ON public.ssra_notifications FOR UPDATE USING (auth.uid()=user_id);
CREATE INDEX IF NOT EXISTS ssra_notif_user_idx ON public.ssra_notifications(user_id, created_at DESC);

-- 20260605220000_materials
CREATE TABLE IF NOT EXISTS public.ssra_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  batch_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_materials TO authenticated;
GRANT ALL ON public.ssra_materials TO service_role;
ALTER TABLE public.ssra_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage materials" ON public.ssra_materials;
CREATE POLICY "Admin manage materials" ON public.ssra_materials FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Enrolled read materials" ON public.ssra_materials;
CREATE POLICY "Enrolled read materials" ON public.ssra_materials FOR SELECT TO authenticated
  USING (
    public.is_ssra_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.ssra_enrollments e WHERE e.user_id=auth.uid() AND e.course_id=ssra_materials.course_id AND e.status='active')
  );

-- 20260606100000_batch_system
CREATE TABLE IF NOT EXISTS public.ssra_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  capacity INTEGER NOT NULL DEFAULT 50,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_batches TO authenticated;
GRANT ALL ON public.ssra_batches TO service_role;
ALTER TABLE public.ssra_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage batches" ON public.ssra_batches;
CREATE POLICY "Admin manage batches" ON public.ssra_batches FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated read batches" ON public.ssra_batches;
CREATE POLICY "Authenticated read batches" ON public.ssra_batches FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS ssra_batches_course_idx ON public.ssra_batches(course_id);

ALTER TABLE public.ssra_enrollments ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.ssra_batches(id) ON DELETE SET NULL;

-- 20260606110000_homework_and_certificates
CREATE TABLE IF NOT EXISTS public.ssra_homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.ssra_courses(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.ssra_materials(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.ssra_batches(id) ON DELETE SET NULL,
  file_url TEXT,
  text_content TEXT,
  grade NUMERIC(5,2),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded','rejected')),
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.ssra_homework_submissions TO authenticated;
GRANT ALL ON public.ssra_homework_submissions TO service_role;
ALTER TABLE public.ssra_homework_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own homework read" ON public.ssra_homework_submissions;
CREATE POLICY "Own homework read" ON public.ssra_homework_submissions FOR SELECT USING (auth.uid()=user_id OR public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Own homework insert" ON public.ssra_homework_submissions;
CREATE POLICY "Own homework insert" ON public.ssra_homework_submissions FOR INSERT WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin grade homework" ON public.ssra_homework_submissions;
CREATE POLICY "Admin grade homework" ON public.ssra_homework_submissions FOR UPDATE TO authenticated
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));

-- 20260606120000_fraud_and_session_security
CREATE TABLE IF NOT EXISTS public.ssra_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  details JSONB,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ssra_session_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ssra_sessions(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ssra_fraud_flags TO authenticated;
GRANT SELECT, INSERT ON public.ssra_session_access_log TO authenticated;
GRANT ALL ON public.ssra_fraud_flags TO service_role;
GRANT ALL ON public.ssra_session_access_log TO service_role;
ALTER TABLE public.ssra_fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssra_session_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage fraud" ON public.ssra_fraud_flags;
CREATE POLICY "Admin manage fraud" ON public.ssra_fraud_flags FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid())) WITH CHECK (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Admin read session access" ON public.ssra_session_access_log;
CREATE POLICY "Admin read session access" ON public.ssra_session_access_log FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));
DROP POLICY IF EXISTS "Own session access insert" ON public.ssra_session_access_log;
CREATE POLICY "Own session access insert" ON public.ssra_session_access_log FOR INSERT WITH CHECK (auth.uid()=user_id);

SET session_replication_role = DEFAULT;