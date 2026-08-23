/**
 * lib/site-url.ts — the canonical origin for absolute URLs in structured data.
 *
 * NEXT_PUBLIC_SITE_URL may arrive bare (technomanagers.in) or with a trailing
 * slash; this is the same normalisation app/layout.tsx, app/sitemap.ts and
 * app/cohort/page.tsx apply inline.
 */
export function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.technomanagers.in';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}
