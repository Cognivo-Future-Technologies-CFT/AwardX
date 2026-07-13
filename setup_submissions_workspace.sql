-- Dedicated Program UI Configuration Table
CREATE TABLE IF NOT EXISTS program_table_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  pinned_columns JSONB DEFAULT '[]'::jsonb,
  default_sort TEXT,
  default_sort_direction TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id)
);

-- Personal Saved Views Table
CREATE TABLE IF NOT EXISTS submission_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  sorting JSONB DEFAULT '{}'::jsonb,
  visible_columns JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function for advanced submission search over JSONB
CREATE OR REPLACE FUNCTION search_submissions_advanced(
  p_program_id UUID,
  p_search TEXT,
  p_limit INT,
  p_offset INT
)
RETURNS TABLE (
  id UUID,
  program_id UUID,
  category_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  applicant_name TEXT,
  applicant_email TEXT,
  submitted_at TIMESTAMPTZ,
  average_score NUMERIC,
  cover_image_url TEXT,
  submission_data JSONB,
  payment_status TEXT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT s.*
    FROM submissions s
    WHERE s.program_id = p_program_id
      AND s.payment_status != 'pending'
      AND (
        p_search = '' 
        OR s.title ILIKE '%' || p_search || '%'
        OR s.applicant_name ILIKE '%' || p_search || '%'
        OR s.applicant_email ILIKE '%' || p_search || '%'
        OR s.submission_data::text ILIKE '%' || p_search || '%'
      )
  ),
  counted AS (
    SELECT count(*) AS total_count FROM filtered
  )
  SELECT 
    f.id,
    f.program_id,
    f.category_id,
    f.title,
    f.description,
    f.status,
    f.applicant_name,
    f.applicant_email,
    f.submitted_at,
    f.average_score,
    f.cover_image_url,
    f.submission_data,
    f.payment_status,
    c.total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY f.submitted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

