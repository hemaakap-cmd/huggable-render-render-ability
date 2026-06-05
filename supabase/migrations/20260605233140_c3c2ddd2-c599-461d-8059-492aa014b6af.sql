ALTER TABLE public.ssra_enrollments DROP CONSTRAINT IF EXISTS ssra_enrollments_status_check;
ALTER TABLE public.ssra_enrollments ADD CONSTRAINT ssra_enrollments_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'cancelled'::text, 'refunded'::text]));