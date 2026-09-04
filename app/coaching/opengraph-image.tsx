/**
 * /coaching share card — this page's own pitch. Was a re-export of the site-wide
 * fallback card, so shares showed the homepage message instead of coaching's.
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = '1:1 PM coaching — mock interviews, resume reviews and mentorship from experienced Product Managers';

export default function OgImage() {
  return renderOgCard({
    eyebrow: '1:1 PM Coaching',
    title: 'Get Coached by Experienced Product Managers',
    meta: 'Mock interviews · Resume reviews · Mentorship',
  });
}
