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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/questions`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/coaching`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/cohort`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    const supabase = createSupabasePublicClient();
    const { data: questions } = await supabase
      .from('questions')
      .select('id, updated_at, company, category, role')
      .eq('status', 'published');
    const rows = questions ?? [];

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
  } catch {
    // If Supabase is unavailable during build, return static routes only
    return staticRoutes;
  }
}
