/**
 * Questions listing page (Server Component)
 *
 * QuestionsClient uses ssr:false to avoid hydration mismatches from
 * useSearchParams(), Radix UI Popovers (useId()), and auth state — all of
 * which produce different output on the server vs the first client render.
 *
 * The server renders the loading skeleton; the client hydrates it cleanly,
 * then immediately swaps in QuestionsClient from the HydrationBoundary cache.
 *
 * SEO: individual /questions/[id] pages are fully SSR'd for crawlers.
 *
 * Performance:
 * - revalidate = 60  →  ISR: page is cached at the edge; only re-generated
 *   every 60 s, so TTFB drops from ~3s (cold Supabase) to <100 ms.
 * - unstable_cache    →  each Supabase query is cached independently with its
 *   own TTL; cache misses only hit the DB once across all concurrent requests.
 * - Query keys below MUST match exactly what QuestionsClient passes to
 *   useQuestions() so the HydrationBoundary cache is actually used.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

export const revalidate = 60; // ISR: regenerate at most every 60 seconds

// Cookieless anon client for the cached prefetch fetchers below.
//
// IMPORTANT: do NOT use createSupabaseServerClient() here — it reads cookies(),
// and Next 14 THROWS when cookies() is accessed inside unstable_cache(). That
// throw was silently swallowed, so every prefetch returned nothing, the
// HydrationBoundary cache shipped empty, and the client (ssr:false) had to
// refetch all data before the question cards (the LCP element) could paint —
// the root cause of the slow FCP/LCP on this route. All four queries below read
// only public, published rows that the anon role can access via RLS, so no
// session cookie is needed.
function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ── ssr:false: skips server-rendering QuestionsClient ──────────────────────
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

// ── Cached data fetchers ────────────────────────────────────────────────────
// All fetch public data (no user-specific rows), so caching is safe.

const getDefaultQuestions = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    const { data } = await supabase
      .from('questions')
      .select('id, question_text, company, category, tags, difficulty, role, status, upvotes, created_at')
      .eq('status', 'published')
      .order('upvotes', { ascending: false })
      .range(0, 19);
    return data ?? [];
  },
  ['questions-default-hot'],
  { revalidate: 60, tags: ['questions'] },
);

const getActiveRoles = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    const { data } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    return data ?? [];
  },
  ['roles-active'],
  { revalidate: 300, tags: ['roles'] },
);

const getRoleCounts = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    // Use `role` column (not `tags`) to match the client-side filter logic
    const { data } = await supabase
      .from('questions')
      .select('role')
      .eq('status', 'published')
      .not('role', 'is', null);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((q: { role: string | null }) => {
      if (q.role) counts[q.role] = (counts[q.role] || 0) + 1;
    });
    return counts;
  },
  ['role-counts'],
  { revalidate: 300, tags: ['questions'] },
);

const getPopularCompanies = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    const { data } = await supabase.rpc('get_companies_with_counts', { include_inactive: false });
    return ((data ?? []) as Array<{ company_name: string; question_count: number }>).slice(0, 6);
  },
  ['companies-popular-6'],
  { revalidate: 300, tags: ['questions'] },
);

// ── Loading skeleton ────────────────────────────────────────────────────────
// Heights are sized to match actual QuestionCard to minimise CLS on swap.

function QuestionsLoading() {
  return (
    <div className="container py-8 space-y-4">
      <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 space-y-3 min-h-[130px]">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function QuestionsPage() {
  const queryClient = new QueryClient();

  // ⚠️  Query keys MUST exactly match what QuestionsClient passes to useQuestions().
  //
  //  QuestionsClient default state (no URL params):
  //    categories=[], companies=[], difficulties=[], role=undefined,
  //    search='', sort='Hot', limit=20, offset=0
  //
  //  Previous key used `category:'All'` — wrong; client uses `categories:[]`.
  //  That mismatch caused the HydrationBoundary cache to be ignored and the
  //  client to re-fetch everything from scratch on every page load.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['questions', {
        categories: [],
        companies: [],
        difficulties: [],
        role: undefined,
        search: '',
        sort: 'Hot',
        limit: 20,
        offset: 0,
      }],
      queryFn: getDefaultQuestions,
    }),
    queryClient.prefetchQuery({
      queryKey: ['roles', 'active'],
      queryFn: getActiveRoles,
    }),
    queryClient.prefetchQuery({
      queryKey: ['roles', 'counts'],
      queryFn: getRoleCounts,
    }),
    queryClient.prefetchQuery({
      queryKey: ['companies', 'popular', 6],
      queryFn: getPopularCompanies,
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
