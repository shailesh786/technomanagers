/**
 * Home page (Server Component)
 *
 * Static sections are server-rendered. FeaturedQuestionsSection is wrapped
 * in HydrationBoundary so questions are pre-populated in the TanStack Query
 * cache on the server — no loading skeleton on first paint.
 *
 * ISR: page is statically generated and rebuilt in the background every 5 min.
 * The Supabase query is additionally cached via unstable_cache so the DB is
 * not hit on every revalidation — only once per 5-minute window.
 */

import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Users, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FeaturedQuestionsSection from '@/components/home/FeaturedQuestionsSection';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ISR: rebuild page at most once every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Technomanagers — Crack Your PM Interview',
  description:
    'Practice with real product management interview questions from top tech companies. Get coached by industry experts.',
  openGraph: {
    title: 'Technomanagers — Crack Your PM Interview',
    description:
      'Practice with real PM interview questions from Google, Meta, Amazon, and more.',
    type: 'website',
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
    const supabase = await createSupabaseServerClient();
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

export default async function HomePage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['questions', { sort: 'Hot' }],
    queryFn: getHotQuestions,
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container text-center max-w-3xl mx-auto space-y-6">
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
            Crack Your Next{' '}
            <span className="text-gradient-brand">Product Management</span>{' '}
            Interview
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Practice with real interview questions from top tech companies. Get coached by industry experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/questions">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8">
                Explore Questions <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                View Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Questions — pre-populated from server via HydrationBoundary */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <FeaturedQuestionsSection />
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
          <Link href="/coaching">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
              View Coaching <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
