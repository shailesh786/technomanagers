/**
 * /cohort share card — this page's own pitch. Was a re-export of the site-wide
 * fallback card, so shares showed the homepage message instead of cohort's.
 */

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'AI Product Builder Cohort — become a job-ready AI First Product Manager in 12 weeks';

export default function OgImage() {
  return renderOgCard({
    eyebrow: 'AI Product Builder Cohort',
    title: 'Become a Job Ready AI First Product Manager in 12 Weeks',
    meta: '12 weeks live · RAG, agents & evals · Demo Day',
  });
}
