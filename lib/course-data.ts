/**
 * lib/course-data.ts — server-side course loading for the course detail
 * pages and the navbar's Courses menu. Cookieless client only: every caller
 * is ISR or the root layout. Same select and order as useCourses(), so the
 * rows match what /courses shows.
 */

import { unstable_cache } from 'next/cache';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { courseOfferFromRow, type CourseOffer } from '@/lib/course-pages';
import type { Course } from '@/types';

export const COURSE_LIST_SELECT =
  'id, title, short_description, thumbnail_url, external_url, category, display_order, status';

export const getActiveCourses = unstable_cache(
  async (): Promise<Course[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_LIST_SELECT)
      .eq('status', 'active')
      .order('display_order', { ascending: true });
    // Throw so a DB blip is not cached as "no courses" (which would 404
    // every course page and empty the nav menu for 300 s).
    if (error) throw error;
    return (data ?? []) as Course[];
  },
  ['active-courses'],
  { revalidate: 300, tags: ['courses'] },
);

// Caches the raw offer columns only. Whether the offer has ended is decided
// in getCourseOffer at every render — deciding it here would let a cached
// "still live" answer outlast the deadline by up to the cache window.
const getCourseOfferRow = unstable_cache(
  async (courseId: string): Promise<Pick<Course, 'offer_label' | 'offer_code' | 'offer_ends_at'> | null> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from('courses')
      .select('offer_label, offer_code, offer_ends_at')
      .eq('id', courseId)
      .maybeSingle();
    // Throw so a failed read is not cached as "no offer".
    if (error) throw error;
    return data;
  },
  ['course-offer-row'],
  { revalidate: 300, tags: ['courses'] },
);

/**
 * The course's live offer (admin Courses form), or null when there is none or
 * its end time has passed. Read separately from the course row on purpose:
 * if the offer columns are missing (migration not yet applied) or the read
 * fails, the page just shows no offer instead of failing.
 *
 * An ISR copy rendered before the deadline can still be served briefly after
 * it; the offer components remove themselves in the browser at the deadline,
 * so a visitor never sees an ended offer once the page has loaded.
 */
export async function getCourseOffer(courseId: string): Promise<CourseOffer | null> {
  try {
    return courseOfferFromRow(await getCourseOfferRow(courseId), Date.now());
  } catch {
    return null;
  }
}
