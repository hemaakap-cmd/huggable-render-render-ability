-- ─────────────────────────────────────────────────────────────────────────────
-- notification_preferences  —  Per-user notification opt-in/out
--
-- One row per user.  A trigger auto-creates default preferences when a
-- profile is first created so the row always exists.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ssra_notification_preferences (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email channel
  email_session_reminders        boolean NOT NULL DEFAULT true,
  email_homework_graded          boolean NOT NULL DEFAULT true,
  email_certificates             boolean NOT NULL DEFAULT true,
  email_cancellations            boolean NOT NULL DEFAULT true,
  email_waitlist                 boolean NOT NULL DEFAULT true,
  email_subscription_changes     boolean NOT NULL DEFAULT true,
  email_materials_uploaded       boolean NOT NULL DEFAULT false,

  -- In-app / dashboard channel
  dashboard_session_reminders    boolean NOT NULL DEFAULT true,
  dashboard_homework_graded      boolean NOT NULL DEFAULT true,
  dashboard_certificates         boolean NOT NULL DEFAULT true,
  dashboard_cancellations        boolean NOT NULL DEFAULT true,
  dashboard_waitlist             boolean NOT NULL DEFAULT true,
  dashboard_subscription_changes boolean NOT NULL DEFAULT true,
  dashboard_materials_uploaded   boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ssra_notification_preferences IS
  'Per-user opt-in/out for each notification category and channel.';

CREATE INDEX IF NOT EXISTS idx_ssra_notif_prefs_user
  ON public.ssra_notification_preferences (user_id);

ALTER TABLE public.ssra_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.ssra_notification_preferences FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all preferences"
  ON public.ssra_notification_preferences FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

-- ─── Auto-create default preferences on profile creation ────────────────────
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ssra_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_notification_preferences
  ON public.ssra_profiles;

CREATE TRIGGER trg_create_default_notification_preferences
  AFTER INSERT ON public.ssra_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- ─── Back-fill: create preferences for existing users ───────────────────────
INSERT INTO public.ssra_notification_preferences (user_id)
SELECT id FROM public.ssra_profiles
ON CONFLICT (user_id) DO NOTHING;

-- ─── updated_at maintenance ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_notification_preferences()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_notification_preferences
  ON public.ssra_notification_preferences;

CREATE TRIGGER trg_touch_notification_preferences
  BEFORE UPDATE ON public.ssra_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_notification_preferences();
