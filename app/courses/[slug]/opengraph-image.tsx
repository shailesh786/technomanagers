/**
 * /courses/[slug] share card — the course's own title, not the /courses
 * listing card it would otherwise inherit. Unknown slugs fall back to the
 * site card.
 */

import { getCoursePage } from '@/lib/course-pages';
import { OG_CONTENT_TYPE, OG_SIZE, SITE_OG_CARD, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Course on Technomanagers';

export default function OgImage({ params }: { params: { slug: string } }) {
  const page = getCoursePage(params.slug);
  if (!page) return renderOgCard(SITE_OG_CARD);
  return renderOgCard({
    eyebrow: page.category,
    title: `${page.titleBefore}${page.titleLead}${page.titleRest}`,
    meta: page.facts.map((f) => `${f.label}: ${f.value}`).slice(0, 3).join(' · '),
  });
}
