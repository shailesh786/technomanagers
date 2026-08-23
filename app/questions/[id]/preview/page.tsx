/**
 * app/questions/[id]/preview/page.tsx — admin draft preview.
 *
 * The public question route is ISR and reads nothing from the request, so it
 * cannot show drafts. This route is dynamic on purpose: it reads the session
 * cookie so Supabase RLS lets an admin read an unpublished row. Anyone else
 * hitting it still only sees published questions (RLS), and the page is never
 * indexed. Linked from the admin question list.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import QuestionDetailClient from '@/components/questions/QuestionDetailClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Genuinely needs the caller's session on every request — see header.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Question preview',
  robots: { index: false, follow: false },
};

export default async function QuestionPreviewPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: question } = await supabase.from('questions').select('*').eq('id', params.id).single();
  if (!question) notFound();

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['question', params.id],
    queryFn: async () => question,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QuestionDetailClient id={params.id} clusters={[]} neighbours={{ prev: null, next: null }} />
    </HydrationBoundary>
  );
}
