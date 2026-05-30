/**
 * Coaching page — prefetches the default "All" tab server-side.
 * Query key ['coaching', 'All'] matches useCoaching('All') in CoachingPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import CoachingPage from '@/components/coaching/CoachingPage';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// ISR: rebuild at most once every 5 minutes — avoids a fresh Supabase hit on every visit
export const revalidate = 300;

export const metadata: Metadata = {
  title: '1:1 Coaching | Technomanagers',
  description:
    'Get personalized 1:1 coaching from experienced Product Managers. Mock interviews, resume reviews, mentorship sessions, and masterclasses.',
  openGraph: {
    title: '1:1 Coaching | Technomanagers',
    description:
      'Personalized PM coaching — mock interviews, resume reviews, and mentorship from industry experts.',
    type: 'website',
  },
};

export default async function Coaching() {
  const queryClient = new QueryClient();

  // Prefetch the default "All" tab — matches useCoaching('All') in CoachingPage.
  // When filter is 'All', no service_type filter is applied — all active services returned.
  await queryClient.prefetchQuery({
    queryKey: ['coaching', 'All'],
    queryFn: async () => {
      const supabase = createSupabasePublicClient();
      const { data } = await supabase
        .from('coaching_services')
        .select('id, title, service_type, short_description, price, original_price, duration, platform, rating, external_url, badge_text, display_order, status')
        .eq('status', 'active')
        .order('display_order', { ascending: true });
      return data ?? [];
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CoachingPage />
    </HydrationBoundary>
  );
}
