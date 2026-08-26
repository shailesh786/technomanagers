/**
 * Events page — prefetches all upcoming/live events server-side.
 * Query key ['events'] matches useEvents() in EventsPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import EventsPage from '@/components/events/EventsPage';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { eventsJsonLd } from '@/lib/marketing-jsonld';
import { serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';
import type { Event } from '@/types';

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

  // Fetch once, then both prefetch (key ['events'] matches useEvents()) and
  // emit Event JSON-LD from the same rows.
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true });
  const events = (data ?? []) as Event[];

  await queryClient.prefetchQuery({
    queryKey: ['events'],
    queryFn: async () => events,
  });

  return (
    <>
      {events.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventsJsonLd(events, resolveSiteUrl())) }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventsPage />
      </HydrationBoundary>
    </>
  );
}
