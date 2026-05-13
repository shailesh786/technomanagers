-- 1. Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Case-insensitive uniqueness
CREATE UNIQUE INDEX companies_name_lower_idx ON public.companies (LOWER(name));

-- 2. Seed from existing questions
INSERT INTO public.companies (name)
SELECT DISTINCT unnest(company)
FROM public.questions
WHERE company IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active companies"
  ON public.companies FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete companies"
  ON public.companies FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 4. updated_at trigger
CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Counts RPC (replaces both unique + popular for filter UIs)
CREATE OR REPLACE FUNCTION public.get_companies_with_counts(include_inactive BOOLEAN DEFAULT false)
RETURNS TABLE(company_name TEXT, question_count BIGINT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF include_inactive THEN
    RETURN QUERY
    SELECT c.name AS company_name, COUNT(q.id) AS question_count
    FROM public.companies c
    LEFT JOIN public.questions q ON c.name = ANY(q.company)
    GROUP BY c.name
    ORDER BY question_count DESC, c.name ASC;
  ELSE
    RETURN QUERY
    SELECT c.name AS company_name, COUNT(q.id) AS question_count
    FROM public.companies c
    LEFT JOIN public.questions q ON c.name = ANY(q.company) AND q.status = 'published'
    WHERE c.is_active = true
    GROUP BY c.name
    HAVING COUNT(q.id) > 0
    ORDER BY question_count DESC, c.name ASC;
  END IF;
END;
$$;

-- 6. Auto-sync trigger: any new company on a question is added to companies table
CREATE OR REPLACE FUNCTION public.sync_companies_from_questions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c TEXT;
BEGIN
  IF NEW.company IS NOT NULL THEN
    FOREACH c IN ARRAY NEW.company LOOP
      IF c IS NOT NULL AND length(trim(c)) > 0 THEN
        INSERT INTO public.companies (name)
        VALUES (trim(c))
        ON CONFLICT (LOWER(name)) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_sync_companies
  AFTER INSERT OR UPDATE OF company ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.sync_companies_from_questions();