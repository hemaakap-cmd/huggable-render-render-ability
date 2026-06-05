-- ============================================================
-- Admin Audit Log
-- Immutable record of every significant admin action.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssra_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   TEXT,
  actor_role    TEXT,
  action        TEXT        NOT NULL,   -- e.g. 'enrollment.refunded', 'coupon.created'
  resource_type TEXT,                   -- 'enrollment', 'course', 'user', etc.
  resource_id   TEXT,
  details       JSONB,                  -- before/after snapshot or extra context
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admins can read; only service_role can write (prevents tampering)
ALTER TABLE public.ssra_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read audit log" ON public.ssra_audit_log
  FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE for regular roles — service_role only
GRANT SELECT ON public.ssra_audit_log TO authenticated;
GRANT ALL    ON public.ssra_audit_log TO service_role;

-- Performance indexes
CREATE INDEX IF NOT EXISTS ssra_audit_created_idx  ON public.ssra_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS ssra_audit_actor_idx    ON public.ssra_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS ssra_audit_resource_idx ON public.ssra_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS ssra_audit_action_idx   ON public.ssra_audit_log(action);
