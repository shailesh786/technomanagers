/**
 * Home page (Server Component)
 *
 * Rendering strategy (mirrors /questions for optimal FCP/LCP):
 *   - HeroPriorityBoard: SSR'd — hero heading is in the initial HTML, paints immediately.
 *   - FeaturedQuestionsSection: ssr:false — code-split into a separate JS chunk
 *     so it does NOT block the hero from painting. The questions data is still
 *     server-prefetched into TanStack Query's HydrationBoundary cache, so the
 *     section loads instantly from cache once the chunk arrives (no extra round
 *     trip to Supabase).
 *
 * Why ssr:false for FeaturedQuestionsSection:
 *   Without it, every hook imported by FeaturedQuestionsSection (useQuestions,
 *   useSavedQuestions, useToggleLike, QuestionCard, …) lands in the critical
 *   bundle. That 200 kB blocks the hero h1 from painting and bloats FCP/LCP.
 *   The same pattern applied to /questions lifted it from RES 83 → RES 100.
 *
 * ISR: page is statically generated and rebuilt in the background every 5 min.
 * The Supabase query is additionally cached via unstable_cache so the DB is
 * not hit on every revalidation — only once per 5-minute window.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { QUESTION_LIST_SELECT, flattenCommentCount } from '@/lib/question-list-select';
import Link from 'next/link';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BookOpen, Users, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import HeroPriorityBoard from '@/components/home/HeroPriorityBoard';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { selectVisibleHeroItems } from '@/lib/hero';
import type { HeroItem } from '@/types';

// ── Server-rendered + code-split FeaturedQuestionsSection ───────────────────
// dynamic() keeps the component's JS in a separate chunk (doesn't bloat the
// critical bundle), while ssr:true (the default) server-renders its HTML so
// question card links (<a href="/questions/[id]">) are crawlable by Googlebot.
// Previously ssr:false meant the static HTML contained ZERO links to question
// detail pages, orphaning them for search. The section hydrates from the
// dehydrated query cache below — no extra fetch, no skeleton on first paint.
// The `loading` fallback only shows during client-side navigations.
const FeaturedQuestionsSection = dynamic(
  () => import('@/components/home/FeaturedQuestionsSection'),
  { loading: () => <FeaturedQuestionsLoading /> },
);

function FeaturedQuestionsLoading() {
  return (
    <section className="container py-16 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* pill row */}
      <div className="flex flex-wrap gap-2">
        {[80, 160, 170, 195, 170].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>
      {/* question cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3 min-h-[120px]">
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
    </section>
  );
}

// ISR: rebuild page at most once every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Technomanagers — Crack Your PM Interview',
  description:
    'Practice with real product management interview questions from top tech companies. Get coached by industry experts.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Technomanagers — Crack Your PM Interview',
    description:
      'Practice with real PM interview questions from Google, Meta, Amazon, and more.',
    type: 'website',
    url: '/',
  },
};

const steps = [
  { num: '1', icon: BookOpen,    title: 'Browse Questions',  desc: 'Explore real interview questions from top tech companies.' },
  { num: '2', icon: CheckCircle, title: 'Practice & Prepare', desc: 'Study sample answers and save your favorites for later.' },
  { num: '3', icon: Star,        title: 'Ace Your Interview', desc: 'Walk in confident and land your dream PM role.' },
];

// Cache the DB query independently so a revalidation spike doesn't hammer Supabase.
// Tagged 'questions' so admin publish actions can call revalidateTag('questions')
// to flush this immediately without waiting for the 5-minute window.
const getHotQuestions = unstable_cache(
  async () => {
    // Cookieless anon client — NOT createSupabaseServerClient(), which reads
    // cookies(). Next 14 throws when cookies() is accessed inside
    // unstable_cache(), which silently emptied this prefetch and forced the
    // featured-questions list to refetch client-side. Published questions are
    // public to the anon role via RLS, so no session cookie is needed.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from('questions')
      .select(QUESTION_LIST_SELECT)
      .eq('status', 'published')
      // count only non-deleted comments — must match useQuestions()/useCommentCount()
      .is('question_comments.deleted_at', null)
      // Sort chain must stay byte-identical to useQuestions()'s Hot branch.
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, 19);
    return flattenCommentCount(data ?? []);
  },
  ['hot-questions'],
  { revalidate: 300, tags: ['questions'] },
);

// Slotted, visible hero items for the Hero Priority Board. Cached & tagged
// 'hero' so admin edits can flush it via revalidateTag('hero'). Error-resilient:
// if the table doesn't exist yet (migration not applied) it returns [], and the
// homepage simply renders no hero section (the board has no fallback state).
//
// IMPORTANT: cookieless public client — NOT createSupabaseServerClient, which
// reads cookies(). Next 14 throws when cookies() is accessed inside
// unstable_cache, so a cookie-based client here would silently always return [].
// Visible slotted items are public to the anon role via RLS.
//
// Schedule windows (show_from/hide_after) are re-evaluated on each ISR rebuild,
// so a window boundary takes effect within the 5-minute revalidate cadence.
const getHeroItems = unstable_cache(
  async (): Promise<HeroItem[]> => {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from('hero_items')
        .select(
          'id, priority, visible, kind, title, subtitle, meta, cta_label, cta_href, tag_label, tag_color, image_url, icon, surface, show_from, hide_after, created_at, updated_at',
        )
        .eq('visible', true)
        .not('priority', 'is', null)
        .order('priority', { ascending: true });
      if (error) return [];
      return (data ?? []) as HeroItem[];
    } catch {
      return [];
    }
  },
  ['hero-items'],
  { revalidate: 300, tags: ['hero'] },
);

export default async function HomePage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['questions', { sort: 'Hot' }],
    queryFn: getHotQuestions,
  });

  // Schedule-window filter runs at render time (per ISR rebuild), in addition
  // to the visible/slotted filters already applied in the cached query.
  const heroItems = selectVisibleHeroItems(await getHeroItems());

  return (
    <div>
      {/* Keyword page heading for search & screen readers. Lives here (not in
          the board) so the page always has exactly one h1 — even when zero
          hero items are visible and the board renders nothing. The board's
          visible "Start here." heading is an h2, per the design spec. */}
      <h1 className="sr-only">Crack Your Next Product Management Interview</h1>

      {/* Hero Priority Board — three admin-configured cards, static on
          desktop, manual one-up slideshow on mobile. Renders nothing when
          no items are visible. */}
      <HeroPriorityBoard items={heroItems} />

      {/* Featured Questions — pre-populated from server via HydrationBoundary.
           HydrationBoundary must wrap Suspense (not be inside it) so the
           dehydrated cache state ships in the HTML before the component mounts. */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<FeaturedQuestionsLoading />}>
          <FeaturedQuestionsSection />
        </Suspense>
      </HydrationBoundary>

      {/* How It Works */}
      <section className="container py-16 space-y-8">
        <h2 className="font-heading font-bold text-2xl text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="text-center space-y-4 p-6 rounded-xl bg-muted/50">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-brand">
                <step.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-bold text-lg">{step.num}. {step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coaching CTA */}
      <section className="bg-gradient-brand py-16">
        <div className="container text-center space-y-6 max-w-2xl mx-auto">
          <Users className="h-10 w-10 text-primary-foreground mx-auto" />
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-primary-foreground">
            Get Personalized Coaching from PM Experts
          </h2>
          <p className="text-primary-foreground/80">
            1:1 mock interviews, resume reviews, and mentorship sessions.
          </p>
          <Link href="/coaching" className="inline-block pt-1">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
              View Coaching <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
