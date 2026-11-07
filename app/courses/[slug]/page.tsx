/**
 * /courses/[slug] — on-site detail page for a course (Server Component, ISR).
 *
 * Copy comes from lib/course-pages.ts; the course's `courses` row supplies
 * the Topmate checkout link and decides whether the page exists at all (an
 * inactive or missing row 404s). No prices on-site: every Enroll button opens
 * Topmate. Public data only, cookieless — keep cookies()/searchParams out of
 * here or ISR silently turns into per-request rendering.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CourseDetail from '@/components/courses/CourseDetail';
import { getActiveCourses, getCourseOffer } from '@/lib/course-data';
import { COURSE_PAGES, getCoursePage, offerShareLine } from '@/lib/course-pages';
import { getHubQuestions } from '@/lib/hub-data';
import { courseJsonLd } from '@/lib/marketing-jsonld';
import { serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return COURSE_PAGES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getCoursePage(params.slug);
  if (!page) return {};
  // A live coupon goes into the share text (WhatsApp, LinkedIn), not the
  // search snippet — the meta description stays offer-free.
  const offer = await getCourseOffer(page.courseId);
  const shareDescription = offer ? `${offerShareLine(offer)} ${page.metaDescription}` : page.metaDescription;
  return {
    // seoTitle already ends in the brand, so skip the layout's title template.
    title: { absolute: page.seoTitle },
    description: page.metaDescription,
    alternates: { canonical: `/courses/${page.slug}` },
    openGraph: {
      title: page.seoTitle,
      description: shareDescription,
      type: 'website',
      url: `/courses/${page.slug}`,
      // Page-level openGraph/twitter replace the layout's, so repeat its shared fields.
      siteName: 'Technomanagers',
      locale: 'en_US',
    },
    twitter: { card: 'summary_large_image', site: '@technomanagers', title: page.seoTitle, description: shareDescription },
  };
}

export default async function CourseRoute({ params }: { params: { slug: string } }) {
  const page = getCoursePage(params.slug);
  if (!page) notFound();

  const courses = await getActiveCourses();
  const course = courses.find((c) => c.id === page.courseId);
  if (!course) notFound();

  const related = page.relatedSlugs
    .map((slug) => getCoursePage(slug))
    .map((p) => p && courses.find((c) => c.id === p.courseId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const [questions, offer] = await Promise.all([
    getHubQuestions('category', page.questionCategory).then((q) => q.slice(0, 2)),
    getCourseOffer(course.id),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(courseJsonLd(page, page.checkoutUrl ?? course.external_url, resolveSiteUrl())) }}
      />
      <CourseDetail page={page} course={course} related={related} questions={questions} offer={offer} />
    </>
  );
}
