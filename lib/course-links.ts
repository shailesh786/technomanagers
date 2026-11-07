/**
 * lib/course-links.ts — which `courses` rows have an on-site page, and where
 * a course link should point. Kept apart from lib/course-pages.ts on purpose:
 * the navbar and course cards run in the browser, and importing the page
 * copy from there would ship every course's content in the client bundle.
 */

import type { Course } from '@/types';

/**
 * Published on-site course page slug → the `courses.id` of the row it sells.
 * Only courses listed here get a page, a sitemap entry and on-site links;
 * a draft in lib/course-pages.ts stays unpublished until it is added here.
 */
export const COURSE_PAGE_IDS = {
  'ai-product-management-course': '21bfa747-3127-4205-82f8-9d2f8cf6839f',
  'ai-program-management-course': 'ac715e2c-78bb-42b3-89e3-61454cd812a8',
} as const;

export type CoursePageSlug = keyof typeof COURSE_PAGE_IDS;

/** The on-site page slug for a `courses` row, or undefined when it has none. */
export function coursePageSlug(course: Pick<Course, 'id'>): CoursePageSlug | undefined {
  return (Object.keys(COURSE_PAGE_IDS) as CoursePageSlug[]).find((slug) => COURSE_PAGE_IDS[slug] === course.id);
}

/** Where a course card or nav link should point: its own page, else Topmate. */
export function courseHref(course: Pick<Course, 'id' | 'external_url'>): { href: string; external: boolean } {
  const slug = coursePageSlug(course);
  return slug ? { href: `/courses/${slug}`, external: false } : { href: course.external_url, external: true };
}
