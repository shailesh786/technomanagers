-- Cohort applications now send ONE email per lead: To the applicant, with the
-- team on BCC (LEADS_NOTIFY_EMAIL), so the team's copy is the very email the
-- applicant received. Store Resend's id for that email so delivery can be
-- looked up later (resend.com/emails/<id>).
-- team_email_sent_at now means "the team was BCC'd on that email".

ALTER TABLE public.cohort_applications
  ADD COLUMN IF NOT EXISTS resend_email_id text;
