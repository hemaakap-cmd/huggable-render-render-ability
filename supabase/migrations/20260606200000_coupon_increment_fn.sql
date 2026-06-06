-- ══════════════════════════════════════════════════════
-- Coupon use tracking: server-side increment function
-- Called by stripe-webhook after successful payment to
-- atomically increment uses_count on ssra_coupons.
-- SECURITY DEFINER so service_role can call it.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ssra_coupons
  SET uses_count = uses_count + 1,
      updated_at = now()
  WHERE id = _coupon_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(UUID) TO service_role;

-- Also grant the ssra_coupon_uses INSERT permission to service_role explicitly
GRANT INSERT ON public.ssra_coupon_uses TO service_role;
