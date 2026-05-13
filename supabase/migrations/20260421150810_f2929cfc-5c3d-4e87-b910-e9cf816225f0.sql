CREATE OR REPLACE FUNCTION public.get_unique_companies(include_drafts BOOLEAN DEFAULT false)
RETURNS TABLE(company_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF include_drafts THEN
    RETURN QUERY
    SELECT DISTINCT unnest(q.company) AS company_name
    FROM public.questions q
    WHERE q.company IS NOT NULL
    ORDER BY company_name ASC;
  ELSE
    RETURN QUERY
    SELECT DISTINCT unnest(q.company) AS company_name
    FROM public.questions q
    WHERE q.status = 'published' AND q.company IS NOT NULL
    ORDER BY company_name ASC;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_popular_companies(limit_count INTEGER DEFAULT 8)
RETURNS TABLE(company_name TEXT, question_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(q.company) AS company_name, COUNT(*) AS question_count
  FROM public.questions q
  WHERE q.status = 'published' AND q.company IS NOT NULL
  GROUP BY company_name
  ORDER BY question_count DESC, company_name ASC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unique_companies(BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_companies(INTEGER) TO anon, authenticated;