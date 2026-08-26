/**
 * Events page — prefetches all upcoming/live events server-side.
 * Query key ['events'] matches useEvents() in EventsPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import EventsPage from '@/components/events/EventsPage';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// ISR: rebuild at most once every 5 minutes — avoids a fresh Supabase hit on every visit
export const revalidate = 300;

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: 'Upcoming Events',
  description:
    'Join our upcoming webinars, workshops, and live sessions with industry PM experts.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: 'Upcoming Events',
    description:
      'Webinars, workshops, and live Q&A sessions with top Product Managers.',
    type: 'website',
    url: '/events',
  },
};

export default async function Events() {
  const queryClient = new QueryClient();

  // Prefetch upcoming + live events — matches useEvents() query key ['events'].
  await queryClient.prefetchQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const supabase = createSupabasePublicClient();
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('event_date', { ascending: true });
      return data ?? [];
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventsPage />
    </HydrationBoundary>
  );
}
