/**
 * app/sitemap.ts — Dynamic XML sitemap
 *
 * Next.js auto-serves this as /sitemap.xml.
 * Includes all static public routes + a URL per published question fetched
 * live from Supabase so new questions are indexed immediately.
 */

import type { MetadataRoute } from 'next';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { buildHubTaxonomy, hubHref, isIndexable } from '@/lib/hubs';

// ISR: regenerate the sitemap at most once an hour. Without this the sitemap
// is baked once at build time and goes stale — questions published after the
// last deploy never appear until the next deployment.
export const revalidate = 3600;

const _raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.technomanagers.in';
const BASE_URL = /^https?:\/\//i.test(_raw) ? _raw : `https://${_raw}`;

// Fixed lastmod per marketing route — bump when a page materially changes.
// The previous `new Date()` told crawlers every page changed on every
// regeneration, which teaches them to distrust our lastmod entirely.
const ROUTE_LASTMOD = {
  '/coaching': '2026-08-01T00:00:00+05:30',
  '/courses': '2026-08-01T00:00:00+05:30',
  '/cohort': '2026-08-26T00:00:00+05:30',
  '/events': '2026-08-01T00:00:00+05:30',
  '/privacy': '2026-07-01T00:00:00+05:30',
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, updated_at, company, category, role')
    .eq('status', 'published');
  // Throw on DB failure: a 500 makes Google keep its cached sitemap, which is
  // strictly better than shipping a valid 200 with every question+hub URL
  // missing and caching that for an hour.
  if (error) throw error;
  const rows = questions ?? [];

  // The honest lastmod for the pages that render question data: the latest
  // content change across the bank.
  const latest = rows.reduce<string | null>(
    (acc, q) => (q.updated_at && (!acc || q.updated_at > acc) ? q.updated_at : acc),
    null,
  );
  const contentLastMod = latest ? new Date(latest) : new Date(ROUTE_LASTMOD['/cohort']);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: contentLastMod, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/questions`, lastModified: contentLastMod, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/coaching`, lastModified: new Date(ROUTE_LASTMOD['/coaching']), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/courses`, lastModified: new Date(ROUTE_LASTMOD['/courses']), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/cohort`, lastModified: new Date(ROUTE_LASTMOD['/cohort']), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/events`, lastModified: new Date(ROUTE_LASTMOD['/events']), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(ROUTE_LASTMOD['/privacy']), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const questionRoutes: MetadataRoute.Sitemap = rows.map((q) => ({
    url: `${BASE_URL}/questions/${q.id}`,
    lastModified: new Date(q.updated_at ?? Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Hub pages, from the same rows. Only hubs past the indexability
  // threshold are listed (smaller ones exist but are noindex), and each
  // carries the latest updated_at of its questions as lastModified.
  const taxonomy = buildHubTaxonomy(rows);
  const hubRoutes: MetadataRoute.Sitemap = (['company', 'category', 'role'] as const).flatMap((kind) =>
    taxonomy[kind].filter(isIndexable).map((hub) => ({
      url: `${BASE_URL}${hubHref(kind, hub.name)}`,
      lastModified: hub.lastModified ? new Date(hub.lastModified) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  );

  return [...staticRoutes, ...hubRoutes, ...questionRoutes];
}
