DROP FUNCTION IF EXISTS public.get_revenue_summary(timestamptz, timestamptz, text);

CREATE FUNCTION public.get_revenue_summary(_from timestamptz, _to timestamptz, _env text)
RETURNS TABLE(gross_cents bigint, refund_cents bigint, chargeback_cents bigint, fee_cents bigint, tax_cents bigint, net_cents bigint, event_count bigint, currency text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ssra_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN re.direction = 'credit' THEN re.amount_cents ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN re.event_type LIKE 'adjustment.%' AND re.direction = 'debit' THEN re.amount_cents ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN re.event_type LIKE '%chargeback%' THEN re.amount_cents ELSE 0 END), 0)::bigint,
    COALESCE(SUM(re.fee_cents), 0)::bigint,
    COALESCE(SUM(re.tax_cents), 0)::bigint,
    COALESCE(SUM(CASE WHEN re.direction = 'credit' THEN re.net_cents ELSE -re.net_cents END), 0)::bigint,
    COUNT(*)::bigint,
    COALESCE(MAX(re.currency), 'EUR')
  FROM public.revenue_events re
  WHERE re.environment = _env
    AND re.occurred_at >= _from
    AND re.occurred_at <  _to;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_summary(timestamptz, timestamptz, text) TO authenticated;