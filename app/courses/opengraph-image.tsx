/**
 * /courses share card — this page's own pitch. Was a re-export of the site-wide
 * fallback card, so shares showed the homepage message instead of courses's.
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'PM courses — structured product management courses designed by industry experts';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'PM Courses',
    title: 'Level Up Your Product Management Skills',
    meta: 'Structured courses · Designed by industry experts',
  });
}
