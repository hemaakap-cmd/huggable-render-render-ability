ALTER TABLE public.ssra_enrollments 
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS paid_currency text;