/**
 * Home page (Server Component)
 *
 * Rendering strategy (mirrors /questions for optimal FCP/LCP):
 *   - HeroSlideshow: SSR'd — hero h1 is in the initial HTML, paints immediately.
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
import Link from 'next/link';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BookOpen, Users, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import HeroSlideshow from '@/components/home/HeroSlideshow';
import type { HeroSlide } from '@/types';

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
      .select('id, question_text, company, category, tags, difficulty, role, status, upvotes, created_at')
      .eq('status', 'published')
      .order('upvotes', { ascending: false })
      .range(0, 19);
    return data ?? [];
  },
  ['hot-questions'],
  { revalidate: 300, tags: ['questions'] },
);

// Active hero slides for the homepage slideshow. Cached & tagged 'hero' so the
// admin can flush it via revalidateTag('hero'). Error-resilient: if the table
// doesn't exist yet (migration not applied) it returns [], so the homepage
// renders the hardcoded fallback hero instead of crashing.
//
// IMPORTANT: this uses a plain, cookieless anon client — NOT createSupabaseServerClient,
// which reads cookies(). Next 14 throws when cookies() is accessed inside
// unstable_cache, so a cookie-based client here would silently always return [].
// Active slides are public to the anon role via RLS, so no session is needed.
const getHeroSlides = unstable_cache(
  async (): Promise<HeroSlide[]> => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await supabase
        .from('hero_slides')
        .select(
          'id, title, highlight, description, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, display_order, is_active, created_at, updated_at',
        )
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) return [];
      return (data ?? []) as HeroSlide[];
    } catch {
      return [];
    }
  },
  ['hero-slides'],
  { revalidate: 300, tags: ['hero'] },
);

export default async function HomePage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['questions', { sort: 'Hot' }],
    queryFn: getHotQuestions,
  });

  const heroSlides = await getHeroSlides();

  return (
    <div>
      {/* Hero slideshow — configurable via admin panel, falls back to a
          hardcoded default slide when no active slides are configured. */}
      <HeroSlideshow slides={heroSlides} />

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
