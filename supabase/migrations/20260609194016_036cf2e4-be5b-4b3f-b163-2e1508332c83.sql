
CREATE TABLE public.payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  event_type text NOT NULL,
  paddle_event_id text,
  paddle_resource_id text,
  user_id uuid,
  enrollment_id uuid,
  amount_cents bigint,
  currency text DEFAULT 'EUR',
  direction text CHECK (direction IN ('credit','debit')),
  before_state jsonb,
  after_state jsonb,
  actor text NOT NULL DEFAULT 'system',
  actor_id text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pal_occurred ON public.payment_audit_log(occurred_at DESC);
CREATE INDEX idx_pal_env_type ON public.payment_audit_log(environment, event_type);
CREATE INDEX idx_pal_user ON public.payment_audit_log(user_id);
CREATE INDEX idx_pal_severity ON public.payment_audit_log(severity) WHERE severity <> 'info';
CREATE UNIQUE INDEX idx_pal_paddle_event ON public.payment_audit_log(paddle_event_id) WHERE paddle_event_id IS NOT NULL;
GRANT SELECT ON public.payment_audit_log TO authenticated;
GRANT ALL    ON public.payment_audit_log TO service_role;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads audit log" ON public.payment_audit_log FOR SELECT TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()));
CREATE POLICY "Service role writes audit log" ON public.payment_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.prevent_payment_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'payment_audit_log is immutable; % not allowed', TG_OP USING ERRCODE = '42501'; END;
$$;
CREATE TRIGGER tg_pal_no_update BEFORE UPDATE ON public.payment_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_audit_mutation();
CREATE TRIGGER tg_pal_no_delete BEFORE DELETE ON public.payment_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_audit_mutation();

CREATE TABLE public.payment_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  window_from timestamptz NOT NULL,
  window_to   timestamptz NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','discrepancies','failed')),
  paddle_txn_count int DEFAULT 0,
  db_event_count int DEFAULT 0,
  matched_count int DEFAULT 0,
  missing_in_db_count int DEFAULT 0,
  missing_in_paddle_count int DEFAULT 0,
  amount_mismatch_count int DEFAULT 0,
  paddle_total_cents bigint DEFAULT 0,
  db_total_cents bigint DEFAULT 0,
  drift_cents bigint DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'cron',
  summary jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prr_started ON public.payment_reconciliation_runs(started_at DESC);
CREATE INDEX idx_prr_env_status ON public.payment_reconciliation_runs(environment, status);
GRANT SELECT ON public.payment_reconciliation_runs TO authenticated;
GRANT ALL    ON public.payment_reconciliation_runs TO service_role;
ALTER TABLE public.payment_reconciliation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads recon runs" ON public.payment_reconciliation_runs FOR SELECT TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()));
CREATE POLICY "Service role writes recon runs" ON public.payment_reconciliation_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE public.payment_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.payment_reconciliation_runs(id) ON DELETE CASCADE,
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','critical')),
  paddle_id text,
  db_id text,
  user_id uuid,
  expected jsonb,
  actual jsonb,
  description text,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pd_run ON public.payment_discrepancies(run_id);
CREATE INDEX idx_pd_unresolved ON public.payment_discrepancies(environment, created_at DESC) WHERE resolved_at IS NULL;
GRANT SELECT, UPDATE ON public.payment_discrepancies TO authenticated;
GRANT ALL ON public.payment_discrepancies TO service_role;
ALTER TABLE public.payment_discrepancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads discrepancies" ON public.payment_discrepancies FOR SELECT TO authenticated
  USING (public.is_ssra_super_admin(auth.uid()));
CREATE POLICY "Super admin updates discrepancies" ON public.payment_discrepancies FOR UPDATE TO authenticated
  USING (public.is_ssra_super_admin(auth.uid())) WITH CHECK (public.is_ssra_super_admin(auth.uid()));
CREATE POLICY "Service role writes discrepancies" ON public.payment_discrepancies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.data_integrity_checks
WITH (security_invoker = on) AS
  SELECT 'enrollment_without_payment'::text AS check_type,
         e.id::text AS resource_id, e.user_id,
         jsonb_build_object('course_id', e.course_id, 'amount_eur', e.amount_eur, 'status', e.status) AS details,
         e.created_at AS detected_for
  FROM public.ssra_enrollments e
  WHERE e.status = 'active' AND e.amount_eur > 0
    AND NOT EXISTS (SELECT 1 FROM public.revenue_events r WHERE r.enrollment_id = e.id OR r.user_id = e.user_id)
    AND e.created_at < now() - interval '30 minutes'
UNION ALL
  SELECT 'payment_without_enrollment'::text, r.id::text, r.user_id,
         jsonb_build_object('amount_cents', r.amount_cents, 'event_type', r.event_type, 'paddle_txn', r.paddle_transaction_id),
         r.occurred_at
  FROM public.revenue_events r
  WHERE r.direction = 'credit' AND r.environment = 'live' AND r.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ssra_enrollments e WHERE e.user_id = r.user_id)
UNION ALL
  SELECT 'orphan_subscription'::text, s.id::text, s.user_id,
         jsonb_build_object('stripe_subscription_id', s.stripe_subscription_id, 'status', s.status),
         s.created_at
  FROM public.ssra_subscriptions s
  WHERE s.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id);

GRANT SELECT ON public.data_integrity_checks TO authenticated;

CREATE OR REPLACE FUNCTION public.get_audit_health(_env text DEFAULT 'live')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_last jsonb; v_open int; v_integrity int;
BEGIN
  IF NOT public.is_ssra_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  SELECT to_jsonb(r.*) INTO v_last FROM public.payment_reconciliation_runs r
    WHERE r.environment = _env ORDER BY r.started_at DESC LIMIT 1;
  SELECT COUNT(*) INTO v_open FROM public.payment_discrepancies
    WHERE environment = _env AND resolved_at IS NULL;
  SELECT COUNT(*) INTO v_integrity FROM public.data_integrity_checks;
  RETURN jsonb_build_object('last_run', v_last, 'open_discrepancies', v_open,
                            'integrity_issues', v_integrity, 'environment', _env);
END; $$;

CREATE OR REPLACE FUNCTION public.mark_discrepancy_resolved(_id uuid, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_ssra_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.payment_discrepancies
     SET resolved_at = now(), resolved_by = auth.uid(),
         resolution_notes = COALESCE(_notes, resolution_notes)
   WHERE id = _id;
  INSERT INTO public.payment_audit_log
    (environment, event_type, actor, actor_id, severity, notes, after_state)
  SELECT environment, 'discrepancy.resolved', 'admin', auth.uid()::text, 'info',
         _notes, jsonb_build_object('discrepancy_id', _id)
    FROM public.payment_discrepancies WHERE id = _id;
END; $$;
