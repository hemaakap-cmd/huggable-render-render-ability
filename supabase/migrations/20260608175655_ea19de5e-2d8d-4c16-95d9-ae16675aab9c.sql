
-- 1. Immutable revenue ledger
CREATE TABLE IF NOT EXISTS public.revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paddle_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  paddle_transaction_id text,
  paddle_subscription_id text,
  paddle_customer_id text,
  user_id uuid,
  course_id text,
  enrollment_id uuid,
  amount_cents bigint NOT NULL DEFAULT 0,
  fee_cents bigint NOT NULL DEFAULT 0,
  tax_cents bigint NOT NULL DEFAULT 0,
  net_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')) DEFAULT 'credit',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_events_occurred_at ON public.revenue_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_user_id ON public.revenue_events(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_env_type ON public.revenue_events(environment, event_type);
CREATE INDEX IF NOT EXISTS idx_revenue_events_txn ON public.revenue_events(paddle_transaction_id);

GRANT SELECT ON public.revenue_events TO authenticated;
GRANT ALL ON public.revenue_events TO service_role;

ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

-- Admins read all; nobody can update/delete (immutable ledger)
CREATE POLICY "Admins can read revenue events"
  ON public.revenue_events FOR SELECT
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Service role manages revenue events"
  ON public.revenue_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Belt-and-suspenders: block updates/deletes even from anyone bypassing policies via trigger
CREATE OR REPLACE FUNCTION public.prevent_revenue_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'revenue_events is an immutable ledger; % not allowed', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS revenue_events_no_update ON public.revenue_events;
CREATE TRIGGER revenue_events_no_update
  BEFORE UPDATE ON public.revenue_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_revenue_event_mutation();

DROP TRIGGER IF EXISTS revenue_events_no_delete ON public.revenue_events;
CREATE TRIGGER revenue_events_no_delete
  BEFORE DELETE ON public.revenue_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_revenue_event_mutation();

-- 2. Reporting helper for admin dashboards
CREATE OR REPLACE FUNCTION public.get_revenue_summary(
  _from timestamptz,
  _to timestamptz,
  _env text DEFAULT 'live'
)
RETURNS TABLE(
  gross_cents bigint,
  refund_cents bigint,
  chargeback_cents bigint,
  fee_cents bigint,
  tax_cents bigint,
  net_cents bigint,
  event_count bigint,
  currency text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_cents ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN event_type LIKE 'adjustment.%' AND direction = 'debit' THEN amount_cents ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN event_type LIKE '%chargeback%' THEN amount_cents ELSE 0 END), 0)::bigint,
    COALESCE(SUM(fee_cents), 0)::bigint,
    COALESCE(SUM(tax_cents), 0)::bigint,
    COALESCE(SUM(CASE WHEN direction = 'credit' THEN net_cents ELSE -net_cents END), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(MAX(currency), 'EUR')
  FROM public.revenue_events
  WHERE environment = _env
    AND occurred_at >= _from
    AND occurred_at <  _to;
END;
$$;

REVOKE ALL ON FUNCTION public.get_revenue_summary(timestamptz, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_revenue_summary(timestamptz, timestamptz, text) TO authenticated;
