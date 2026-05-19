/**
 * app/coaching/page.tsx — Coaching page (Server Component, Phase 4)
 *
 * Prefetches the default "All" coaching services tab server-side.
 * The query key ['coaching', 'All'] matches useCoaching('All') in CoachingPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import CoachingPage from '@/components/coaching/CoachingPage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
      const supabase = await createSupabaseServerClient();
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
