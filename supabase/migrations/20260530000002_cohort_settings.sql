-- Cohort settings — single-row config for the cohort page CTA buttons
-- (Apply Now + Ask on WhatsApp links). Editable from the admin panel.
CREATE TABLE public.cohort_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apply_url TEXT NOT NULL,
  whatsapp_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cohort_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read the cohort settings (public marketing page)
CREATE POLICY "Anyone can view cohort settings"
  ON public.cohort_settings FOR SELECT
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert cohort settings"
  ON public.cohort_settings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update cohort settings"
  ON public.cohort_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete cohort settings"
  ON public.cohort_settings FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_cohort_settings_updated_at
  BEFORE UPDATE ON public.cohort_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the single config row with the current hardcoded links so the page
-- behaves identically until an admin edits them. The app also falls back to
-- these same constants in code if this row is ever missing.
INSERT INTO public.cohort_settings (apply_url, whatsapp_url) VALUES (
  'https://share-na2.hsforms.com/1vL9J0C6rR9yhuOz54UhLog41clik',
  'https://api.whatsapp.com/send/?phone=918017145177&text=Hi+Anand%2C+I%27m+interested+in+the+AI+Product+Builder+Cohort&type=phone_number&app_absent=0'
);
