-- ============================================================
-- Webhook Events Log
-- Immutable record of every Paddle webhook received.
-- Used by health dashboard and operations monitoring.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssra_webhook_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT        NOT NULL,
  event_id      TEXT,                  -- Paddle notification ID (idempotency)
  environment   TEXT        NOT NULL DEFAULT 'sandbox',
  status        TEXT        NOT NULL DEFAULT 'processed'
                            CHECK (status IN ('processed', 'failed', 'skipped')),
  error_message TEXT,
  payload       JSONB,                 -- sanitised event data (no card numbers)
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only service_role writes; admins read
ALTER TABLE public.ssra_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read webhook events" ON public.ssra_webhook_events
  FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

GRANT SELECT ON public.ssra_webhook_events TO authenticated;
GRANT ALL    ON public.ssra_webhook_events TO service_role;

-- Deduplicate by Paddle event_id to prevent double-processing
CREATE UNIQUE INDEX IF NOT EXISTS ssra_webhook_events_event_id_uniq
  ON public.ssra_webhook_events (event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ssra_webhook_events_processed_idx ON public.ssra_webhook_events (processed_at DESC);
CREATE INDEX IF NOT EXISTS ssra_webhook_events_status_idx    ON public.ssra_webhook_events (status, processed_at DESC);
CREATE INDEX IF NOT EXISTS ssra_webhook_events_type_idx      ON public.ssra_webhook_events (event_type, processed_at DESC);
