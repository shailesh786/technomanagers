/**
 * app/questions/page.tsx — Questions listing (Server Component, Phase 4)
 *
 * QuestionsClient is loaded with ssr:false to avoid hydration mismatches.
 * The component uses useSearchParams(), Radix UI Popovers (aria-controls via
 * useId()), and auth state — all of which produce different output between
 * server and client during the Suspense hydration pass.
 *
 * With ssr:false, the server renders the QuestionsLoading skeleton (matching
 * the Suspense fallback). React hydrates THAT skeleton without any mismatch.
 * On the client, QuestionsClient renders immediately from the TanStack Query
 * cache (populated by HydrationBoundary) — so the user sees no loading flash.
 *
 * SEO note: individual /questions/[id] pages are fully SSR'd for crawlers.
 * The listing page is treated as an app-shell.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ssr:false — skips server-rendering QuestionsClient, avoiding hydration
// mismatches from auth state, Radix UI useId(), and useSearchParams().
const QuestionsClient = dynamic(
  () => import('@/components/questions/QuestionsClient'),
  { ssr: false, loading: () => <QuestionsLoading /> },
);

export const metadata: Metadata = {
  title: 'PM Interview Questions | Technomanagers',
  description:
    'Browse and practice real product management interview questions from Google, Meta, Amazon, Microsoft, and more top tech companies.',
  openGraph: {
    title: 'PM Interview Questions | Technomanagers',
    description:
      'Practice with real PM interview questions from top tech companies.',
    type: 'website',
  },
};

function QuestionsLoading() {
  return (
    <div className="container py-8 space-y-4">
      <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default async function QuestionsPage() {
  const queryClient = new QueryClient();

  // Prefetch the default view in parallel:
  //   1. questions list  — key must match useQuestions({ category:'All', companies:[], difficulties:[],
  //                         role:undefined, search:'', sort:'Hot', limit:20, offset:0 })
  //   2. active roles    — sidebar "Browse by Role" widget
  //   3. role counts     — count badges next to each role
  //   4. popular companies (top 6) — sidebar "Trending Companies" widget
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['questions', { category: 'All', companies: [], difficulties: [], role: undefined, search: '', sort: 'Hot', limit: 20, offset: 0 }],
      queryFn: async () => {
        const supabase = await createSupabaseServerClient();
        const { data } = await supabase
          .from('questions')
          .select('id, question_text, company, category, tags, difficulty, role, status, upvotes, created_at')
          .eq('status', 'published')
          .order('upvotes', { ascending: false })
          .range(0, 19);
        return data ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['roles', 'active'],
      queryFn: async () => {
        const supabase = await createSupabaseServerClient();
        const { data } = await supabase
          .from('roles')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        return data ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['roles', 'counts'],
      queryFn: async () => {
        const supabase = await createSupabaseServerClient();
        const { data } = await supabase
          .from('questions')
          .select('tags')
          .eq('status', 'published');
        const counts: Record<string, number> = {};
        (data ?? []).forEach((q: { tags: string[] | null }) => {
          (q.tags ?? []).forEach((t) => {
            counts[t] = (counts[t] || 0) + 1;
          });
        });
        return counts;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['companies', 'popular', 6],
      queryFn: async () => {
        const supabase = await createSupabaseServerClient();
        const { data } = await supabase.rpc('get_companies_with_counts', { include_inactive: false });
        return ((data ?? []) as Array<{ company_name: string; question_count: number }>).slice(0, 6);
      },
    }),
  ]);

  // HydrationBoundary must wrap Suspense (not be inside it) so the dehydrated
  // cache state is emitted into the HTML before QuestionsClient renders.
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<QuestionsLoading />}>
        <QuestionsClient />
      </Suspense>
    </HydrationBoundary>
  );
}
