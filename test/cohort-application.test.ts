import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cohortApplicationSchema,
  consentSnapshot,
  CONSENTS,
  type CohortApplicationRow,
} from '@/lib/cohort-application';
import { applicantEmail, deliverApplication, escapeHtml, sheetRow, teamBccList } from '@/lib/cohort-application-delivery';
import { COUNTRIES, countryByIso } from '@/lib/countries';

const valid = {
  fullName: '  Asha Rao ',
  email: 'Asha.Rao@Example.com',
  country: 'IN',
  phone: '98765 43210',
  currentRole: 'Product Manager',
  experience: '3 to 5 years',
  primaryGoal: 'Build and ship real AI products',
  consents: { agreement: true },
  website: '',
};

describe('cohortApplicationSchema', () => {
  it('accepts a complete application and normalises name, email and phone', () => {
    const r = cohortApplicationSchema.parse(valid);
    expect(r.fullName).toBe('Asha Rao');
    expect(r.email).toBe('asha.rao@example.com');
    expect(r.phone).toBe('9876543210');
  });

  it('requires a phone number', () => {
    expect(cohortApplicationSchema.safeParse({ ...valid, phone: '' }).success).toBe(false);
  });

  it('rejects an unknown country', () => {
    expect(cohortApplicationSchema.safeParse({ ...valid, country: 'ZZ' }).success).toBe(false);
  });

  it('rejects the form when the consent is unticked', () => {
    const r = cohortApplicationSchema.safeParse({ ...valid, consents: { agreement: false } });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.join('.') === 'consents.agreement')).toBe(true);
  });
});

describe('countries', () => {
  it('has unique codes and India at +91', () => {
    expect(new Set(COUNTRIES.map((c) => c[0])).size).toBe(COUNTRIES.length);
    expect(countryByIso('IN')).toEqual({ name: 'India', dial: '+91' });
  });
});

describe('consentSnapshot', () => {
  it('stores the exact wording shown, with the refund and privacy policies named', () => {
    const snap = consentSnapshot(cohortApplicationSchema.parse(valid));
    expect(snap).toEqual([{ key: 'agreement', text: CONSENTS[0].text, required: true, accepted: true }]);
    expect(snap[0].text).toContain('technomanagers.in/cohort');
    expect(snap[0].text).toContain('refund policy');
    expect(snap[0].text).toContain('privacy policy');
  });
});

const app = cohortApplicationSchema.parse({ ...valid, fullName: 'Asha <script>alert(1)</script>' });
const row: CohortApplicationRow = {
    id: '11111111-2222-3333-4444-555555555555',
    created_at: '2026-11-22T10:35:00.000Z',
    full_name: app.fullName,
    email: app.email,
    country: 'India',
    country_code: '+91',
    phone: app.phone,
    job_role: app.currentRole,
    experience: app.experience,
    primary_goal: app.primaryGoal,
    consents: consentSnapshot(app),
    consent_version: '2026-11-22',
    policy_versions: {},
    source_url: 'https://www.technomanagers.in/cohort/apply',
    utm: { utm_source: 'linkedin' },
    ip_address: '1.2.3.4',
    user_agent: 'test',
    user_id: null,
    status: 'new',
    admin_notes: null,
    applicant_email_sent_at: null,
    team_email_sent_at: null,
    resend_email_id: null,
    sheet_synced_at: null,
    sync_errors: null,
};

describe('emails and sheet row', () => {

  it('escapes applicant-supplied text in the HTML', () => {
    expect(escapeHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    const { html } = applicantEmail(row);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('gives the applicant their answers, the consent they ticked and the time in IST', () => {
    const { html, text } = applicantEmail(row);
    expect(text).toContain('22 Nov 2026');
    expect(text).toContain('IST');
    expect(text).toContain(`[x] ${CONSENTS[0].text}`);
    expect(html).toContain('/refund-policy');
    expect(text).toContain(row.id);
  });

  it('builds the Sheet row in the documented columns', () => {
    const s = sheetRow(row);
    expect(Object.keys(s)).toEqual([
      'submitted_at_ist', 'name', 'email', 'phone', 'country', 'current_role', 'experience', 'primary_goal',
      'consents', 'consent_version', 'source_url', 'utm', 'reference_id',
    ]);
    expect(s.phone).toBe('+91 9876543210');
    expect(s.utm).toBe('utm_source=linkedin');
  });
});

describe('delivery: one email, team on BCC', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function stubEnv(notify: string) {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('LEADS_FROM_EMAIL', 'TechnoManagers <hello@technomanagers.in>');
    vi.stubEnv('LEADS_REPLY_TO', 'owner@example.com');
    vi.stubEnv('LEADS_NOTIFY_EMAIL', notify);
    vi.stubEnv('LEADS_SHEET_WEBHOOK_URL', 'https://sheet.example/exec');
    vi.stubEnv('LEADS_SHEET_WEBHOOK_SECRET', 's');
  }

  function mockFetch() {
    return vi.spyOn(global, 'fetch').mockImplementation(async (url) =>
      String(url).includes('resend.com')
        ? new Response(JSON.stringify({ id: 'email_123' }), { status: 200 })
        : new Response('{"ok":true}', { status: 200 }),
    );
  }

  it('sends a single email to the applicant with the team on BCC and keeps its id', async () => {
    stubEnv('a@example.com, b@example.com');
    const fetchSpy = mockFetch();
    const result = await deliverApplication(row);

    const resendCalls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('resend.com'));
    expect(resendCalls).toHaveLength(1);
    const body = JSON.parse((resendCalls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual([row.email]);
    expect(body.bcc).toEqual(['a@example.com', 'b@example.com']);
    expect(body.reply_to).toBe('owner@example.com');
    expect(body.subject).toBe(applicantEmail(row).subject);

    expect(result.resend_email_id).toBe('email_123');
    expect(result.applicant_email_sent_at).toBeTruthy();
    expect(result.team_email_sent_at).toBe(result.applicant_email_sent_at);
    expect(result.sheet_synced_at).toBeTruthy();
    expect(result.sync_errors).toBeNull();
  });

  it('drops a malformed BCC address instead of failing the whole email', () => {
    stubEnv('a@example.com, not-an-email ,');
    expect(teamBccList()).toEqual(['a@example.com']);
  });

  it('still emails the applicant when no team BCC is set, and flags it', async () => {
    stubEnv('');
    const fetchSpy = mockFetch();
    const result = await deliverApplication(row);
    const body = JSON.parse((fetchSpy.mock.calls.find(([u]) => String(u).includes('resend.com'))![1] as RequestInit).body as string);
    expect(body.bcc).toBeUndefined();
    expect(result.applicant_email_sent_at).toBeTruthy();
    expect(result.team_email_sent_at).toBeNull();
    expect(result.sync_errors).toContain('team BCC');
  });
});
