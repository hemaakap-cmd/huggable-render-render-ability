-- ─────────────────────────────────────────────────────────────────────────────
-- Waitlist Auto-Promotion
--
-- Previously: when an enrollment was cancelled/refunded, waitlisted students
-- were never automatically notified — an admin had to manually check the
-- waitlist and send emails.
--
-- This migration wires up automatic promotion:
--   1. Adds email_sent to ssra_waitlist so the edge function can track which
--      promoted entries have had their email dispatched.
--   2. Creates promote_next_waitlist_entry() — fires AFTER an enrollment
--      changes from 'active' → 'cancelled'/'refunded'. It:
--        a. Verifies the course now has an open seat.
--        b. Promotes the next 'waiting' entry to 'notified', setting a 48-hour
--           enrollment window (expires_at).
--        c. Creates an in-app notification immediately.
--        d. Emits a WaitlistPromoted system event for observability.
--   3. The hourly edge function notify-waitlist-promotion picks up newly
--      promoted rows (email_sent = false) and sends the waitlist-seat-open
--      transactional email.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add email_sent tracking column ────────────────────────────────────────
ALTER TABLE public.ssra_waitlist
  ADD COLUMN IF NOT EXISTS email_sent     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at  TIMESTAMPTZ;

-- Index: the edge function looks for notified+unsent rows hourly
CREATE INDEX IF NOT EXISTS idx_waitlist_unsent_notifications
  ON public.ssra_waitlist (status, email_sent, notified_at)
  WHERE status = 'notified' AND email_sent = false;

-- ── 2. Auto-promotion trigger function ───────────────────────────────────────
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

  -- Confirm the course genuinely has a seat open now (the sync_course_enrolled_count
  -- trigger decrements enrolled_count before this trigger runs on the same row,
  -- so the count is already correct by the time we check).
  SELECT (enrolled_count < capacity AND registration_open)
  INTO   v_has_seat
  FROM   public.ssra_courses
  WHERE  id = NEW.course_id;

  IF NOT v_has_seat THEN
    RETURN NEW;
  END IF;

  -- Find the highest-priority waiting entry (lowest position = joined earliest).
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

  -- Promote: mark as notified, set 48-hour window.
  UPDATE public.ssra_waitlist
  SET
    status      = 'notified',
    notified_at = now(),
    expires_at  = now() + INTERVAL '48 hours',
    updated_at  = now()
  WHERE id = v_next_waiter.id;

  -- In-app notification (immediate, before the email arrives).
  INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
  VALUES (
    v_next_waiter.user_id,
    'waitlist_promoted',
    'A seat is available: ' || COALESCE(v_course_title, 'your waitlisted course'),
    'Good news! A seat has opened up. You have 48 hours to complete your enrollment before it is offered to the next person on the list.',
    '/courses/' || NEW.course_id
  )
  ON CONFLICT DO NOTHING;

  -- System event for the observability bus.
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

-- Trigger must run AFTER the enrolled_count decrement trigger
-- (trg_sync_enrolled_count) has already updated the course row.
DROP TRIGGER IF EXISTS trg_promote_next_waitlist ON public.ssra_enrollments;
CREATE TRIGGER trg_promote_next_waitlist
  AFTER UPDATE OF status ON public.ssra_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.promote_next_waitlist_entry();

-- ── 3. pg_cron: call notify-waitlist-promotion every 15 minutes ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('notify-waitlist-promotion')
      FROM cron.job WHERE jobname = 'notify-waitlist-promotion';

    PERFORM cron.schedule(
      'notify-waitlist-promotion',
      '*/15 * * * *',
      $$
      SELECT net.http_post(
        url     := current_setting('app.supabase_url', true) || '/functions/v1/notify-waitlist-promotion',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body    := '{}'::jsonb
      );
      $$
    );
  END IF;
END;
$$;

-- ── RLS update: service_role can update email_sent ────────────────────────────
-- (Already covered by the existing service_role grant; no new policy needed.)
