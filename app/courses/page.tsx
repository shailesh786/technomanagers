/**
 * Courses page — prefetches all active courses server-side.
 * Query key ['courses'] matches useCourses() in CoursesPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import CoursesPage from '@/components/courses/CoursesPage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ISR: rebuild at most once every 5 minutes — avoids a fresh Supabase hit on every visit
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'PM Courses | Technomanagers',
  description:
    'Level up your product management skills with structured courses designed by industry experts.',
  openGraph: {
    title: 'PM Courses | Technomanagers',
    description:
      'Structured PM courses to sharpen your product strategy, execution, and interview skills.',
    type: 'website',
  },
};

export default async function Courses() {
  const queryClient = new QueryClient();

  // Prefetch all active courses — matches useCourses() query key ['courses'].
  await queryClient.prefetchQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('courses')
        .select('id, title, short_description, thumbnail_url, external_url, category, display_order, status')
        .eq('status', 'active')
        .order('display_order', { ascending: true });
      return data ?? [];
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CoursesPage />
    </HydrationBoundary>
  );
}
