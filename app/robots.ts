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

const _raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.technomanagers.in';
const BASE_URL = /^https?:\/\//i.test(_raw) ? _raw : `https://${_raw}`;

// /api has no crawlable value. /auth, /profile and /admin are deliberately NOT
// disallowed here: they now carry a noindex meta tag, and Google must be able
// to crawl a page to see its noindex. Blocking them in robots.txt would leave
// any already-indexed copies stuck in the index.
const DISALLOW = ['/api/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'Googlebot', allow: '/', disallow: DISALLOW },
      { userAgent: 'Bingbot', allow: '/', disallow: DISALLOW },
      { userAgent: 'Twitterbot', allow: '/', disallow: DISALLOW },
      { userAgent: 'facebookexternalhit', allow: '/', disallow: DISALLOW },
      { userAgent: '*', allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
