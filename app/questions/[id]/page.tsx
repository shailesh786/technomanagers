/**
 * app/questions/[id]/page.tsx — Question detail (Server Component)
 *
 * Rendering strategy:
 *   ISR with revalidate=60 — pages are statically generated and rebuilt in
 *   the background every 60 seconds. Switching from force-dynamic (cookies-based
 *   server client) to ISR + public client cuts LCP from ~5s to <1s for the
 *   vast majority of visits (published questions, public RLS).
 *
 * - generateMetadata fetches question_text + company for per-page <title> / OG tags.
 * - The question row is prefetched into the TanStack Query cache so
 *   QuestionDetailClient renders content immediately with no skeleton.
 * - React.cache() deduplicates the Supabase round-trip between generateMetadata
 *   and the page component — both call getQuestionById(id) but only one DB
 *   query is issued per render.
 * - createSupabasePublicClient (cookieless) is used so this page stays ISR-cached.
 *   Draft questions are not accessible via this public URL (use the admin panel).
 */

import { cache } from 'react';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import QuestionDetailClient from '@/components/questions/QuestionDetailClient';
import { createSupabasePublicClient } from '@/lib/supabase/public';

// ISR: rebuild question detail pages at most once every 60 seconds.
// Previously force-dynamic (cookies() call) → fresh DB hit on every visit.
// Now ISR-cached → serves from Vercel CDN for 60s, then rebuilds in background.
export const revalidate = 60;

interface Props {
  params: { id: string };
}

// Deduplicated per-render question fetcher.
// Both generateMetadata and the page component call this; React caches the
// result so only one Supabase query is issued per render.
// Uses the public (cookieless) client so this page stays ISR-compatible.
const getQuestionById = cache(async (id: string) => {
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  return data ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const question = await getQuestionById(params.id);

  if (!question) {
    return {
      title: 'Question Not Found | Technomanagers',
    };
  }

  const companiesStr = (question.company as string[] | null)?.join(', ');
  // Truncate long question text gracefully for the <title> tag
  const shortText =
    question.question_text.length > 70
      ? `${question.question_text.slice(0, 70).trimEnd()}…`
      : question.question_text;

  const title = `${shortText} | Technomanagers`;
  const description = companiesStr
    ? `PM interview question from ${companiesStr}. Difficulty: ${question.difficulty ?? 'N/A'}. Practice with real questions on Technomanagers.`
    : `PM interview question. Difficulty: ${question.difficulty ?? 'N/A'}. Practice with real questions on Technomanagers.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function QuestionDetailPage({ params }: Props) {
  const queryClient = new QueryClient();

  // Prefetch the full question row — key matches useQuestion(id) exactly.
  await queryClient.prefetchQuery({
    queryKey: ['question', params.id],
    queryFn: () => getQuestionById(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QuestionDetailClient id={params.id} />
    </HydrationBoundary>
  );
}
