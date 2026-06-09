-- ─────────────────────────────────────────────────────────────────────────────
-- Missing triggers audit fix
--
-- This migration wires the reactions that were previously silent:
--
--   1. Session cancelled       → in-app notification to all enrolled students
--   2. Session created/deleted → audit log entry
--   3. Course updated          → audit log entry (price / status / capacity)
--   4. Enrollment changed      → system_events bus
--   5. Certificate issued/revoked → in-app notification + system_events
--   6. Subscription past_due / cancelled → in-app notification + system_events
--   7. Fraud flag raised       → in-app notification to all admins + system_events
--   8. Batch status changed    → audit log entry
--   9. Material uploaded       → in-app notification to enrolled students (optional)
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 & 2.  ssra_sessions  →  audit + student notification on cancel
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_session_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text;
  v_actor_role  text;
BEGIN
  SELECT email, role INTO v_actor_email, v_actor_role
    FROM public.ssra_profiles WHERE id = auth.uid();

  -- ── INSERT ──────────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ssra_audit_log (
      actor_id, actor_email, actor_role, action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(), v_actor_email, v_actor_role,
      'session_created', 'ssra_session', NEW.id::text,
      jsonb_build_object(
        'title',        NEW.title,
        'course_id',    NEW.course_id,
        'scheduled_at', NEW.scheduled_at
      )
    );

    PERFORM public.emit_event(
      'SessionCreated', 'session', NEW.id::text,
      jsonb_build_object('course_id', NEW.course_id, 'scheduled_at', NEW.scheduled_at)
    );

  -- ── Session just cancelled ───────────────────────────────────────────────
  ELSIF TG_OP = 'UPDATE' AND NEW.is_cancelled = true AND OLD.is_cancelled = false THEN

    INSERT INTO public.ssra_audit_log (
      actor_id, actor_email, actor_role, action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(), v_actor_email, v_actor_role,
      'session_cancelled', 'ssra_session', NEW.id::text,
      jsonb_build_object(
        'title',            NEW.title,
        'course_id',        NEW.course_id,
        'was_scheduled_at', OLD.scheduled_at
      )
    );

    -- Notify all enrolled students
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    SELECT DISTINCT e.user_id,
           'session_cancelled',
           'Session cancelled: ' || NEW.title,
           'The session scheduled for ' ||
             to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI') ||
             ' UTC has been cancelled.',
           '/dashboard/sessions'
    FROM public.ssra_enrollments e
    WHERE e.course_id = NEW.course_id
      AND e.status = 'active'
    ON CONFLICT DO NOTHING;

    -- Also notify active subscribers
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    SELECT DISTINCT s.user_id,
           'session_cancelled',
           'Session cancelled: ' || NEW.title,
           'The session scheduled for ' ||
             to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI') ||
             ' UTC has been cancelled.',
           '/dashboard/sessions'
    FROM public.ssra_subscriptions s
    WHERE s.course_id = NEW.course_id
      AND s.status IN ('active', 'trialing')
    ON CONFLICT DO NOTHING;

    PERFORM public.emit_event(
      'SessionCancelled', 'session', NEW.id::text,
      jsonb_build_object('course_id', NEW.course_id, 'title', NEW.title)
    );

  -- ── DELETE ───────────────────────────────────────────────────────────────
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.ssra_audit_log (
      actor_id, actor_email, actor_role, action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(), v_actor_email, v_actor_role,
      'session_deleted', 'ssra_session', OLD.id::text,
      jsonb_build_object('title', OLD.title, 'course_id', OLD.course_id)
    );

    PERFORM public.emit_event(
      'SessionDeleted', 'session', OLD.id::text,
      jsonb_build_object('course_id', OLD.course_id, 'title', OLD.title)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_session_lifecycle ON public.ssra_sessions;
CREATE TRIGGER trg_session_lifecycle
  AFTER INSERT OR UPDATE OR DELETE ON public.ssra_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_session_lifecycle();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  ssra_courses  →  audit log on meaningful changes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.log_course_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text;
  v_actor_role  text;
  v_changes     jsonb := '{}';
BEGIN
  IF NEW.title            IS DISTINCT FROM OLD.title THEN
    v_changes := v_changes || jsonb_build_object('title', jsonb_build_array(OLD.title, NEW.title));
  END IF;
  IF NEW.price_eur        IS DISTINCT FROM OLD.price_eur THEN
    v_changes := v_changes || jsonb_build_object('price_eur', jsonb_build_array(OLD.price_eur, NEW.price_eur));
  END IF;
  IF NEW.is_active        IS DISTINCT FROM OLD.is_active THEN
    v_changes := v_changes || jsonb_build_object('is_active', jsonb_build_array(OLD.is_active, NEW.is_active));
  END IF;
  IF NEW.capacity         IS DISTINCT FROM OLD.capacity THEN
    v_changes := v_changes || jsonb_build_object('capacity', jsonb_build_array(OLD.capacity, NEW.capacity));
  END IF;
  IF NEW.registration_open IS DISTINCT FROM OLD.registration_open THEN
    v_changes := v_changes || jsonb_build_object('registration_open',
      jsonb_build_array(OLD.registration_open, NEW.registration_open));
  END IF;
  IF NEW.waitlist_enabled IS DISTINCT FROM OLD.waitlist_enabled THEN
    v_changes := v_changes || jsonb_build_object('waitlist_enabled',
      jsonb_build_array(OLD.waitlist_enabled, NEW.waitlist_enabled));
  END IF;

  -- Nothing meaningful changed (e.g. only updated_at bumped)
  IF v_changes = '{}' THEN RETURN NEW; END IF;

  SELECT email, role INTO v_actor_email, v_actor_role
    FROM public.ssra_profiles WHERE id = auth.uid();

  INSERT INTO public.ssra_audit_log (
    actor_id, actor_email, actor_role, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), v_actor_email, v_actor_role,
    'course_updated', 'ssra_course', NEW.id,
    jsonb_build_object('course_title', NEW.title, 'changes', v_changes)
  );

  PERFORM public.emit_event(
    'CourseUpdated', 'course', NEW.id,
    jsonb_build_object('changes', v_changes, 'title', NEW.title)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_course_changes ON public.ssra_courses;
CREATE TRIGGER trg_log_course_changes
  AFTER UPDATE ON public.ssra_courses
  FOR EACH ROW EXECUTE FUNCTION public.log_course_changes();

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  ssra_enrollments  →  system_events bus
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.emit_enrollment_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_event(
      'EnrollmentCreated', 'enrollment', NEW.id::text, NEW.user_id,
      jsonb_build_object('user_id', NEW.user_id, 'course_id', NEW.course_id, 'status', NEW.status)
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active' THEN
    PERFORM public.emit_event(
      'EnrollmentActivated', 'enrollment', NEW.id::text, NEW.user_id,
      jsonb_build_object('user_id', NEW.user_id, 'course_id', NEW.course_id, 'amount_eur', NEW.amount_eur)
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM public.emit_event(
      'EnrollmentCancelled', 'enrollment', NEW.id::text, NEW.user_id,
      jsonb_build_object('user_id', NEW.user_id, 'course_id', NEW.course_id)
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
    PERFORM public.emit_event(
      'RefundCompleted', 'enrollment', NEW.id::text, NEW.user_id,
      jsonb_build_object('user_id', NEW.user_id, 'course_id', NEW.course_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Emit the 4-arg variant (no actor) from inside a trigger
CREATE OR REPLACE FUNCTION public.emit_event(
  p_event_type   text,
  p_entity_type  text,
  p_entity_id    text,
  p_actor_id     uuid,
  p_payload      jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.system_events
    (id, event_type, entity_type, entity_id, actor_id, payload)
  VALUES
    (v_id, p_event_type, p_entity_type, p_entity_id, p_actor_id, p_payload);
  RETURN v_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_enrollment_events ON public.ssra_enrollments;
CREATE TRIGGER trg_emit_enrollment_events
  AFTER INSERT OR UPDATE OF status ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.emit_enrollment_events();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  ssra_certificates  →  in-app notification + system_events
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_certificate_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.revoked THEN
    -- In-app notification
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'certificate_issued',
      'Certificate issued: ' || COALESCE(NEW.course_title, 'your course'),
      'Congratulations! Your certificate has been issued. Code: ' || NEW.certificate_code,
      '/dashboard/certificates'
    );

    PERFORM public.emit_event(
      'CertificateIssued', 'certificate', NEW.id::text,
      jsonb_build_object(
        'user_id',          NEW.user_id,
        'course_id',        NEW.course_id,
        'certificate_code', NEW.certificate_code,
        'student_name',     NEW.student_name
      )
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.revoked = true AND OLD.revoked = false THEN
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'certificate_revoked',
      'Certificate revoked: ' || COALESCE(NEW.course_title, 'your course'),
      'Your certificate has been revoked. Reason: ' ||
        COALESCE(NEW.revoked_reason, 'No reason provided.'),
      '/dashboard/certificates'
    );

    PERFORM public.emit_event(
      'CertificateRevoked', 'certificate', NEW.id::text,
      jsonb_build_object(
        'user_id',        NEW.user_id,
        'course_id',      NEW.course_id,
        'revoked_reason', NEW.revoked_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_certificate_lifecycle ON public.ssra_certificates;
CREATE TRIGGER trg_handle_certificate_lifecycle
  AFTER INSERT OR UPDATE OF revoked ON public.ssra_certificates
  FOR EACH ROW EXECUTE FUNCTION public.handle_certificate_lifecycle();

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  ssra_subscriptions  →  in-app notification + system_events on status change
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_subscription_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title text;
  v_access_until text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT title INTO v_course_title FROM public.ssra_courses WHERE id = NEW.course_id;

  -- ── Past due ─────────────────────────────────────────────────────────────
  IF NEW.status = 'past_due' AND OLD.status != 'past_due' THEN
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'subscription_past_due',
      'Payment required: ' || COALESCE(v_course_title, 'your subscription'),
      'Your subscription payment is overdue. Update your payment method to keep access.',
      '/dashboard/subscription'
    );

    PERFORM public.emit_event(
      'SubscriptionPastDue', 'subscription', NEW.id::text,
      jsonb_build_object('user_id', NEW.user_id, 'course_id', NEW.course_id)
    );
  END IF;

  -- ── Cancelled ────────────────────────────────────────────────────────────
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    v_access_until := to_char(
      NEW.current_period_end AT TIME ZONE 'UTC', 'DD Mon YYYY'
    );

    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'subscription_cancelled',
      'Subscription ended: ' || COALESCE(v_course_title, 'your course'),
      'Your subscription has ended. Access retained until ' || COALESCE(v_access_until, 'end of period') || '.',
      '/dashboard/subscription'
    );

    PERFORM public.emit_event(
      'SubscriptionCancelled', 'subscription', NEW.id::text,
      jsonb_build_object(
        'user_id',    NEW.user_id,
        'course_id',  NEW.course_id,
        'access_until', NEW.current_period_end
      )
    );
  END IF;

  -- ── Renewed / reactivated ────────────────────────────────────────────────
  IF NEW.status = 'active' AND OLD.status IN ('past_due', 'canceled', 'paused') THEN
    PERFORM public.emit_event(
      'SubscriptionReactivated', 'subscription', NEW.id::text,
      jsonb_build_object('user_id', NEW.user_id, 'course_id', NEW.course_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_subscription_status ON public.ssra_subscriptions;
CREATE TRIGGER trg_handle_subscription_status
  AFTER UPDATE OF status ON public.ssra_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_subscription_status_change();

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  ssra_fraud_flags  →  notify ALL admins + system_events
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_fraud_flag_raised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
BEGIN
  IF TG_OP != 'INSERT' OR NEW.resolved THEN RETURN NEW; END IF;

  SELECT full_name INTO v_student_name
    FROM public.ssra_profiles WHERE id = NEW.user_id;

  -- Notify all admins and super_admins
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  SELECT p.id,
         'fraud_flag',
         '⚠ Fraud flag [' || NEW.severity || ']: ' || NEW.flag_type,
         COALESCE(v_student_name, 'Unknown user') || ' — ' ||
           COALESCE(NEW.description, NEW.flag_type),
         '/ssra-admin/fraud'
  FROM public.ssra_profiles p
  WHERE p.role IN ('admin', 'super_admin')
  ON CONFLICT DO NOTHING;

  PERFORM public.emit_event(
    'FraudFlagRaised', 'fraud_flag', NEW.id::text,
    jsonb_build_object(
      'user_id',       NEW.user_id,
      'flag_type',     NEW.flag_type,
      'severity',      NEW.severity,
      'auto_detected', NEW.auto_detected
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_fraud_flag_raised ON public.ssra_fraud_flags;
CREATE TRIGGER trg_handle_fraud_flag_raised
  AFTER INSERT ON public.ssra_fraud_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_fraud_flag_raised();

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  ssra_batches  →  audit log on status changes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.log_batch_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text;
  v_actor_role  text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT email, role INTO v_actor_email, v_actor_role
    FROM public.ssra_profiles WHERE id = auth.uid();

  INSERT INTO public.ssra_audit_log (
    actor_id, actor_email, actor_role, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), v_actor_email, v_actor_role,
    'batch_status_changed', 'ssra_batch', NEW.id::text,
    jsonb_build_object(
      'batch_name',  NEW.name,
      'course_id',   NEW.course_id,
      'from_status', OLD.status,
      'to_status',   NEW.status
    )
  );

  PERFORM public.emit_event(
    'BatchStatusChanged', 'batch', NEW.id::text,
    jsonb_build_object(
      'from_status', OLD.status,
      'to_status',   NEW.status,
      'course_id',   NEW.course_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_batch_status_changes ON public.ssra_batches;
CREATE TRIGGER trg_log_batch_status_changes
  AFTER UPDATE OF status ON public.ssra_batches
  FOR EACH ROW EXECUTE FUNCTION public.log_batch_status_changes();

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  ssra_materials  →  notify enrolled students when material published
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_students_on_material_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title text;
BEGIN
  -- Only fire when is_visible transitions from false → true (or new visible insert)
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.is_visible = true) OR
    (TG_OP = 'UPDATE' AND NEW.is_visible = true AND OLD.is_visible = false)
  ) THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_course_title FROM public.ssra_courses WHERE id = NEW.course_id;

  -- Only create notifications for users who have dashboard_materials_uploaded=true
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  SELECT DISTINCT e.user_id,
         'material_uploaded',
         'New material: ' || COALESCE(v_course_title, 'your course'),
         '"' || NEW.title || '" has been published.',
         '/dashboard/materials'
  FROM public.ssra_enrollments e
  JOIN public.ssra_notification_preferences np ON np.user_id = e.user_id
  WHERE e.course_id = NEW.course_id
    AND e.status = 'active'
    AND np.dashboard_materials_uploaded = true
  ON CONFLICT DO NOTHING;

  -- Subscribers too
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  SELECT DISTINCT s.user_id,
         'material_uploaded',
         'New material: ' || COALESCE(v_course_title, 'your course'),
         '"' || NEW.title || '" has been published.',
         '/dashboard/materials'
  FROM public.ssra_subscriptions s
  JOIN public.ssra_notification_preferences np ON np.user_id = s.user_id
  WHERE s.course_id = NEW.course_id
    AND s.status IN ('active', 'trialing')
    AND np.dashboard_materials_uploaded = true
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_material_published ON public.ssra_materials;
CREATE TRIGGER trg_notify_on_material_published
  AFTER INSERT OR UPDATE OF is_visible ON public.ssra_materials
  FOR EACH ROW EXECUTE FUNCTION public.notify_students_on_material_published();

-- ══════════════════════════════════════════════════════════════════════════════
-- Add new notification types to NotificationBell color map
-- (No SQL needed — type column is plain text, no constraint to update)
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- Ensure Realtime is enabled for tables that drive live dashboards
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['system_events', 'ssra_reconciliation_reports'] LOOP
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END;
$$;
