/**
 * app/sitemap.ts — Dynamic XML sitemap
 *
 * Next.js auto-serves this as /sitemap.xml.
 * Includes all static public routes + a URL per published question fetched
 * live from Supabase so new questions are indexed immediately.
 */

import type { MetadataRoute } from 'next';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// ISR: regenerate the sitemap at most once an hour. Without this the sitemap
// is baked once at build time and goes stale — questions published after the
// last deploy never appear until the next deployment.
export const revalidate = 3600;

const _raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://technomanagers.com';
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
      .select('id, updated_at')
      .eq('status', 'published');

    const questionRoutes: MetadataRoute.Sitemap = (questions ?? []).map((q) => ({
      url: `${BASE_URL}/questions/${q.id}`,
      lastModified: new Date(q.updated_at ?? Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...questionRoutes];
  } catch {
    // If Supabase is unavailable during build, return static routes only
    return staticRoutes;
  }
}
