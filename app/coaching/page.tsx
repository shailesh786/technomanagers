/**
 * Coaching page — prefetches the default "All" tab server-side.
 * Query key ['coaching', 'All'] matches useCoaching('All') in CoachingPage.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import CoachingPage from '@/components/coaching/CoachingPage';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { coachingJsonLd } from '@/lib/marketing-jsonld';
import { serializeJsonLd } from '@/lib/question-seo';
import { resolveSiteUrl } from '@/lib/site-url';
import type { CoachingService } from '@/types';

// ISR: rebuild at most once every 5 minutes — avoids a fresh Supabase hit on every visit
export const revalidate = 300;

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: '1:1 Coaching',
  description:
    'Get personalized 1:1 coaching from experienced Product Managers. Mock interviews, resume reviews, mentorship sessions, and masterclasses.',
  alternates: { canonical: '/coaching' },
  openGraph: {
    title: '1:1 Coaching',
    description:
      'Personalized PM coaching — mock interviews, resume reviews, and mentorship from industry experts.',
    type: 'website',
    url: '/coaching',
  },
};

export default async function Coaching() {
  const queryClient = new QueryClient();

  // Fetch once, then both prefetch (key ['coaching', 'All'] matches
  // useCoaching('All') — no service_type filter applied on the All tab) and
  // emit Service JSON-LD from the same rows.
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from('coaching_services')
    .select('id, title, service_type, short_description, price, original_price, duration, platform, rating, external_url, badge_text, display_order, status')
    .eq('status', 'active')
    .order('display_order', { ascending: true });
  const services = (data ?? []) as CoachingService[];

  await queryClient.prefetchQuery({
    queryKey: ['coaching', 'All'],
    queryFn: async () => services,
  });

  return (
    <>
      {services.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(coachingJsonLd(services, resolveSiteUrl())) }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CoachingPage />
      </HydrationBoundary>
    </>
  );
}
