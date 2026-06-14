
ALTER TABLE public.ssra_courses DISABLE TRIGGER USER;

UPDATE public.ssra_courses SET stripe_price_id = 'bewegungsanalyse_onetime' WHERE id = 'bewegungsanalyse';
UPDATE public.ssra_courses SET stripe_price_id = 'sporttherapie_praxis_onetime' WHERE id = 'sporttherapie-praxis';
UPDATE public.ssra_courses SET stripe_price_id = 'anatomie_rehab_onetime' WHERE id = 'anatomie-rehab';
UPDATE public.ssra_courses SET stripe_price_id = 'therapeutisches_training_onetime' WHERE id = 'therapeutisches-training';
UPDATE public.ssra_courses SET stripe_price_id = 'telefonkommunikation_onetime' WHERE id = 'telefonkommunikation';
UPDATE public.ssra_courses SET stripe_price_id = 'berufseinstieg_onetime' WHERE id = 'berufseinstieg';
UPDATE public.ssra_courses SET stripe_price_id = 'dosb_vorbereitung_onetime' WHERE id = 'dosb-vorbereitung';
UPDATE public.ssra_courses SET stripe_price_id = 'medical_german_monthly' WHERE id = 'medical-german';
UPDATE public.ssra_courses SET stripe_price_id = 'sport_rehab_basics_onetime' WHERE id = 'sport-rehab-basics';

ALTER TABLE public.ssra_courses ENABLE TRIGGER USER;

ALTER TABLE public.ssra_subscriptions
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS price_id text;

ALTER TABLE public.ssra_enrollments
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE INDEX IF NOT EXISTS idx_ssra_enrollments_stripe_session
  ON public.ssra_enrollments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ssra_subscriptions_user_env
  ON public.ssra_subscriptions(user_id, environment);
