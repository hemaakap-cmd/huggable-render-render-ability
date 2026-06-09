-- ─────────────────────────────────────────────────────────────────────────────
-- Nightly reconciliation infrastructure
--
-- ssra_reconciliation_reports  — persisted results of each run
-- reconcile_system()           — PL/pgSQL function, called by edge function
-- pg_cron                      — schedules the edge function at 02:00 UTC
--
-- Philosophy:
--   • Auto-fix data that is provably wrong and safe to repair.
--   • Flag (never auto-fix) data that requires human judgment.
--   • Every finding is written to the findings JSONB array.
--   • Admin receives an in-app notification after each run if issues found.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Results table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ssra_reconciliation_reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at        timestamptz NOT NULL DEFAULT now(),
  duration_ms   integer,
  status        text        NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'completed', 'failed')),
  checks_total  integer     NOT NULL DEFAULT 0,
  checks_passed integer     NOT NULL DEFAULT 0,
  checks_failed integer     NOT NULL DEFAULT 0,
  auto_fixed    integer     NOT NULL DEFAULT 0,
  findings      jsonb       NOT NULL DEFAULT '[]',
  error         text,
  triggered_by  text        NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_ran_at
  ON public.ssra_reconciliation_reports (ran_at DESC);

ALTER TABLE public.ssra_reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read reconciliation reports"
  ON public.ssra_reconciliation_reports FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Service role full access on reconciliation"
  ON public.ssra_reconciliation_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Core reconciliation PL/pgSQL function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reconcile_system(
  p_report_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id   uuid    := COALESCE(p_report_id, gen_random_uuid());
  v_started_at  timestamptz := clock_timestamp();
  v_findings    jsonb   := '[]';
  v_total       int     := 0;
  v_passed      int     := 0;
  v_failed      int     := 0;
  v_fixed       int     := 0;

  -- cursors / temp vars
  r             record;
  v_actual      int;
  v_count       int;
BEGIN

  -- ── 1. enrolled_count accuracy ─────────────────────────────────────────────
  v_total := v_total + 1;
  v_count := 0;
  FOR r IN
    SELECT c.id, c.title, c.enrolled_count,
           COUNT(e.id) FILTER (WHERE e.status = 'active') AS actual
    FROM public.ssra_courses c
    LEFT JOIN public.ssra_enrollments e ON e.course_id = c.id
    GROUP BY c.id, c.title, c.enrolled_count
    HAVING c.enrolled_count IS DISTINCT FROM
           COUNT(e.id) FILTER (WHERE e.status = 'active')
  LOOP
    UPDATE public.ssra_courses
      SET enrolled_count = r.actual
    WHERE id = r.id;

    v_findings := v_findings || jsonb_build_object(
      'check',      'enrolled_count_sync',
      'status',     'fixed',
      'course_id',  r.id,
      'course',     r.title,
      'was',        r.enrolled_count,
      'now',        r.actual,
      'message',    'enrolled_count corrected from ' || r.enrolled_count || ' to ' || r.actual
    );
    v_fixed  := v_fixed  + 1;
    v_count  := v_count  + 1;
  END LOOP;

  IF v_count = 0 THEN
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'enrolled_count_sync', 'status', 'passed',
      'message', 'All course enrolled_counts are accurate'
    );
  ELSE
    v_failed := v_failed + 1;
  END IF;

  -- ── 2. Expired waitlist entries ────────────────────────────────────────────
  v_total := v_total + 1;
  UPDATE public.ssra_waitlist
    SET status = 'expired', updated_at = now()
  WHERE status = 'notified'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_fixed  := v_fixed  + v_count;
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'waitlist_expiration', 'status', 'fixed',
      'count', v_count,
      'message', v_count || ' expired waitlist entries marked as expired'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'waitlist_expiration', 'status', 'passed',
      'message', 'No expired waitlist notifications found'
    );
  END IF;

  -- ── 3. Missing notification preferences ───────────────────────────────────
  v_total := v_total + 1;
  INSERT INTO public.ssra_notification_preferences (user_id)
  SELECT id FROM public.ssra_profiles
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_fixed  := v_fixed  + v_count;
    v_findings := v_findings || jsonb_build_object(
      'check', 'notification_preferences_backfill', 'status', 'fixed',
      'count', v_count,
      'message', v_count || ' users were missing notification preferences — defaults created'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'notification_preferences_backfill', 'status', 'passed',
      'message', 'All users have notification preferences'
    );
  END IF;

  -- ── 4. Orphan certificates (cert active but enrollment cancelled) ──────────
  v_total := v_total + 1;
  SELECT COUNT(*) INTO v_count
  FROM public.ssra_certificates c
  WHERE c.revoked = false
    AND NOT EXISTS (
      SELECT 1 FROM public.ssra_enrollments e
      WHERE e.user_id = c.user_id
        AND e.course_id = c.course_id
        AND e.status IN ('active', 'refunded')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.ssra_subscriptions s
      WHERE s.user_id = c.user_id
        AND s.course_id = c.course_id
        AND s.status IN ('active', 'trialing', 'canceled')
    );

  IF v_count > 0 THEN
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check',    'orphan_certificates',
      'status',   'warning',
      'count',    v_count,
      'message',  v_count || ' active certificates have no matching enrollment/subscription — manual review required',
      'action',   'Review /ssra-admin/certificates'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'orphan_certificates', 'status', 'passed',
      'message', 'All active certificates have a valid enrollment or subscription'
    );
  END IF;

  -- ── 5. Active subscriptions with cancelled enrollment ─────────────────────
  v_total := v_total + 1;
  SELECT COUNT(*) INTO v_count
  FROM public.ssra_subscriptions s
  WHERE s.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.ssra_enrollments e
      WHERE e.user_id = s.user_id
        AND e.course_id = s.course_id
        AND e.status = 'cancelled'
    );

  IF v_count > 0 THEN
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check',   'subscription_enrollment_mismatch',
      'status',  'warning',
      'count',   v_count,
      'message', v_count || ' active subscriptions have a cancelled enrollment — access may be incorrectly granted',
      'action',  'Review /ssra-admin/enrollments'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'subscription_enrollment_mismatch', 'status', 'passed',
      'message', 'All active subscriptions have matching enrollment status'
    );
  END IF;

  -- ── 6. Stale pending enrollments (> 48 h, no Paddle webhook) ──────────────
  v_total := v_total + 1;
  SELECT COUNT(*) INTO v_count
  FROM public.ssra_enrollments
  WHERE status = 'pending'
    AND created_at < now() - INTERVAL '48 hours';

  IF v_count > 0 THEN
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check',   'stale_pending_enrollments',
      'status',  'warning',
      'count',   v_count,
      'message', v_count || ' enrollments stuck in pending for > 48 h — possible abandoned payments',
      'action',  'Review /ssra-admin/operations'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'stale_pending_enrollments', 'status', 'passed',
      'message', 'No stale pending enrollments found'
    );
  END IF;

  -- ── 7. Failed webhooks (last 24 h) ─────────────────────────────────────────
  v_total := v_total + 1;
  SELECT COUNT(*) INTO v_count
  FROM public.ssra_webhook_events
  WHERE status = 'failed'
    AND created_at > now() - INTERVAL '24 hours';

  IF v_count > 0 THEN
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check',   'failed_webhooks_24h',
      'status',  'warning',
      'count',   v_count,
      'message', v_count || ' Paddle webhooks failed in the last 24 h',
      'action',  'Review /ssra-admin/sync-status'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'failed_webhooks_24h', 'status', 'passed',
      'message', 'No failed webhooks in the last 24 h'
    );
  END IF;

  -- ── 8. Failed emails (last 24 h) ───────────────────────────────────────────
  v_total := v_total + 1;
  SELECT COUNT(*) INTO v_count
  FROM public.email_send_log
  WHERE status IN ('failed', 'bounced', 'dlq')
    AND created_at > now() - INTERVAL '24 hours';

  IF v_count > 0 THEN
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check',   'failed_emails_24h',
      'status',  'warning',
      'count',   v_count,
      'message', v_count || ' transactional emails failed/bounced in the last 24 h',
      'action',  'Review /ssra-admin/system-health'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'failed_emails_24h', 'status', 'passed',
      'message', 'No failed emails in the last 24 h'
    );
  END IF;

  -- ── 9. Unresolved fraud flags > 7 days ────────────────────────────────────
  v_total := v_total + 1;
  SELECT COUNT(*) INTO v_count
  FROM public.ssra_fraud_flags
  WHERE resolved = false
    AND created_at < now() - INTERVAL '7 days';

  IF v_count > 0 THEN
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check',   'stale_fraud_flags',
      'status',  'warning',
      'count',   v_count,
      'message', v_count || ' fraud flags unresolved for > 7 days',
      'action',  'Review /ssra-admin/fraud'
    );
  ELSE
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'stale_fraud_flags', 'status', 'passed',
      'message', 'No stale unresolved fraud flags'
    );
  END IF;

  -- ── 10. batch_enrolled_count sync ────────────────────────────────────────
  v_total := v_total + 1;
  v_count := 0;
  FOR r IN
    SELECT b.id, b.name, b.enrolled_count,
           COUNT(e.id) FILTER (WHERE e.status = 'active') AS actual
    FROM public.ssra_batches b
    LEFT JOIN public.ssra_enrollments e ON e.batch_id = b.id
    GROUP BY b.id, b.name, b.enrolled_count
    HAVING b.enrolled_count IS DISTINCT FROM
           COUNT(e.id) FILTER (WHERE e.status = 'active')
  LOOP
    UPDATE public.ssra_batches SET enrolled_count = r.actual WHERE id = r.id;
    v_fixed := v_fixed + 1;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    v_passed := v_passed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'batch_enrolled_count_sync', 'status', 'passed',
      'message', 'All batch enrolled_counts are accurate'
    );
  ELSE
    v_failed := v_failed + 1;
    v_findings := v_findings || jsonb_build_object(
      'check', 'batch_enrolled_count_sync', 'status', 'fixed',
      'count', v_count,
      'message', v_count || ' batch enrolled_counts corrected'
    );
  END IF;

  -- ── Write final report ────────────────────────────────────────────────────
  INSERT INTO public.ssra_reconciliation_reports (
    id, ran_at, duration_ms, status,
    checks_total, checks_passed, checks_failed, auto_fixed,
    findings
  ) VALUES (
    v_report_id,
    v_started_at,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started_at)::int,
    'completed',
    v_total, v_passed, v_failed, v_fixed,
    v_findings
  )
  ON CONFLICT (id) DO UPDATE SET
    duration_ms    = EXCLUDED.duration_ms,
    status         = EXCLUDED.status,
    checks_total   = EXCLUDED.checks_total,
    checks_passed  = EXCLUDED.checks_passed,
    checks_failed  = EXCLUDED.checks_failed,
    auto_fixed     = EXCLUDED.auto_fixed,
    findings       = EXCLUDED.findings;

  -- Notify all super_admins if any issues found
  IF v_failed > 0 THEN
    INSERT INTO public.ssra_notifications (user_id, type, title, body, link)
    SELECT p.id,
           'reconciliation_report',
           'Nightly reconciliation: ' || v_failed || ' issue(s) found',
           v_fixed || ' auto-fixed, ' || (v_failed - v_fixed) || ' need manual review.',
           '/ssra-admin/reconciliation'
    FROM public.ssra_profiles p
    WHERE p.role = 'super_admin'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'report_id',    v_report_id,
    'checks_total', v_total,
    'passed',       v_passed,
    'failed',       v_failed,
    'auto_fixed',   v_fixed,
    'duration_ms',  EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started_at)::int
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_system TO service_role;

-- ── pg_cron: nightly reconciliation at 02:00 UTC ──────────────────────────────
-- Calls the Supabase edge function so it runs in the same security context
-- as all other edge functions and has access to service_role secrets.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('nightly-reconciliation')
      FROM cron.job WHERE jobname = 'nightly-reconciliation';

    PERFORM cron.schedule(
      'nightly-reconciliation',
      '0 2 * * *',
      $$
      SELECT net.http_post(
        url     := current_setting('app.supabase_url', true) || '/functions/v1/nightly-reconciliation',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body    := '{"trigger":"cron"}'::jsonb
      );
      $$
    );

    -- ── pg_cron: expire waitlist entries hourly ──────────────────────────────
    PERFORM cron.unschedule('expire-waitlist-notified')
      FROM cron.job WHERE jobname = 'expire-waitlist-notified';

    PERFORM cron.schedule(
      'expire-waitlist-notified',
      '5 * * * *',
      $$
      UPDATE public.ssra_waitlist
        SET status = 'expired', updated_at = now()
      WHERE status = 'notified'
        AND expires_at < now();
      $$
    );
  END IF;
END;
$$;
