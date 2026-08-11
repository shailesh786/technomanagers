-- Optional external link to the "current cohort progress" page shown on /cohort.
-- NULL / empty means the link is hidden everywhere.
ALTER TABLE public.cohort_settings
  ADD COLUMN progress_url TEXT;
