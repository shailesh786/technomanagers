/**
 * /courses/[slug] share card — the course's own title, not the /courses
 * listing card it would otherwise inherit, plus the live coupon (admin
 * Courses form) so WhatsApp / LinkedIn previews show the code. Unknown slugs
 * fall back to the site card.
 *
 * Note: those apps cache a preview image for days, so a post shared during
 * an offer keeps showing the code after it ends.
 */

import { getCourseOffer } from '@/lib/course-data';
import { getCoursePage, offerEndDay } from '@/lib/course-pages';
import { OG_CONTENT_TYPE, OG_SIZE, SITE_OG_CARD, renderOgCard } from '@/lib/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Course on Technomanagers';

export default async function OgImage({ params }: { params: { slug: string } }) {
  const page = getCoursePage(params.slug);
  if (!page) return renderOgCard(SITE_OG_CARD);
  const offer = await getCourseOffer(page.courseId);
  return renderOgCard({
    eyebrow: page.category,
    title: `${page.titleBefore}${page.titleLead}${page.titleRest}`,
    meta: page.facts.map((f) => `${f.label}: ${f.value}`).slice(0, 3).join(' · '),
    ...(offer ? { coupon: { headline: offer.label, code: offer.code, until: offerEndDay(offer) } } : {}),
  });
}
