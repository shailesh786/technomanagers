/**
 * Site-wide share card — Next serves this as the og:image for every route
 * that doesn't define its own (question pages and hubs do).
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard, SITE_OG_CARD } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Technomanagers — Product Management Community';

export default function OgImage() {
  return renderOgCard(SITE_OG_CARD);
}
