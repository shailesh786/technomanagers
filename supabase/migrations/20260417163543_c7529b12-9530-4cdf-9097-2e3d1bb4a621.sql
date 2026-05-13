CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX categories_name_lower_idx ON public.categories (LOWER(name));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active categories"
ON public.categories FOR SELECT
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categories (name, display_order) VALUES
  ('Product Design', 1),
  ('Behavioral', 2),
  ('Analytical', 3),
  ('Product Strategy', 4),
  ('Execution', 5),
  ('Technical', 6),
  ('Program Management', 7),
  ('Pricing', 8),
  ('Profitability', 9),
  ('GTM', 10),
  ('Growth Strategy', 11);