/**
 * lib/cohort-application.ts — the cohort application ("lead") form, shared by
 * the public form (components/cohort/CohortApplyForm.tsx), the submit route
 * (app/api/cohort-applications/route.ts) and the admin view.
 *
 * The consent wording lives here, once, and is stored verbatim with every
 * application together with CONSENT_VERSION. That snapshot is the record of
 * exactly what the applicant ticked — so if you change any wording below, bump
 * CONSENT_VERSION in the same commit. Never edit the meaning of a past version.
 */
import { z } from 'zod';
import { COUNTRY_ISOS } from '@/lib/countries';

/** Bump whenever any CONSENTS text, or a policy it points at, changes. */
export const CONSENT_VERSION = '2026-11-22';

/** "Last updated" dates of the policies the consents link to (keep in sync with the pages). */
export const POLICY_VERSIONS = {
  refundPolicy: 'August 19, 2026',
  privacyPolicy: 'live version on technomanagers.in/privacy',
} as const;

export const CURRENT_ROLES = [
  'Product Manager',
  'Aspiring or transitioning into PM',
  'Engineer or Data Scientist',
  'Founder, Consultant or Business role',
  'Student',
] as const;

export const EXPERIENCE_BANDS = ['0 to 2 years', '3 to 5 years', '6 to 10 years', '10+ years'] as const;

export const PRIMARY_GOALS = [
  'Get an AI PM job',
  'Grow in my current PM role',
  'Build and ship real AI products',
  'Crack PM and AI PM interviews',
] as const;

/**
 * The consent checkbox: the Topmate form's wording, plus an explicit link to the refund policy.
 * It must be ticked to submit.
 */
export const CONSENTS = [
  {
    key: 'agreement',
    text: 'I have seen the curriculum, program details and policies on technomanagers.in/cohort, including the refund policy, and I agree to be contacted about my submission and consent to my data being stored as described in the privacy policy.',
  },
] as const;

export type ConsentKey = (typeof CONSENTS)[number]['key'];

const trimmed = (max: number) => z.string().trim().max(max);

const TICK_MESSAGE = 'Please tick this to continue';
const mustTick = z.boolean().refine((v) => v === true, TICK_MESSAGE);

/** Digits only (spaces, dashes and brackets are stripped before checking). */
function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export const cohortApplicationSchema = z.object({
  fullName: trimmed(120).min(2, 'Please enter your name'),
  email: trimmed(200).toLowerCase().email('Please enter a valid email'),
  country: z.enum(COUNTRY_ISOS, { errorMap: () => ({ message: 'Pick your country' }) }),
  phone: z
    .string()
    .transform(normalisePhone)
    .pipe(z.string().regex(/^\d{6,15}$/, 'Please enter a valid phone number')),
  currentRole: z.enum(CURRENT_ROLES, { errorMap: () => ({ message: 'Please pick your current role' }) }),
  experience: z.enum(EXPERIENCE_BANDS, { errorMap: () => ({ message: 'Please pick your experience' }) }),
  primaryGoal: z.enum(PRIMARY_GOALS, { errorMap: () => ({ message: 'Please pick your main goal' }) }),
  consents: z.object({ agreement: mustTick }),
  /** Honeypot. Real people never see or fill it. */
  website: z.string().optional(),
});

export type CohortApplicationInput = z.input<typeof cohortApplicationSchema>;
export type CohortApplication = z.output<typeof cohortApplicationSchema>;

/** The exact consent wording shown, with what the applicant ticked — stored with the row. */
export function consentSnapshot(app: CohortApplication) {
  return CONSENTS.map((c) => ({ key: c.key, text: c.text, required: true, accepted: app.consents[c.key] }));
}

export type ConsentRecord = ReturnType<typeof consentSnapshot>[number];

export const APPLICATION_STATUSES = ['new', 'contacted', 'call_done', 'enrolled', 'not_joining', 'spam'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  call_done: 'Call done',
  enrolled: 'Enrolled',
  not_joining: 'Not joining',
  spam: 'Spam',
};

/** Row shape in public.cohort_applications. */
export interface CohortApplicationRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  /** Country name, e.g. "India". */
  country: string;
  /** Calling code, e.g. "+91". */
  country_code: string;
  phone: string;
  /** "current_role" is reserved in Postgres, hence job_role. */
  job_role: string;
  experience: string;
  primary_goal: string;
  consents: ConsentRecord[];
  consent_version: string;
  policy_versions: Record<string, string>;
  source_url: string | null;
  utm: Record<string, string> | null;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  applicant_email_sent_at: string | null;
  team_email_sent_at: string | null;
  sheet_synced_at: string | null;
  sync_errors: string | null;
}
