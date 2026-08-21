-- Cohort testimonials — replaces the hardcoded "REVIEWS & TESTIMONIALS" block
-- on /cohort with an admin-managed wall.
--
-- One table backs three card kinds, all woven into a single masonry stream:
--   'text'  — a written quote (name, role, optional outcome pill)
--   'video' — a YouTube link. The page renders a poster + play badge and only
--             loads the YouTube player after a click (see lib/youtube.ts), so
--             no third-party JS touches the critical path.
--   'image' — a review screenshot (the WhatsApp/LinkedIn captures that were
--             previously hardcoded into CohortPage.tsx).
--
-- Ordering: `display_order` sets the stream sequence. The page then spreads
-- video cards across the masonry columns so they never clump into column one
-- (see lib/cohort-testimonials.ts) — video is the scarce asset and should be
-- visible in the first screenful whatever the column count.

CREATE TABLE public.cohort_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('text', 'video', 'image')),
  visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Attribution. Optional for 'image' rows, where the screenshot already
  -- carries the reviewer's name.
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',      -- pill copy, e.g. 'Offer at eGov Foundation'; '' = no pill

  -- 'text': the full quote. 'video': the short pull-quote overlaid on the poster.
  quote TEXT NOT NULL DEFAULT '',

  -- 'video' only.
  video_url TEXT,                        -- YouTube watch/share/embed link (direct media files also play)
  video_length TEXT NOT NULL DEFAULT '', -- display-only runtime, e.g. '2:14'

  -- 'image': the screenshot itself. 'video': optional poster override; when
  -- NULL a YouTube link falls back to its own i.ytimg.com thumbnail.
  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Every kind must carry the payload it renders, so a half-filled row can
  -- never reach the page as an empty card.
  CONSTRAINT cohort_testimonials_payload CHECK (
    (kind = 'text'  AND length(btrim(quote)) > 0) OR
    (kind = 'video' AND video_url IS NOT NULL AND length(btrim(video_url)) > 0) OR
    (kind = 'image' AND image_url IS NOT NULL AND length(btrim(image_url)) > 0)
  )
);

-- Matches the page's only read: visible rows, in stream order.
CREATE INDEX cohort_testimonials_stream_idx
  ON public.cohort_testimonials (display_order, created_at)
  WHERE visible = true;

ALTER TABLE public.cohort_testimonials ENABLE ROW LEVEL SECURITY;

-- Public (anon) reads visible rows only — this is what the ISR fetch uses via
-- the cookieless client. Admins additionally see hidden rows in /admin.
CREATE POLICY "Anyone can view visible cohort testimonials"
  ON public.cohort_testimonials FOR SELECT
  USING (visible = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert cohort testimonials"
  ON public.cohort_testimonials FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update cohort testimonials"
  ON public.cohort_testimonials FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete cohort testimonials"
  ON public.cohort_testimonials FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_cohort_testimonials_updated_at
  BEFORE UPDATE ON public.cohort_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── Storage bucket for screenshots and video poster overrides ───────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-images', 'testimonial-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for testimonial-images" ON storage.objects;
CREATE POLICY "Public read access for testimonial-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'testimonial-images');

DROP POLICY IF EXISTS "Admin upload access for testimonial-images" ON storage.objects;
CREATE POLICY "Admin upload access for testimonial-images"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'testimonial-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin update access for testimonial-images" ON storage.objects;
CREATE POLICY "Admin update access for testimonial-images"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'testimonial-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admin delete access for testimonial-images" ON storage.objects;
CREATE POLICY "Admin delete access for testimonial-images"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'testimonial-images' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── Migrate the content that was hardcoded in CohortPage.tsx ────────────────
-- These are the assets already live on /cohort today: three video testimonials
-- and nineteen review screenshots, all on the existing Cloudinary account.
-- Nothing new is invented here — the section is being moved from source code
-- into the database, so the page does not lose its social proof on deploy.
--
-- The three videos are direct Cloudinary MP4s rather than YouTube links, so
-- they have no auto-derived poster and will render the branded gradient
-- fallback until someone either uploads a poster image or (preferred) replaces
-- video_url with the YouTube link for the same story in /admin → Testimonials.

-- Guarded so a re-run of this script cannot duplicate the seed rows.
INSERT INTO public.cohort_testimonials (kind, display_order, name, role, video_url, video_length, quote)
SELECT v.kind, v.display_order, v.name, v.role, v.video_url, v.video_length, v.quote
FROM (VALUES
  ('video', 10, 'Harshit',    'PM at Indeed',      'https://res.cloudinary.com/topmate/video/upload/v1778235779/Harshit_Testimonial_x1dosu.mp4', '', ''),
  ('video', 20, 'Aishwarya',  'PM at Microsoft',   'https://res.cloudinary.com/topmate/video/upload/v1778235794/WhatsApp_Video_2026-05-05_at_7.08.45_AM_iblof5.mp4', '', ''),
  ('video', 30, 'Shikhar',    'PM at Shipturtle',  'https://res.cloudinary.com/topmate/video/upload/v1778235800/WIN_20260427_21_20_21_Pro_dz8vjv.mp4', '', '')
) AS v(kind, display_order, name, role, video_url, video_length, quote)
WHERE NOT EXISTS (SELECT 1 FROM public.cohort_testimonials);

INSERT INTO public.cohort_testimonials (kind, display_order, image_url)
SELECT v.kind, v.display_order, v.image_url
FROM (VALUES
  ('image', 100, 'https://res.cloudinary.com/topmate/image/upload/v1778235775/Screenshot_2026-04-30_at_11.49.13_PM_tzle9y.png'),
  ('image', 110, 'https://res.cloudinary.com/topmate/image/upload/v1778235775/Screenshot_2026-04-26_at_8.16.09_AM_flbn1y.png'),
  ('image', 120, 'https://res.cloudinary.com/topmate/image/upload/v1778235775/Screenshot_2026-04-30_at_11.36.18_PM_zq2fqx.png'),
  ('image', 130, 'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.53.25_PM_xc7eih.png'),
  ('image', 140, 'https://res.cloudinary.com/topmate/image/upload/v1778235775/IMG_6583_j62jhv.png'),
  ('image', 150, 'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.17.00_PM_yvcsdz.png'),
  ('image', 160, 'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.19.17_PM_fgxsai.png'),
  ('image', 170, 'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.51.19_PM_vkc6ce.png'),
  ('image', 180, 'https://res.cloudinary.com/topmate/image/upload/v1778235778/IMG_6582_miriui.png'),
  ('image', 190, 'https://res.cloudinary.com/topmate/image/upload/v1778235779/IMG_6584_gtjk82.png'),
  ('image', 200, 'https://res.cloudinary.com/topmate/image/upload/v1778235777/IMG_6560_mqbkn2.jpg'),
  ('image', 210, 'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.22.22_PM_ctgpzf.png'),
  ('image', 220, 'https://res.cloudinary.com/topmate/image/upload/v1778235780/Screenshot_2026-04-30_at_11.11.36_PM_jsjh5p.png'),
  ('image', 230, 'https://res.cloudinary.com/topmate/image/upload/v1778235780/Screenshot_2026-04-30_at_11.13.30_PM_dfcc0t.png'),
  ('image', 240, 'https://res.cloudinary.com/topmate/image/upload/v1778235780/Screenshot_2026-04-30_at_11.14.46_PM_ktbilv.png'),
  ('image', 250, 'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.23.35_PM_djrk8n.png'),
  ('image', 260, 'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.18.27_PM_fwpnvh.png'),
  ('image', 270, 'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.21.24_PM_ntw6m9.png'),
  ('image', 280, 'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.25.03_PM_in8ujr.png')
) AS v(kind, display_order, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.cohort_testimonials WHERE kind = 'image');
