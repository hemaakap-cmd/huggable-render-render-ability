-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: waitlist promotion trigger-ordering bug
--
-- Found while writing the E2E database integration tests for the promotion
-- flow (e2e/specs/api-database-flows.spec.ts).
--
-- PostgreSQL fires same-event AFTER triggers in ALPHABETICAL name order:
--   trg_emit_enrollment_events  →  trg_promote_next_waitlist  →  trg_sync_enrolled_count
--
-- promote_next_waitlist_entry() therefore ran BEFORE the enrolled_count
-- decrement, so for a FULL course (enrolled_count == capacity) the seat check
-- `enrolled_count < capacity` still saw the pre-cancellation count and the
-- promotion silently never happened — precisely the case the feature exists
-- for.
--
-- Fix: count active enrollments directly from ssra_enrollments. At AFTER
-- UPDATE time the cancelled row already has its new status in the table, so
-- a direct count is correct regardless of trigger ordering — and it stays
-- correct even if trigger names (and thus their order) change in the future.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.promote_next_waitlist_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_waiter  RECORD;
  v_course_title TEXT;
  v_has_seat     BOOLEAN;
BEGIN
  -- Only fires when an active enrollment becomes cancelled or refunded.
  IF OLD.status != 'active' OR NEW.status NOT IN ('cancelled', 'refunded') THEN
    RETURN NEW;
  END IF;

  -- Seat check via DIRECT count of active enrollments (this row is already
  -- non-active in the table), not via the enrolled_count counter which may
  -- not have been decremented yet (trigger-ordering hazard).
  SELECT c.registration_open
         AND (
           SELECT COUNT(*) FROM public.ssra_enrollments e
           WHERE e.course_id = c.id AND e.status = 'active'
         ) < c.capacity
  INTO   v_has_seat
  FROM   public.ssra_courses c
  WHERE  c.id = NEW.course_id;

  IF NOT COALESCE(v_has_seat, false) THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO   v_next_waiter
  FROM   public.ssra_waitlist
  WHERE  course_id = NEW.course_id
    AND  status    = 'waiting'
  ORDER  BY position ASC
  LIMIT  1;

  IF v_next_waiter IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_course_title
  FROM   public.ssra_courses
  WHERE  id = NEW.course_id;

  UPDATE public.ssra_waitlist
  SET
    status      = 'notified',
    notified_at = now(),
    expires_at  = now() + INTERVAL '48 hours',
    updated_at  = now()
  WHERE id = v_next_waiter.id;

  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  VALUES (
    v_next_waiter.user_id,
    'waitlist_promoted',
    'A seat is available: ' || COALESCE(v_course_title, 'your waitlisted course'),
    'Good news! A seat has opened up. You have 48 hours to complete your enrollment before it is offered to the next person on the list.',
    '/courses/' || NEW.course_id
  )
  ON CONFLICT DO NOTHING;

  PERFORM public.emit_event(
    'WaitlistPromoted',
    'waitlist',
    v_next_waiter.id::text,
    jsonb_build_object(
      'user_id',    v_next_waiter.user_id,
      'course_id',  NEW.course_id,
      'position',   v_next_waiter.position,
      'expires_at', (now() + INTERVAL '48 hours')::text
    )
  );

  RETURN NEW;
END;
$$;
