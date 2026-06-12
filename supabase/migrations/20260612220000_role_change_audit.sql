-- ─────────────────────────────────────────────────────────────────────────────
-- Role-change audit trail
--
-- Gap found in ecosystem audit: useSetUserRole() updates ssra_profiles.role
-- directly with NO audit record, NO system event, and NO notification. A
-- privilege escalation (student → super_admin) would be invisible.
--
-- This trigger makes every role change:
--   1. Recorded in ssra_audit_log (who changed whom, from what, to what)
--   2. Emitted on the system_events bus (RoleChanged)
--   3. Notified in-app to ALL super_admins (privilege changes are sensitive)
--   4. Notified in-app to the affected user
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text;
  v_actor_role  text;
  v_is_escalation boolean;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN RETURN NEW; END IF;

  SELECT email, role INTO v_actor_email, v_actor_role
    FROM public.ssra_profiles WHERE id = auth.uid();

  -- Escalations into admin/super_admin are the highest-sensitivity changes
  v_is_escalation := NEW.role IN ('admin', 'super_admin')
                     AND OLD.role NOT IN ('admin', 'super_admin');

  INSERT INTO public.ssra_audit_log (
    actor_id, actor_email, actor_role, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), v_actor_email, v_actor_role,
    'role_changed', 'ssra_profile', NEW.id::text,
    jsonb_build_object(
      'target_email', NEW.email,
      'target_name',  NEW.full_name,
      'from_role',    OLD.role,
      'to_role',      NEW.role,
      'escalation',   v_is_escalation
    )
  );

  PERFORM public.emit_event(
    'RoleChanged', 'profile', NEW.id::text,
    jsonb_build_object(
      'from_role',  OLD.role,
      'to_role',    NEW.role,
      'escalation', v_is_escalation,
      'changed_by', auth.uid()
    )
  );

  -- Alert all super_admins (skip the actor — they made the change)
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  SELECT p.id,
         'role_changed',
         CASE WHEN v_is_escalation THEN '⚠ Privilege escalation: ' ELSE 'Role changed: ' END
           || COALESCE(NEW.full_name, NEW.email, NEW.id::text),
         COALESCE(NEW.email, 'User') || ' changed from ' || OLD.role || ' to ' || NEW.role
           || ' by ' || COALESCE(v_actor_email, 'system'),
         '/ssra-admin/admins'
  FROM public.ssra_profiles p
  WHERE p.role = 'super_admin'
    AND p.id IS DISTINCT FROM auth.uid()
  ON CONFLICT DO NOTHING;

  -- Tell the affected user their access level changed
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id,
    'role_changed',
    'Your account role has changed',
    'Your role is now: ' || NEW.role || '. Sign out and back in to refresh your access.',
    '/dashboard'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_role_change ON public.ssra_profiles;
CREATE TRIGGER trg_handle_role_change
  AFTER UPDATE OF role ON public.ssra_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_role_change();
