-- Per-course limited-time offer (coupon code + countdown) shown on the
-- course's on-site page, /courses/[slug]. Edited from the admin Courses form.
--
--   offer_label    — headline, e.g. '20% off for a limited time'
--   offer_code     — the Topmate coupon code visitors apply at checkout
--   offer_ends_at  — fixed end time; the countdown runs to it and the offer
--                    disappears from the page once it passes
--
-- No new policies: the existing courses RLS (public read, admin write)
-- already covers these columns. Idempotent: safe to re-run.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS offer_label text,
  ADD COLUMN IF NOT EXISTS offer_code text,
  ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz;

-- A code without an end time (or the reverse) would be a countdown to
-- nowhere — require both or neither.
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_offer_complete;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_offer_complete CHECK ((offer_code IS NULL) = (offer_ends_at IS NULL));

-- Carry over the offer that was live in code when this shipped:
-- AI Product Management Course, AIPM20, until 16 Nov 2026 23:59 IST.
UPDATE public.courses
SET offer_label = '20% off for a limited time',
    offer_code = 'AIPM20',
    offer_ends_at = '2026-11-16 23:59:59+05:30'
WHERE id = '21bfa747-3127-4205-82f8-9d2f8cf6839f'
  AND offer_code IS NULL;
