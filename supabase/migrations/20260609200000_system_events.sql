-- ─────────────────────────────────────────────────────────────────────────────
-- system_events  —  Immutable event bus
--
-- Every important domain state change MUST emit a row here.
-- Rules:
--   • Never DELETE rows.
--   • Never UPDATE rows.
--   • Insert is append-only (enforced by deny policy).
--   • entity_id is TEXT so it works for both UUID and TEXT primary keys.
--   • correlation_id groups events belonging to the same business flow
--     (e.g. a PaymentCompleted + EnrollmentActivated + EmailSent that all
--     came from the same Paddle webhook).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     text        NOT NULL,
  actor_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email    text,
  entity_type    text        NOT NULL,
  entity_id      text        NOT NULL,
  correlation_id uuid,
  payload        jsonb       NOT NULL DEFAULT '{}',
  environment    text        NOT NULL DEFAULT 'production',
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_events IS
  'Immutable event bus. Append-only. Do not delete or update rows.';

CREATE INDEX IF NOT EXISTS idx_system_events_type
  ON public.system_events (event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_entity
  ON public.system_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_events_occurred
  ON public.system_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_actor
  ON public.system_events (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_events_correlation
  ON public.system_events (correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (edge functions + triggers write events)
CREATE POLICY "system_events: service_role full access"
  ON public.system_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins can read for observability; no one else can write via RLS
CREATE POLICY "system_events: admin read"
  ON public.system_events FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

-- Append-only guard — prevent UPDATE and DELETE via RLS (for authenticated users)
-- INSERT is allowed only by service_role via the policy above.
-- Authenticated users (including admins) can only SELECT.

-- ─── Helper: emit_event() ────────────────────────────────────────────────────
-- Called from PL/pgSQL triggers to append a system event.
-- Uses SECURITY DEFINER so triggers running as the session user can still
-- write to this table (service_role check is bypassed inside triggers).
CREATE OR REPLACE FUNCTION public.emit_event(
  p_event_type   text,
  p_entity_type  text,
  p_entity_id    text,
  p_payload      jsonb DEFAULT '{}',
  p_actor_id     uuid  DEFAULT NULL,
  p_correlation  uuid  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.system_events
    (id, event_type, entity_type, entity_id, payload, actor_id, correlation_id)
  VALUES
    (v_id, p_event_type, p_entity_type, p_entity_id, p_payload, p_actor_id, p_correlation);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emit_event TO service_role;
