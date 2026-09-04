/**
 * /questions share card — this page's own pitch. Was a re-export of the site-wide
 * fallback card, so shares showed the homepage message instead of questions's.
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'The question bank — real PM interview questions from top tech companies, with community answers';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'The Question Bank',
    title: 'Real PM Interview Questions from Top Tech Companies',
    meta: 'Google, Meta, Amazon & more · Community answers',
  });
}
