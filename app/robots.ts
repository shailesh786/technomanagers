/**
 * app/robots.ts — Dynamic robots.txt
 *
 * Next.js serves this as /robots.txt automatically.
 * Replaces the static public/robots.txt (which has been deleted).
 *
 * Rules replicate the original static file exactly:
 * all crawlers are allowed everywhere, sitemap is advertised.
 */

import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://technomanagers.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'Twitterbot', allow: '/' },
      { userAgent: 'facebookexternalhit', allow: '/' },
      { userAgent: '*', allow: '/' },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
