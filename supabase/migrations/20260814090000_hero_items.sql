-- Hero Priority Board — replaces the homepage hero slideshow.
--
-- Three fixed priority slots (priority 1..3) render on the homepage; every
-- other row sits on the "bench" (priority IS NULL) and is never rendered
-- publicly. Each item carries its own schedule window (show_from/hide_after,
-- evaluated in Asia/Kolkata by the app) and a visibility switch.
--
-- This migration also DROPS the old hero_slides table: the slideshow it
-- powered is deleted from the codebase in the same release, and the homepage
-- no longer has any fallback banner (zero visible items = no hero section).

CREATE TABLE public.hero_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 1..3 = slotted (renders on the homepage), NULL = bench (never rendered)
  priority INTEGER CHECK (priority IS NULL OR priority BETWEEN 1 AND 3),
  visible BOOLEAN NOT NULL DEFAULT true,
  kind TEXT NOT NULL DEFAULT '',          -- eyebrow, e.g. 'COURSE · 12 MODULES'
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '',          -- footer-left, e.g. 'From ₹4,999 · lifetime access'
  cta_label TEXT NOT NULL DEFAULT '',
  cta_href TEXT NOT NULL DEFAULT '',
  tag_label TEXT,                         -- uppercase chip; NULL/empty = no chip
  tag_color TEXT NOT NULL DEFAULT '#1D7DE8',
  image_url TEXT,                         -- 16:9 upload; NULL = gradient + glyph fallback
  icon TEXT NOT NULL DEFAULT 'graduation-cap', -- lucide glyph for the image fallback
  surface TEXT NOT NULL DEFAULT 'white' CHECK (surface IN ('white', 'navy')),
  show_from TIMESTAMPTZ,                  -- NULL = no lower bound
  hide_after TIMESTAMPTZ,                 -- NULL = no upper bound
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One item per slot. Partial index so any number of bench rows (NULL) coexist.
CREATE UNIQUE INDEX hero_items_priority_key
  ON public.hero_items (priority)
  WHERE priority IS NOT NULL;

ALTER TABLE public.hero_items ENABLE ROW LEVEL SECURITY;

-- Public sees only visible, slotted items; admins see everything (incl. bench).
-- Schedule windows are evaluated in the app so the ISR cache stays simple.
CREATE POLICY "Anyone can view visible slotted hero items"
  ON public.hero_items FOR SELECT
  USING ((visible = true AND priority IS NOT NULL) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert hero items"
  ON public.hero_items FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update hero items"
  ON public.hero_items FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete hero items"
  ON public.hero_items FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_hero_items_updated_at
  BEFORE UPDATE ON public.hero_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── Storage bucket for the 16:9 card images ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-images', 'hero-images', true);

CREATE POLICY "Public read access for hero-images" ON storage.objects FOR SELECT USING (bucket_id = 'hero-images');

CREATE POLICY "Admin upload access for hero-images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'hero-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin update access for hero-images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'hero-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin delete access for hero-images" ON storage.objects FOR DELETE USING (
  bucket_id = 'hero-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Seed: the three cards from the design handoff ───────────────────────────
-- Copy, prices and dates are editable in /admin (Homepage Hero tab).
INSERT INTO public.hero_items
  (priority, visible, kind, title, subtitle, meta, cta_label, cta_href, tag_label, tag_color, icon, surface)
VALUES
  (1, true, 'COHORT 04', 'Ten weeks to an AI PM offer',
   'Live sessions, weekly case reviews, and a hiring-manager mock in week nine.',
   '₹24,999 · starts 24 Aug · 40 seats', 'Join the cohort', '/cohort',
   'NEW', '#00BFFF', 'graduation-cap', 'navy'),
  (2, true, 'COURSE · 12 MODULES', 'PM Interview Masterclass',
   'Sixty real questions from Google, Meta, Amazon and Flipkart, each with the structure panels score against.',
   'From ₹4,999 · lifetime access', 'Start Course', '/courses',
   'BESTSELLER', '#F59E0B', 'book-open', 'white'),
  (3, true, 'QUESTIONS', 'The Question Bank',
   '1,200+ real interview questions, filterable by company and role.',
   'Free forever', 'Explore Questions', '/questions',
   'FREE', '#22C55E', 'search', 'white');

-- ── Retire the old hero slideshow ────────────────────────────────────────────
-- The slideshow UI is removed from the codebase in this release; its data has
-- no consumer anymore.
DROP TABLE IF EXISTS public.hero_slides;
