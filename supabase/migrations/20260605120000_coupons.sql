-- ============================================================
-- Coupon / Discount Code System
-- Admin-created promo codes with flexible discount rules.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssra_coupons (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT          NOT NULL UNIQUE,
  name             TEXT,
  discount_type    TEXT          NOT NULL CHECK (discount_type IN ('percent', 'fixed_eur')),
  discount_value   NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses         INTEGER,                     -- null = unlimited
  uses_count       INTEGER       NOT NULL DEFAULT 0,
  valid_from       TIMESTAMPTZ,                 -- null = no start restriction
  valid_until      TIMESTAMPTZ,                 -- null = no expiry
  course_id        TEXT          REFERENCES public.ssra_courses(id) ON DELETE SET NULL,
  minimum_amount_eur NUMERIC(10,2),             -- minimum order to apply
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- coupon_uses table: link between coupons and enrollments
CREATE TABLE IF NOT EXISTS public.ssra_coupon_uses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id     UUID        NOT NULL REFERENCES public.ssra_coupons(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID        REFERENCES public.ssra_enrollments(id) ON DELETE SET NULL,
  discount_eur  NUMERIC(10,2),
  used_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)  -- one use per student per coupon
);

-- RLS
ALTER TABLE public.ssra_coupons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ssra_coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage coupons" ON public.ssra_coupons
  FOR ALL TO authenticated
  USING (public.is_ssra_admin(auth.uid()))
  WITH CHECK (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Admin read coupon uses" ON public.ssra_coupon_uses
  FOR SELECT TO authenticated
  USING (public.is_ssra_admin(auth.uid()));

CREATE POLICY "Own coupon uses read" ON public.ssra_coupon_uses
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssra_coupons     TO authenticated;
GRANT SELECT, INSERT                 ON public.ssra_coupon_uses TO authenticated;
GRANT ALL                            ON public.ssra_coupons     TO service_role;
GRANT ALL                            ON public.ssra_coupon_uses TO service_role;

CREATE INDEX IF NOT EXISTS ssra_coupons_code_idx ON public.ssra_coupons(code);
CREATE INDEX IF NOT EXISTS ssra_coupon_uses_coupon_idx ON public.ssra_coupon_uses(coupon_id);

-- Helper: validate and return a coupon (used by Edge Function)
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code TEXT,
  _course_id TEXT,
  _amount_eur NUMERIC,
  _user_id UUID
)
RETURNS TABLE (
  coupon_id      UUID,
  discount_type  TEXT,
  discount_value NUMERIC,
  final_discount NUMERIC,
  is_valid       BOOLEAN,
  error_reason   TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coupon public.ssra_coupons%ROWTYPE;
  v_already_used BOOLEAN;
  v_discount NUMERIC;
BEGIN
  SELECT * INTO v_coupon FROM public.ssra_coupons WHERE code = upper(trim(_code)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, 0::NUMERIC, FALSE, 'Coupon not found';
    RETURN;
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE, 'Coupon is inactive';
    RETURN;
  END IF;

  IF v_coupon.valid_from IS NOT NULL AND now() < v_coupon.valid_from THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE, 'Coupon not yet valid';
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND now() > v_coupon.valid_until THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE, 'Coupon has expired';
    RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE, 'Coupon has reached its usage limit';
    RETURN;
  END IF;

  IF v_coupon.course_id IS NOT NULL AND v_coupon.course_id != _course_id THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE, 'Coupon is not valid for this course';
    RETURN;
  END IF;

  IF v_coupon.minimum_amount_eur IS NOT NULL AND _amount_eur < v_coupon.minimum_amount_eur THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE,
      format('Minimum order amount is €%s', v_coupon.minimum_amount_eur);
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.ssra_coupon_uses
    WHERE coupon_id = v_coupon.id AND user_id = _user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 0::NUMERIC, FALSE, 'You have already used this coupon';
    RETURN;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percent' THEN
    v_discount := ROUND(_amount_eur * v_coupon.discount_value / 100.0, 2);
  ELSE
    v_discount := LEAST(v_coupon.discount_value, _amount_eur);
  END IF;

  RETURN QUERY SELECT v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, v_discount, TRUE, NULL::TEXT;
END;
$$;
