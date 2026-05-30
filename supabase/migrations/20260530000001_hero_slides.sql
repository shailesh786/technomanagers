-- Hero slides table — powers the configurable homepage hero slideshow.
-- If no active rows exist, the homepage falls back to a hardcoded default slide.
CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  highlight TEXT,
  description TEXT NOT NULL,
  primary_cta_label TEXT,
  primary_cta_href TEXT,
  secondary_cta_label TEXT,
  secondary_cta_href TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Anyone can view active slides (admins see all)
CREATE POLICY "Anyone can view active hero slides"
  ON public.hero_slides FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert hero slides"
  ON public.hero_slides FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update hero slides"
  ON public.hero_slides FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete hero slides"
  ON public.hero_slides FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- NOTE: intentionally NOT seeded. An empty table means the homepage renders
-- the hardcoded fallback hero. Add rows via the admin panel to enable the slideshow.
