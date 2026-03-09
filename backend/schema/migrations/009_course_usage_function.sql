-- ============================================================================
-- Migration: Admin course usage (most frequently used courses for tee times)
-- Description: Function for admin dashboard to list courses by tee time count
-- ============================================================================

CREATE OR REPLACE FUNCTION get_course_usage(p_limit int DEFAULT 50)
RETURNS TABLE(course_name text, course_location text, tee_time_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT tt.course_name::text, COALESCE(tt.course_location, '')::text, COUNT(*)::bigint
  FROM tee_times tt
  GROUP BY tt.course_name, COALESCE(tt.course_location, '')
  ORDER BY COUNT(*) DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

COMMENT ON FUNCTION get_course_usage(int) IS 'Returns courses by number of tee times (for admin platform usage)';
