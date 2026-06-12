-- ─────────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX: FOR ALL restrictive shields were blocking student reads
--
-- Migration 20260612195635 (parallel security pass) created:
--   enrollments_no_client_writes    AS RESTRICTIVE FOR ALL USING (is_ssra_admin)
--   session_tokens_no_client_writes AS RESTRICTIVE FOR ALL USING (false)
--
-- In PostgreSQL, FOR ALL includes SELECT, and RESTRICTIVE policies AND with
-- every permissive policy. Consequence: non-admin students could no longer
-- read THEIR OWN enrollments — which breaks the student dashboard
-- (useMyEnrollments), My Courses, session access gating, materials gating
-- and the payment-success enrollment poll. The session-token variant also
-- killed the "Own token read" / "Admin read all tokens" policies.
--
-- Despite the name ("no_client_writes"), the policies restricted READS.
--
-- The correct per-command write shields (INSERT/UPDATE/DELETE only, SELECT
-- untouched) already exist from migration 20260612250000:
--   shield_enrollments_{insert,update,delete}
--   shield_session_tokens_{insert,update,delete}
--
-- This migration removes the two over-broad FOR ALL policies. Write
-- protection remains fully intact via the per-command shields.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "enrollments_no_client_writes"    ON public.ssra_enrollments;
DROP POLICY IF EXISTS "session_tokens_no_client_writes" ON public.ssra_session_tokens;

-- Audit the correction
INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES (
  'system-migration', 'system',
  'security_policy_corrected', 'rls', '20260612260000',
  jsonb_build_object(
    'reason', 'FOR ALL restrictive shields from 20260612195635 blocked student SELECT on own enrollments; replaced by per-command shields from 20260612250000',
    'dropped', jsonb_build_array('enrollments_no_client_writes', 'session_tokens_no_client_writes')
  )
);
