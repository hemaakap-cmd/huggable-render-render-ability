-- ─────────────────────────────────────────────────────────────────────────────
-- get_admin_students() — fully server-side paginated student list
--
-- Final scalability step for the admin Students page. The previous iteration
-- (migration 20260612110000) moved the GROUP BY into a view but the hook still
-- pulled ALL user_ids client-side before paginating. This RPC does everything
-- in one round-trip: filter, join, aggregate, sort, paginate, count.
--
-- At 100,000 students the response is always exactly `page_size` rows
-- (+ one total count), regardless of table size.
--
-- Security: SECURITY DEFINER with an explicit is_ssra_admin() gate — callers
-- who are not admins get an empty result, never an error leaking row counts.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_students(
  _search    text    DEFAULT NULL,
  _page      integer DEFAULT 0,
  _page_size integer DEFAULT 25
)
RETURNS TABLE (
  id                  uuid,
  full_name           text,
  email               text,
  role                text,
  country             text,
  city                text,
  phone_number        text,
  created_at          timestamptz,
  total_enrollments   bigint,
  active_enrollments  bigint,
  unique_courses      bigint,
  course_ids          text[],
  first_enrolled_at   timestamptz,
  latest_sub_status   text,
  total_count         bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      e.user_id,
      COUNT(*)                                          AS total_enrollments,
      COUNT(*) FILTER (WHERE e.status = 'active')       AS active_enrollments,
      COUNT(DISTINCT e.course_id)                        AS unique_courses,
      array_agg(DISTINCT e.course_id)
        FILTER (WHERE e.course_id IS NOT NULL)          AS course_ids,
      MIN(COALESCE(e.enrolled_at, e.created_at))        AS first_enrolled_at
    FROM public.ssra_enrollments e
    GROUP BY e.user_id
  ),
  latest_sub AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.status
    FROM public.ssra_subscriptions s
    ORDER BY s.user_id, s.created_at DESC
  ),
  filtered AS (
    SELECT p.*, st.total_enrollments, st.active_enrollments,
           st.unique_courses, st.course_ids, st.first_enrolled_at,
           ls.status AS latest_sub_status
    FROM public.ssra_profiles p
    JOIN stats st       ON st.user_id = p.id
    LEFT JOIN latest_sub ls ON ls.user_id = p.id
    WHERE p.role = 'student'
      AND public.is_ssra_admin(auth.uid())
      AND (
        _search IS NULL OR _search = ''
        OR p.full_name ILIKE '%' || _search || '%'
        OR p.email     ILIKE '%' || _search || '%'
      )
  )
  SELECT
    f.id, f.full_name, f.email, f.role, f.country, f.city, f.phone_number,
    f.created_at,
    f.total_enrollments, f.active_enrollments, f.unique_courses,
    f.course_ids, f.first_enrolled_at, f.latest_sub_status,
    COUNT(*) OVER ()::bigint AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_page_size, 1)
  OFFSET GREATEST(_page, 0) * GREATEST(_page_size, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_students(text, integer, integer)
  TO authenticated, service_role;
