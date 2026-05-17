/**
 * app/sitemap.ts — Dynamic XML sitemap
 *
 * Next.js auto-serves this as /sitemap.xml.
 *
 * Phase 5: Replace stub with dynamic generation — query Supabase for all
 * published question IDs and include them as individual sitemap entries.
 *
 * Current stub includes only the static public routes.
 */

import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://technomanagers.com';

export default function sitemap(): MetadataRoute.Sitemap {
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
  ];

  // TODO Phase 5: Fetch and append individual question URLs
  // const supabase = await createSupabaseServerClient()
  // const { data: questions } = await supabase
  //   .from('questions')
  //   .select('id, updated_at')
  //   .eq('status', 'published')
  // const questionRoutes = (questions ?? []).map((q) => ({
  //   url: `${BASE_URL}/questions/${q.id}`,
  //   lastModified: new Date(q.updated_at ?? Date.now()),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.6,
  // }))
  // return [...staticRoutes, ...questionRoutes]

  return staticRoutes;
}
