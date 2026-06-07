
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code text,
  _course_id text,
  _amount_eur numeric,
  _user_id uuid
)
RETURNS TABLE (
  is_valid boolean,
  error_reason text,
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  final_discount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.ssra_coupons%ROWTYPE;
  already_used boolean;
  computed numeric;
BEGIN
  SELECT * INTO c FROM public.ssra_coupons WHERE code = upper(trim(_code)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Coupon not found', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  IF NOT c.is_active THEN
    RETURN QUERY SELECT false, 'Coupon is inactive', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  IF c.valid_from IS NOT NULL AND now() < c.valid_from THEN
    RETURN QUERY SELECT false, 'Coupon is not yet valid', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  IF c.valid_until IS NOT NULL AND now() > c.valid_until THEN
    RETURN QUERY SELECT false, 'Coupon has expired', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    RETURN QUERY SELECT false, 'Coupon usage limit reached', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  IF c.course_id IS NOT NULL AND c.course_id <> _course_id THEN
    RETURN QUERY SELECT false, 'Coupon is not valid for this course', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  IF c.minimum_amount_eur IS NOT NULL AND _amount_eur < c.minimum_amount_eur THEN
    RETURN QUERY SELECT false, 'Order below minimum amount for this coupon', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ssra_coupon_uses WHERE coupon_id = c.id AND user_id = _user_id
  ) INTO already_used;

  IF already_used THEN
    RETURN QUERY SELECT false, 'You have already used this coupon', c.id, c.discount_type, c.discount_value, 0::numeric; RETURN;
  END IF;

  IF c.discount_type = 'percent' THEN
    computed := round((_amount_eur * c.discount_value / 100.0)::numeric, 2);
  ELSE
    computed := c.discount_value;
  END IF;
  IF computed > _amount_eur THEN computed := _amount_eur; END IF;

  RETURN QUERY SELECT true, NULL::text, c.id, c.discount_type, c.discount_value, computed;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, text, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, text, numeric, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ssra_coupons SET uses_count = uses_count + 1, updated_at = now() WHERE id = _coupon_id;
$$;

REVOKE ALL ON FUNCTION public.increment_coupon_uses(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO service_role;
