/**
 * app/questions/[id]/page.tsx — Question detail (Server Component)
 *
 * Rendering strategy — two modes:
 *
 *   Normal (/questions/[id]):
 *     ISR revalidate=60 — pages served from Vercel CDN for 60 s then rebuilt
 *     in background. Uses the cookieless public client. Only published
 *     questions are accessible (anon RLS). Cuts LCP from ~5 s to <1 s.
 *
 *   Admin preview (/questions/[id]?preview=1):
 *     noStore() bypasses ISR for this render. Uses the session-aware server
 *     client so RLS allows admins to read draft questions. Regular users who
 *     add ?preview=1 still only see published questions (RLS blocks drafts).
 *
 * React.cache() deduplicates the Supabase round-trip between generateMetadata
 * and the page component within a single render — only one DB query per request.
 */

import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import QuestionDetailClient from '@/components/questions/QuestionDetailClient';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ISR: rebuild question detail pages at most once every 60 seconds.
// noStore() called inside the render overrides this for ?preview=1 requests.
export const revalidate = 60;

interface Props {
  params: { id: string };
  searchParams: { preview?: string };
}

// ── Public fetcher (ISR-compatible) ──────────────────────────────────────────
// Used for all normal visits. Cookieless client — only published questions
// are accessible via RLS. React.cache deduplicates within a single render.
const getPublishedQuestion = cache(async (id: string) => {
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  return data ?? null;
});

// ── Auth fetcher (admin preview only) ────────────────────────────────────────
// Used only when ?preview=1 is in the URL. Reads the session cookie so Supabase
// RLS allows admins to read draft questions. noStore() is called alongside this
// so the render is never cached — each preview always hits the DB fresh.
const getQuestionForPreview = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();
  return data ?? null;
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const isPreview = searchParams?.preview === '1';
  if (isPreview) noStore();

  const question = isPreview
    ? await getQuestionForPreview(params.id)
    : await getPublishedQuestion(params.id);

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

export default async function QuestionDetailPage({ params, searchParams }: Props) {
  const isPreview = searchParams?.preview === '1';

  // Bypass ISR for admin preview requests so the draft is always fresh.
  if (isPreview) noStore();

  const queryClient = new QueryClient();

  // Prefetch the full question row — key matches useQuestion(id) exactly.
  await queryClient.prefetchQuery({
    queryKey: ['question', params.id],
    queryFn: () =>
      isPreview ? getQuestionForPreview(params.id) : getPublishedQuestion(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QuestionDetailClient id={params.id} />
    </HydrationBoundary>
  );
}
