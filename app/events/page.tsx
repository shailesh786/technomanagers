/**
 * Events page — prefetches all upcoming/live events server-side.
 * Query key ['events'] matches useEvents() in EventsPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import EventsPage from '@/components/events/EventsPage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Upcoming Events | Technomanagers',
  description:
    'Join our upcoming webinars, workshops, and live sessions with industry PM experts.',
  openGraph: {
    title: 'Upcoming Events | Technomanagers',
    description:
      'Webinars, workshops, and live Q&A sessions with top Product Managers.',
    type: 'website',
  },
};

export default async function Events() {
  const queryClient = new QueryClient();

  // Prefetch upcoming + live events — matches useEvents() query key ['events'].
  await queryClient.prefetchQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const supabase = await createSupabaseServerClient();
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
