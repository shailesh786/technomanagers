-- Cohort application (lead) form: technomanagers.in/cohort/apply
--
-- Rows are written ONLY by the server route /api/cohort-applications, using
-- the service-role key (which bypasses RLS). There is deliberately no INSERT
-- policy for anon/authenticated, so nobody can post rows straight to the REST
-- API and skip validation, the consent snapshot or the email copies.
-- Admins can read every row and update status/notes from the admin portal.

CREATE TABLE IF NOT EXISTS public.cohort_applications (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),

  -- What the applicant entered
  full_name               text NOT NULL,
  email                   text NOT NULL,
  country                 text NOT NULL,          -- country name, e.g. India
  country_code            text NOT NULL,          -- calling code, e.g. +91
  phone                   text NOT NULL,
  job_role                text NOT NULL,          -- "current role" ("current_role" is reserved)
  experience              text NOT NULL,
  primary_goal            text NOT NULL,

  -- Consent record: exact wording shown + what was ticked, and which version
  consents                jsonb NOT NULL,
  consent_version         text NOT NULL,
  policy_versions         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Context captured at submission
  source_url              text,
  utm                     jsonb,
  ip_address              text,
  user_agent              text,
  user_id                 uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Admin workflow
  status                  text NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','contacted','call_done','enrolled','not_joining','spam')),
  admin_notes             text,

  -- Delivery tracking for the email copies and the Google Sheet row
  applicant_email_sent_at timestamptz,
  team_email_sent_at      timestamptz,
  sheet_synced_at         timestamptz,
  sync_errors             text
);

CREATE INDEX IF NOT EXISTS cohort_applications_created_at_idx ON public.cohort_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS cohort_applications_email_idx      ON public.cohort_applications (lower(email));

ALTER TABLE public.cohort_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read cohort applications" ON public.cohort_applications;
CREATE POLICY "Admins can read cohort applications"
  ON public.cohort_applications FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update cohort applications" ON public.cohort_applications;
CREATE POLICY "Admins can update cohort applications"
  ON public.cohort_applications FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- No INSERT or DELETE policies on purpose (see header).
