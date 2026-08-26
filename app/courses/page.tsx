/**
 * Courses page — prefetches all active courses server-side.
 * Query key ['courses'] matches useCourses() in CoursesPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import CoursesPage from '@/components/courses/CoursesPage';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { coursesJsonLd } from '@/lib/marketing-jsonld';
import { serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';
import type { Course } from '@/types';

// ISR: rebuild at most once every 5 minutes — avoids a fresh Supabase hit on every visit
export const revalidate = 300;

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: 'PM Courses',
  description:
    'Level up your product management skills with structured courses designed by industry experts.',
  alternates: { canonical: '/courses' },
  openGraph: {
    title: 'PM Courses',
    description:
      'Structured PM courses to sharpen your product strategy, execution, and interview skills.',
    type: 'website',
    url: '/courses',
  },
};

export default async function Courses() {
  const queryClient = new QueryClient();

  // Fetch once, then both prefetch (key ['courses'] matches useCourses())
  // and emit Course JSON-LD from the same rows.
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from('courses')
    .select('id, title, short_description, thumbnail_url, external_url, category, display_order, status')
    .eq('status', 'active')
    .order('display_order', { ascending: true });
  const courses = (data ?? []) as Course[];

  await queryClient.prefetchQuery({
    queryKey: ['courses'],
    queryFn: async () => courses,
  });

  return (
    <>
      {courses.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(coursesJsonLd(courses, resolveSiteUrl())) }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CoursesPage />
      </HydrationBoundary>
    </>
  );
}
