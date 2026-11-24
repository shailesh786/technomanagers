/**
 * lib/cohort-application-delivery.ts — everything that happens to a cohort
 * application after it is saved: one email to the applicant with the team on
 * BCC (so the team's copy is identical to what the applicant received), and
 * the Google Sheet row. Server-only (reads secret env vars).
 *
 * Each channel is optional and independent. If its env vars are missing or
 * the call fails, the application is still saved and the failure is written
 * to cohort_applications.sync_errors, where the admin view shows it.
 *
 * Env vars (all server-side, set in Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY              Resend API key (emails are skipped without it)
 *   LEADS_FROM_EMAIL            e.g. "TechnoManagers <hello@technomanagers.in>"
 *   LEADS_REPLY_TO              where applicant replies go, e.g. your Gmail
 *   LEADS_NOTIFY_EMAIL          team addresses BCC'd on every applicant email (comma-separated)
 *   LEADS_SHEET_WEBHOOK_URL     Google Apps Script web-app URL
 *   LEADS_SHEET_WEBHOOK_SECRET  shared secret the script checks
 */
import type { CohortApplicationRow, ConsentRecord } from '@/lib/cohort-application';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.technomanagers.in';
const TIMEOUT_MS = 8000;

/* ----------------------------- rendering ----------------------------- */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "22 Nov 2026, 4:05 pm IST" */
export function formatIst(iso: string): string {
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso)) + ' IST'
  );
}

function answerRows(row: CohortApplicationRow): [string, string][] {
  return [
    ['Name', row.full_name],
    ['Email', row.email],
    ['Phone / WhatsApp', `${row.country_code} ${row.phone} (${row.country})`],
    ['Current role', row.job_role],
    ['Work experience', row.experience],
    ['Main goal', row.primary_goal],
  ];
}

function tableHtml(rows: [string, string][]): string {
  return `<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:#64748b;vertical-align:top;padding-right:16px;white-space:nowrap">${escapeHtml(k)}</td><td style="color:#0f172a">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>`;
}

function consentsHtml(consents: ConsentRecord[]): string {
  return `<ul style="padding-left:18px;margin:8px 0;font-size:14px;color:#0f172a">${consents
    .map((c) => `<li style="margin:4px 0">${c.accepted ? '✅' : '⬜️'} ${escapeHtml(c.text)}</li>`)
    .join('')}</ul>`;
}

function consentsText(consents: ConsentRecord[]): string {
  return consents.map((c) => `${c.accepted ? '[x]' : '[ ]'} ${c.text}`).join('\n');
}

function wrap(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.5">${body}</div>`;
}

export function applicantEmail(row: CohortApplicationRow) {
  const first = row.full_name.split(/\s+/)[0];
  const submitted = formatIst(row.created_at);
  const subject = 'We received your application: AI Product Builder Cohort';
  const html = wrap(`
    <p>Hi ${escapeHtml(first)},</p>
    <p>Thanks for applying to the AI Product Builder Cohort. We have your application and will get back to you soon, usually on WhatsApp or by phone.</p>
    <p>This email is your copy of what you submitted on ${escapeHtml(submitted)}.</p>
    <h3 style="font-size:15px;margin:20px 0 4px">Your answers</h3>
    ${tableHtml(answerRows(row))}
    <h3 style="font-size:15px;margin:20px 0 4px">What you agreed to</h3>
    ${consentsHtml(row.consents)}
    <p style="font-size:14px">Before you pay, please re-read the <a href="${SITE_URL}/cohort">programme details</a> and the <a href="${SITE_URL}/refund-policy">Cancellation and Refund Policy</a>. Applying does not commit you to anything, and you only pay if you decide to join.</p>
    <p style="font-size:14px">If any detail above is wrong, just reply to this email.</p>
    <p>— Shailesh, TechnoManagers</p>
    <p style="font-size:12px;color:#64748b">Reference: ${escapeHtml(row.id)} · Consent version ${escapeHtml(row.consent_version)}</p>
  `);
  const text = [
    `Hi ${first},`,
    '',
    'Thanks for applying to the AI Product Builder Cohort. We have your application and will get back to you soon.',
    `This email is your copy of what you submitted on ${submitted}.`,
    '',
    ...answerRows(row).map(([k, v]) => `${k}: ${v}`),
    '',
    'What you agreed to:',
    consentsText(row.consents),
    '',
    `Programme details: ${SITE_URL}/cohort`,
    `Cancellation and Refund Policy: ${SITE_URL}/refund-policy`,
    'Applying does not commit you to anything; you only pay if you decide to join.',
    '',
    '— Shailesh, TechnoManagers',
    `Reference: ${row.id} · Consent version ${row.consent_version}`,
  ].join('\n');
  return { subject, html, text };
}

/** One flat row for the Google Sheet, in column order (see docs/integrations). */
export function sheetRow(row: CohortApplicationRow): Record<string, string> {
  return {
    submitted_at_ist: formatIst(row.created_at),
    name: row.full_name,
    email: row.email,
    phone: `${row.country_code} ${row.phone}`,
    country: row.country,
    current_role: row.job_role,
    experience: row.experience,
    primary_goal: row.primary_goal,
    consents: consentsText(row.consents),
    consent_version: row.consent_version,
    source_url: row.source_url || '',
    utm: row.utm ? Object.entries(row.utm).map(([k, v]) => `${k}=${v}`).join(', ') : '',
    reference_id: row.id,
  };
}

/* ----------------------------- sending ----------------------------- */

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

/**
 * Team addresses BCC'd on every applicant email, from LEADS_NOTIFY_EMAIL.
 * Malformed entries are dropped: one bad address would make Resend reject the
 * whole email, and the applicant would get nothing.
 */
export function teamBccList(): string[] {
  return (process.env.LEADS_NOTIFY_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s));
}

/** Sends one email through Resend and returns its id (to look it up in Resend later). */
async function sendViaResend(
  to: string[],
  mail: { subject: string; html: string; text: string },
  opts: { replyTo?: string; bcc?: string[] } = {},
): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_FROM_EMAIL;
  if (!key || !from) throw new Error('email not configured (RESEND_API_KEY / LEADS_FROM_EMAIL)');
  const res = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      ...(opts.bcc?.length ? { bcc: opts.bcc } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json().catch(() => ({}))) as { id?: unknown };
  return typeof json.id === 'string' ? json.id : null;
}

/**
 * The one email per application: To the applicant, BCC the team. The applicant
 * cannot see the BCC addresses; the team's copy is the very same email.
 * Replies go to LEADS_REPLY_TO.
 */
export async function sendApplicantCopy(row: CohortApplicationRow, bcc: string[] = teamBccList()) {
  return sendViaResend([row.email], applicantEmail(row), {
    replyTo: process.env.LEADS_REPLY_TO || undefined,
    bcc,
  });
}

export async function appendToSheet(row: CohortApplicationRow) {
  const url = process.env.LEADS_SHEET_WEBHOOK_URL;
  const secret = process.env.LEADS_SHEET_WEBHOOK_SECRET;
  if (!url || !secret) throw new Error('sheet not configured (LEADS_SHEET_WEBHOOK_URL / SECRET)');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script reads e.postData.contents
    body: JSON.stringify({ secret, row: sheetRow(row) }),
    redirect: 'follow',
  });
  const body = await res.text();
  if (!res.ok || !body.includes('"ok":true')) throw new Error(`Sheet ${res.status}: ${body.slice(0, 200)}`);
}

/**
 * Sends the email (applicant + team BCC) and the Sheet row in parallel and
 * reports what succeeded. Never throws — a delivery failure must not lose the
 * application. team_email_sent_at means "the team was BCC'd on that email".
 */
export async function deliverApplication(row: CohortApplicationRow) {
  const bcc = teamBccList();
  const [email, sheet] = await Promise.allSettled([sendApplicantCopy(row, bcc), appendToSheet(row)]);
  const now = new Date().toISOString();
  const sent = email.status === 'fulfilled';
  const errors = [
    email.status === 'rejected' ? `email: ${String(email.reason?.message ?? email.reason)}` : null,
    sent && !bcc.length ? 'team BCC: no valid address in LEADS_NOTIFY_EMAIL' : null,
    sheet.status === 'rejected' ? `sheet: ${String(sheet.reason?.message ?? sheet.reason)}` : null,
  ].filter(Boolean) as string[];
  return {
    applicant_email_sent_at: sent ? now : null,
    team_email_sent_at: sent && bcc.length ? now : null,
    resend_email_id: sent ? email.value : null,
    sheet_synced_at: sheet.status === 'fulfilled' ? now : null,
    sync_errors: errors.length ? errors.join(' | ') : null,
  };
}
