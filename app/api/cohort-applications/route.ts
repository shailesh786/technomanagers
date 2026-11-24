import { NextResponse } from 'next/server';
import { countryByIso } from '@/lib/countries';
import {
  cohortApplicationSchema,
  consentSnapshot,
  CONSENT_VERSION,
  POLICY_VERSIONS,
  type CohortApplicationRow,
} from '@/lib/cohort-application';
import { deliverApplication } from '@/lib/cohort-application-delivery';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runAfterResponse } from '@/lib/background';

/**
 * POST /api/cohort-applications — the cohort application ("lead") form.
 *
 * 1. Validates the body with the shared zod schema (same rules as the form).
 * 2. Saves the application, with the exact consent wording and version, via
 *    the service-role client (the table has no public INSERT policy).
 * 3. Replies straight away, then sends one email (to the applicant, team on
 *    BCC) and the Google Sheet row in the background (Vercel waitUntil) and records
 *    which of them worked. The Sheet's Apps Script alone can take seconds, so
 *    the applicant never waits on it. A failed email or Sheet write never
 *    loses the application — Admin → Leads shows the error.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim().slice(0, 64);
  return req.headers.get('x-real-ip')?.slice(0, 64) ?? null;
}

function cleanUtm(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200);
  }
  return Object.keys(out).length ? out : null;
}

async function signedInUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: bots fill every field. Pretend it worked, save nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const parsed = cohortApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the form', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const app = parsed.data;

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (e) {
    console.error('[cohort-applications] not configured:', e);
    return NextResponse.json({ error: 'Applications are temporarily unavailable. Please try again later.' }, { status: 503 });
  }

  // Look up the signed-in user (if any) while the duplicate check runs.
  const userIdPromise = signedInUserId();

  // A double-click or a refresh-and-resubmit should not create two leads.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from('cohort_applications')
    .select('id')
    .eq('email', app.email) // schema lowercases emails
    .gte('created_at', since)
    .limit(1);
  if (recent?.length) {
    return NextResponse.json({ ok: true, id: recent[0].id, duplicate: true });
  }

  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.slice(0, 500) : null;

  const insert = {
    full_name: app.fullName,
    email: app.email,
    country: countryByIso(app.country)?.name ?? app.country,
    country_code: countryByIso(app.country)?.dial ?? '',
    phone: app.phone,
    job_role: app.currentRole,
    experience: app.experience,
    primary_goal: app.primaryGoal,
    consents: consentSnapshot(app),
    consent_version: CONSENT_VERSION,
    policy_versions: POLICY_VERSIONS,
    source_url: sourceUrl,
    utm: cleanUtm(body.utm),
    ip_address: clientIp(req),
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    user_id: await userIdPromise,
  };

  const { data, error } = await supabase.from('cohort_applications').insert(insert).select('*').single();
  const row = data as CohortApplicationRow | null;

  if (error || !row) {
    console.error('[cohort-applications] insert failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  const deliver = (async () => {
    const delivery = await deliverApplication(row);
    const { error: updErr } = await supabase.from('cohort_applications').update(delivery).eq('id', row.id);
    if (updErr) console.error('[cohort-applications] delivery status update failed:', updErr);
    if (delivery.sync_errors) console.warn('[cohort-applications] delivery issues:', row.id, delivery.sync_errors);
  })().catch((e) => console.error('[cohort-applications] delivery crashed:', row.id, e));

  // Outside Vercel (local dev) there is no waitUntil, so finish the work first.
  if (!runAfterResponse(deliver)) await deliver;

  // The copy is sent in the background; tell the form whether one is set up.
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.LEADS_FROM_EMAIL);
  return NextResponse.json({ ok: true, id: row.id, emailSent: emailConfigured });
}
