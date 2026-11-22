# Cohort application form — setup

The form lives at **technomanagers.in/cohort/apply**. Every submission:

1. is saved in Supabase (`cohort_applications`), with the exact consent wording the applicant ticked, the consent version, time, IP and browser;
2. appears in **Admin → Leads** (status, notes, CSV export, link to the Sheet);
3. emails the applicant a copy of their answers and the consent they ticked, from `hello@technomanagers.in`;
4. emails the team a copy (Reply goes to the applicant);
5. adds a row to the Google Sheet.

Steps 3–5 are optional and independent. If one isn't set up or fails, the application is still saved and Admin → Leads shows what didn't go out.

Do the steps below once, in this order.

---

## 1. Run the database migration (before merging)

Supabase Dashboard → SQL Editor → paste and run
`supabase/migrations/20261122120000_cohort_applications.sql`.

It creates the table. Only the server can add rows, and only admins can read or update them.

## 2. Supabase service-role key → Vercel

Supabase Dashboard → Project Settings → API Keys → under **Secret keys**, create one (e.g. `vercel-website`) and copy it (`sb_secret_…`). The legacy **service_role** key also works until Supabase retires legacy keys. Never use the publishable/anon key here.
Vercel → technomanagers → Settings → Environment Variables → add, for Production and Preview:

| Name | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |

This key has full database access. Never prefix it with `NEXT_PUBLIC_`, and never paste it anywhere else.

## 3. Email from hello@technomanagers.in (Resend)

There is no mailbox at technomanagers.in. Resend only *sends* as that address, and replies go to your Gmail through Reply-To.

1. Sign up at resend.com (free: 3,000 emails/month, 100/day).
2. Domains → Add domain → `technomanagers.in` (region: closest to India, e.g. Tokyo/ap-northeast-1).
3. Resend shows 3–4 DNS records (an MX and a TXT on `send`, a DKIM TXT on `resend._domainkey`, and an optional DMARC TXT).
   Add each one in **GoDaddy → My Products → technomanagers.in → DNS → Add record**, with the type, name and value exactly as Resend shows them.
   These records live on the `send` and `resend._domainkey` subdomains, so they don't affect the website.
4. Back in Resend, click **Verify**. It usually takes 5–30 minutes.
5. API Keys → Create API key (permission: Sending access, domain: technomanagers.in).
6. Vercel env vars (Production + Preview):

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the API key |
| `LEADS_FROM_EMAIL` | `TechnoManagers <hello@technomanagers.in>` |
| `LEADS_REPLY_TO` | your Gmail address (where applicants' replies should land) |
| `LEADS_NOTIFY_EMAIL` | who gets the team copy, comma-separated |

## 4. Google Sheet

1. Create a Google Sheet, e.g. "Cohort applications".
2. Extensions → Apps Script. Delete the sample code and paste all of `docs/integrations/cohort-applications-sheet.gs`.
3. Change `SECRET` at the top to a long random string (e.g. from `openssl rand -hex 24`).
4. Select the `setup` function → ▶ Run → approve the permissions. This creates the **Applications** tab with headers.
5. Deploy → New deployment → type **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy. Copy the web-app URL (ends in `/exec`).
6. Vercel env vars (Production + Preview):

| Name | Value |
|---|---|
| `LEADS_SHEET_WEBHOOK_URL` | the `/exec` URL |
| `LEADS_SHEET_WEBHOOK_SECRET` | the same secret as in the script |
| `NEXT_PUBLIC_LEADS_SHEET_URL` | the Sheet's normal URL (for the "Google Sheet" button in admin) |

If you edit the script later, use Deploy → **Manage deployments** → edit → New version, so the URL stays the same.

## 5. Redeploy, then switch the Apply buttons

1. Vercel → Deployments → Redeploy the latest production build, so the new env vars take effect.
2. Admin → Cohort → **Apply link** → change it from the HubSpot URL to `/cohort/apply` → Save.
   The code already defaults to `/cohort/apply`, but the saved admin setting wins.

## 6. Test

Submit the form once with your own email. Check that:
- the row is in Admin → Leads, and "Copies" says **All sent**;
- both emails arrived (check Spam the first time);
- the row is in the Sheet.

If "Copies" says **Check**, open the row: the error line says which channel failed and why. Mark the test row as **Spam** afterwards.

## Changing the consent wording

The consent text is in `lib/cohort-application.ts`. If you change any wording, bump `CONSENT_VERSION` in the same commit. Every row stores the exact text and version it was submitted with, so older applications keep the wording that applicant actually saw.
