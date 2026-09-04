/**
 * /events share card — this page's own pitch. Was a re-export of the site-wide
 * fallback card, so shares showed the homepage message instead of events's.
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'PM events — webinars, workshops and live sessions with industry Product Managers';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'PM Events',
    title: 'Webinars, Workshops & Live Sessions with PM Experts',
    meta: 'Live sessions with industry Product Managers',
  });
}
