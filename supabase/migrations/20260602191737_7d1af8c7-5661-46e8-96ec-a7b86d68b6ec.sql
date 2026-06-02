CREATE OR REPLACE FUNCTION public.get_public_home_stats()
RETURNS TABLE(students_count integer, courses_count integer, countries_count integer, min_price numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.ssra_enrollments WHERE status = 'active'),
    (SELECT COUNT(*)::int FROM public.ssra_courses WHERE is_active = true AND id NOT LIKE 'test-%'),
    (SELECT COUNT(DISTINCT country)::int FROM public.ssra_profiles WHERE country IS NOT NULL AND country <> ''),
    (SELECT MIN(price_eur) FROM public.ssra_courses WHERE is_active = true AND price_eur IS NOT NULL AND id NOT LIKE 'test-%')
$$;

GRANT EXECUTE ON FUNCTION public.get_public_home_stats() TO anon, authenticated;