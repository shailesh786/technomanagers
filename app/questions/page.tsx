/**
 * Questions listing page (Server Component)
 *
 * QuestionsClient is fully server-rendered. It reads URL filters via
 * useLocationSearch() (hooks/useLocationSearch.ts) instead of next/navigation's
 * useSearchParams() — useSearchParams() on a statically generated route makes
 * Next 14 bail the ENTIRE page out to client rendering, shipping an empty
 * <main> (zero crawlable content; question detail pages were orphaned).
 * useLocationSearch() returns '' during SSG, so the default list — real cards
 * with real <a href="/questions/[id]"> links — is baked into the static HTML,
 * and the HydrationBoundary pre-populates the TanStack Query cache so
 * questions paint immediately with no loading flash.
 *
 * Hydration:
 *   - Filtered URLs (?role=…): server HTML shows the default list; the client
 *     re-renders with filters right after hydration (brief, rare, acceptable).
 *   - Radix UI useId() mismatches are suppressed automatically in Next 14.
 *   - Auth state: server renders unauthenticated state; client hydrates with
 *     the real session — a standard pattern (brief cosmetic diff only).
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
import QuestionsClient from '@/components/questions/QuestionsClient';
import { QUESTION_LIST_SELECT, flattenCommentCount } from '@/lib/question-list-select';
import { FACET_SELECT, type FacetRow } from '@/hooks/useQuestionFacets';

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

// QuestionsClient is server-rendered: it reads query params via
// useLocationSearch() (NOT useSearchParams(), which would force this whole
// statically-generated page into an empty client-rendered shell with zero
// crawlable content). During SSG the hook returns '' → the default question
// list renders into the static HTML from the hydrated query cache below —
// real cards, real <a href="/questions/[id]"> links for Googlebot.

export const metadata: Metadata = {
  // No "| Technomanagers" suffix — the root layout's title.template appends it.
  title: 'PM Interview Questions',
  description:
    'Browse and practice real product management interview questions from Google, Meta, Amazon, Microsoft, and more top tech companies.',
  alternates: { canonical: '/questions' },
  openGraph: {
    title: 'PM Interview Questions',
    description:
      'Practice with real PM interview questions from top tech companies.',
    type: 'website',
    url: '/questions',
  },
};

// ── Cached data fetchers ────────────────────────────────────────────────────
// All fetch public data (no user-specific rows), so caching is safe.

const getDefaultQuestions = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('questions')
      .select(QUESTION_LIST_SELECT)
      .eq('status', 'published')
      // count only non-deleted comments — must match useQuestions()/useCommentCount()
      .is('question_comments.deleted_at', null)
      // Sort chain must stay byte-identical to useQuestions()'s Newest branch.
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, 19);
    // Throw so a transient DB error is NOT cached as an empty list for the
    // revalidate window (the throw-on-error contract from PR #41).
    if (error) throw error;
    return flattenCommentCount(data ?? []);
  },
  ['questions-default-newest'],
  { revalidate: 60, tags: ['questions'] },
);

const getActiveRoles = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  ['roles-active'],
  { revalidate: 300, tags: ['roles'] },
);

const getRoleCounts = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    // Use `role` column (not `tags`) to match the client-side filter logic
    const { data, error } = await supabase
      .from('questions')
      .select('role')
      .eq('status', 'published')
      .not('role', 'is', null);
    if (error) throw error;
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
    const { data, error } = await supabase.rpc('get_companies_with_counts', { include_inactive: false });
    if (error) throw error;
    return ((data ?? []) as Array<{ company_name: string; question_count: number }>).slice(0, 6);
  },
  ['companies-popular-6'],
  { revalidate: 300, tags: ['questions'] },
);

// Facet rows for the filter dropdown counts. Without this prefetch the client
// downloaded the whole published corpus on every /questions visit.
const getQuestionFacets = unstable_cache(
  async () => {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('questions')
      .select(FACET_SELECT)
      .eq('status', 'published');
    if (error) throw error;
    return (data ?? []) as FacetRow[];
  },
  ['question-facets'],
  { revalidate: 60, tags: ['questions'] },
);

// ── Page ────────────────────────────────────────────────────────────────────

export default async function QuestionsPage() {
  const queryClient = new QueryClient();

  // ⚠️  Query keys MUST exactly match what QuestionsClient passes to useQuestions().
  //
  //  QuestionsClient default state (no URL params):
  //    categories=[], companies=[], difficulties=[], role=undefined,
  //    search='', sort='Newest', limit=20, offset=0
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
        sort: 'Newest',
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
    queryClient.prefetchQuery({
      queryKey: ['question-facets'],
      queryFn: getQuestionFacets,
    }),
  ]);

  // HydrationBoundary hydrates the query cache during render — server-side
  // too — so QuestionsClient's useQuestions() finds the data synchronously
  // and the full default list (with crawlable links) renders into the
  // static HTML.
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QuestionsClient />
    </HydrationBoundary>
  );
}
