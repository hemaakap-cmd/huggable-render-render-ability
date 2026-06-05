
CREATE TABLE public.ssra_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  refund_amount_eur numeric,
  paddle_adjustment_id text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ssra_cancellation_requests_status_chk
    CHECK (status IN ('pending','approved','rejected','refunded'))
);

CREATE UNIQUE INDEX ssra_cancellation_requests_one_open
  ON public.ssra_cancellation_requests (enrollment_id)
  WHERE status = 'pending';

CREATE INDEX ssra_cancellation_requests_user_idx
  ON public.ssra_cancellation_requests (user_id);

GRANT SELECT, INSERT ON public.ssra_cancellation_requests TO authenticated;
GRANT ALL ON public.ssra_cancellation_requests TO service_role;

ALTER TABLE public.ssra_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Students can read their own requests; admins can read all
CREATE POLICY "Own cancellation requests read"
  ON public.ssra_cancellation_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_ssra_admin(auth.uid()));

-- Students can create a request only for their own paid enrollment, within 14 days,
-- and only when the enrollment is still active.
CREATE POLICY "Own cancellation requests insert within 14 days"
  ON public.ssra_cancellation_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.ssra_enrollments e
      WHERE e.id = enrollment_id
        AND e.user_id = auth.uid()
        AND e.course_id = ssra_cancellation_requests.course_id
        AND e.status = 'active'
        AND e.paid_at IS NOT NULL
        AND e.paid_at > now() - INTERVAL '14 days'
    )
  );

-- Admins can manage (update/process) all requests
CREATE POLICY "Admin manage cancellation requests"
  ON public.ssra_cancellation_requests FOR ALL
  TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_ssra_cancellation_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_ssra_cancellation_requests_updated
BEFORE UPDATE ON public.ssra_cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.set_ssra_cancellation_updated_at();
