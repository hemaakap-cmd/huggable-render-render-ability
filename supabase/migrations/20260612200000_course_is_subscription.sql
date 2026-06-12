-- ─────────────────────────────────────────────────────────────────────────────
-- Single source of truth for subscription billing
--
-- Problem: which courses are sold as recurring subscriptions was hardcoded in
-- TWO independent files (src/lib/paddle.ts and supabase/functions/
-- paddle-prepare-checkout/index.ts). If they diverged, the frontend could
-- display one billing model while the backend created the other.
--
-- Fix: ssra_courses.is_subscription is now authoritative. The
-- paddle-prepare-checkout edge function reads it from the course row and
-- derives the Paddle external price id from it. The frontend hardcoded map
-- is removed.
--
-- Naming convention (matches existing Paddle catalog):
--   one-time      →  <course_id_with_underscores>_onetime
--   subscription  →  <course_id_with_underscores>_monthly
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ssra_courses
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ssra_courses.is_subscription IS
  'Authoritative billing model flag. true = recurring monthly subscription via Paddle, false = one-time purchase. Replaces the SUBSCRIPTION_COURSES maps previously duplicated in frontend and edge function code.';

-- Backfill: the two courses that were in the hardcoded maps
UPDATE public.ssra_courses
  SET is_subscription = true
WHERE id IN ('medical-german', 'test-course');

-- Audit the change so the migration itself is traceable
INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES (
  'system-migration', 'system',
  'course_billing_model_centralized', 'ssra_course', 'medical-german,test-course',
  jsonb_build_object('migration', '20260612200000', 'is_subscription', true)
);
